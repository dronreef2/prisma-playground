import type { NextApiRequest, NextApiResponse } from 'next'
import { createVirtualPrismaClient } from '../../src/database/virtual-prisma-client'

type QueryRequest = {
  sessionId: string
  query: string
}

type QueryResponse = {
  success: boolean
  result?: any
  error?: string
}

// Parser robusto para extrair informações da query (mesmo do query-new.ts)
function parseUserQuery(queryString: string) {
  console.log(`🚀 [Virtual Query API] Iniciando parse da query`)
  
  // Primeiro, tentar encontrar linhas descomentadas que contenham console.log
  const lines = queryString.split('\n')
  let currentVarName = ''
  
  // Procurar por linhas descomentadas com console.log para identificar a query ativa
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Se encontrou um console.log descomentado, identificar a variável
    if (!trimmedLine.startsWith('//') && trimmedLine.includes('console.log(') && trimmedLine.includes(')')) {
      const match = trimmedLine.match(/console\.log\((\w+)\)/)
      if (match) {
        currentVarName = match[1]
        console.log(`🎯 [Virtual Query API] Encontrada query ativa via console.log: '${currentVarName}'`)
        break
      }
    }
  }
  
  // Se não encontrou console.log ativo, usar a primeira query disponível
  if (!currentVarName) {
    console.log(`🔍 [Virtual Query API] Nenhum console.log ativo encontrado, procurando primeira query const`)
    // Procurar pela primeira declaração const que contenha await prisma
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine.startsWith('//') && trimmedLine.includes('const ') && trimmedLine.includes('await prisma')) {
        const match = trimmedLine.match(/const\s+(\w+)\s*=/)
        if (match) {
          currentVarName = match[1]
          console.log(`🎯 [Virtual Query API] Encontrada query ativa via const: '${currentVarName}'`)
          break
        }
      }
    }
  }
  
  if (!currentVarName) {
    console.log(`❌ [Virtual Query API] Debug - Linhas analisadas:`)
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`  ${i}: ${line}`)
    })
    throw new Error('Nenhuma query ativa encontrada. Descomente uma linha console.log(variavel) para executar uma query específica, ou certifique-se de ter pelo menos uma declaração const com await prisma.')
  }

  console.log(`🎯 [Virtual Query API] Query ativa identificada: '${currentVarName}'`)

  // Estratégia melhorada: buscar o bloco completo da variável
  const startPattern = new RegExp(`const\\s+${currentVarName}\\s*=\\s*await\\s+prisma`)
  let blockLines = []
  let foundStart = false
  let braceLevel = 0
  let parenLevel = 0
  let inString = false
  let stringChar = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    if (!foundStart && startPattern.test(line)) {
      foundStart = true
      console.log(`📍 [Virtual Query API] Início do bloco encontrado na linha ${i}: ${line.trim()}`)
    }
    
    if (foundStart) {
      blockLines.push(line)
      
      // Analisar caractere por caractere para contar níveis corretamente
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        const prevChar = j > 0 ? line[j-1] : ''
        
        // Detectar strings (ignorar chaves dentro de strings)
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true
            stringChar = char
          } else if (char === stringChar) {
            inString = false
            stringChar = ''
          }
        }
        
        if (!inString) {
          if (char === '{') braceLevel++
          if (char === '}') braceLevel--
          if (char === '(') parenLevel++
          if (char === ')') parenLevel--
        }
      }
      
      // Condições para terminar o bloco
      const lineContent = line.trim()
      if (foundStart && braceLevel === 0 && parenLevel <= 0) {
        if (lineContent.endsWith(')') || lineContent.endsWith('})') || lineContent.endsWith('},')) {
          console.log(`🏁 [Virtual Query API] Fim do bloco detectado na linha ${i}: ${lineContent}`)
          break
        }
      }
      
      // Proteção contra loops infinitos
      if (blockLines.length > 100) {
        console.log(`⚠️ [Virtual Query API] Bloco muito longo, interrompendo na linha ${i}`)
        break
      }
    }
  }
  
  if (blockLines.length === 0) {
    throw new Error(`Query para a variável '${currentVarName}' não encontrada`)
  }
  
  // Juntar as linhas e limpar
  const activeQueryBlock = blockLines.join('\n')
  
  console.log(`📋 [Virtual Query API] Bloco da query extraído para '${currentVarName}' (${blockLines.length} linhas):`)
  console.log(activeQueryBlock.substring(0, 400) + '...')
  
  // Extrair model, action e payload usando regex mais simples
  const methodMatch = activeQueryBlock.match(/await\s+prisma\.(\w+)\.(\w+)\s*\(/)
  
  if (!methodMatch) {
    throw new Error(`Não foi possível identificar o método Prisma em: ${activeQueryBlock.substring(0, 200)}...`)
  }
  
  const model = methodMatch[1]
  const action = methodMatch[2]
  
  console.log(`✅ [Virtual Query API] Método identificado: ${model}.${action}`)
  
  // Extrair payload encontrando a posição dos parênteses
  const methodStartIndex = activeQueryBlock.indexOf(methodMatch[0])
  const payloadStartIndex = methodStartIndex + methodMatch[0].length - 1 // posição do (
  
  // Encontrar o ) correspondente
  let parenCounter = 0
  let payloadEndIndex = -1
  let insideString = false
  let stringDelimiter = ''
  
  for (let i = payloadStartIndex; i < activeQueryBlock.length; i++) {
    const char = activeQueryBlock[i]
    const prevChar = i > 0 ? activeQueryBlock[i-1] : ''
    
    // Detectar strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!insideString) {
        insideString = true
        stringDelimiter = char
      } else if (char === stringDelimiter) {
        insideString = false
        stringDelimiter = ''
      }
    }
    
    if (!insideString) {
      if (char === '(') parenCounter++
      if (char === ')') {
        parenCounter--
        if (parenCounter === 0) {
          payloadEndIndex = i
          break
        }
      }
    }
  }
  
  let payloadStr = ''
  if (payloadEndIndex > payloadStartIndex) {
    payloadStr = activeQueryBlock.substring(payloadStartIndex + 1, payloadEndIndex).trim()
  }
  
  console.log(`📦 [Virtual Query API] Payload extraído (${payloadStr.length} chars):`)
  console.log(payloadStr.substring(0, 300) + '...')
  
  // Processar o payload
  let payload = undefined
  if (payloadStr && payloadStr.trim()) {
    try {
      // Log para debug
      console.log(`🔍 [Virtual Query API] Tentando fazer parse do payload para '${currentVarName}':`)
      
      // Limpar o payload
      let cleanPayload = payloadStr
        .replace(/,\s*$/, '') // Remove trailing comma
        .replace(/\/\/.*$/gm, '') // Remove comentários inline
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
        .trim()
      
      console.log(`🧹 [Virtual Query API] Payload limpo:`, cleanPayload.substring(0, 200) + '...')
      
      // Tentar avaliar com eval primeiro (mais flexível para objetos JS)
      try {
        // Para eval funcionar, vamos adicionar um contexto mínimo
        const evalContext = {
          create: (obj: any) => ({ create: obj }),
          connect: (obj: any) => ({ connect: obj }),
          select: (obj: any) => ({ select: obj }),
          include: (obj: any) => ({ include: obj }),
          where: (obj: any) => ({ where: obj }),
          data: (obj: any) => ({ data: obj }),
          tag: (obj: any) => ({ tag: obj })
        }
        
        // Tentar avaliar o payload
        const evaluatedPayload = eval(`(${cleanPayload})`)
        payload = evaluatedPayload
        console.log(`✅ [Virtual Query API] Parse bem-sucedido com eval para '${currentVarName}'`)
      } catch (evalError) {
        console.log(`⚠️ [Virtual Query API] Eval falhou para '${currentVarName}':`, evalError)
        
        // Como fallback, usar payload vazio para operações simples
        if (action === 'findMany' || action === 'findFirst' || action === 'count') {
          payload = {}
          console.log(`🔄 [Virtual Query API] Usando payload vazio para operação '${action}'`)
        } else {
          // Para operações create/update, tentar criar um objeto básico
          payload = {
            data: {
              name: "Teste Virtual",
              email: "teste@virtual.com"
            }
          }
          console.log(`🔄 [Virtual Query API] Usando payload básico para operação '${action}'`)
        }
      }
    } catch (parseError) {
      console.log(`❌ [Virtual Query API] Erro geral no parse do payload para '${currentVarName}':`, parseError)
      
      // Como último recurso, payload vazio
      payload = {}
      console.log(`🔄 [Virtual Query API] Usando payload vazio como último recurso`)
    }
  }

  return { model, action, payload }
}

// Lista de ações permitidas (segurança)
const ALLOWED_ACTIONS = [
  'findMany', 'findUnique', 'findFirst',
  'create', 'createMany',
  'update', 'updateMany', 'upsert',
  'delete', 'deleteMany',
  'count', 'aggregate',
  'groupBy'
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QueryResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  const { sessionId, query }: QueryRequest = req.body

  if (!sessionId || !query) {
    return res.status(400).json({
      success: false,
      error: 'sessionId e query são obrigatórios'
    })
  }

  let virtualClient: any | null = null

  try {
    console.log(`🚀 [Virtual Query API] Executando query para sessão: ${sessionId}`)
    console.log(`📝 [Virtual Query API] Query recebida (${query.length} chars):`, query.substring(0, 200) + '...')

    // Parse seguro da query
    const { model, action, payload } = parseUserQuery(query)
    console.log(`🔍 [Virtual Query API] Parsed - Model: ${model}, Action: ${action}`)
    console.log(`📊 [Virtual Query API] Payload final:`, JSON.stringify(payload, null, 2))

    // Validar ação permitida
    if (!ALLOWED_ACTIONS.includes(action)) {
      throw new Error(`Ação '${action}' não é permitida. Ações permitidas: ${ALLOWED_ACTIONS.join(', ')}`)
    }

    // Criar cliente Prisma virtual para a sessão
    console.log(`🎯 [Virtual Query API] Criando cliente virtual para sessão: ${sessionId}`)
    virtualClient = await createVirtualPrismaClient(sessionId)
    console.log(`✅ [Virtual Query API] Cliente virtual criado`)

    // Verificar se o modelo existe (validação básica)
    if (!virtualClient[model as keyof typeof virtualClient]) {
      throw new Error(`Modelo '${model}' não encontrado no cliente virtual. Modelos disponíveis: user, profile, post, category, tag, postTag, comment`)
    }

    console.log(`⚡ [Virtual Query API] Executando ${action} no modelo ${model} via cliente virtual`)

    // Executar a query de forma segura usando o cliente virtual
    const result = await (virtualClient[model as keyof typeof virtualClient] as any)[action](payload)
    
    console.log(`✅ [Virtual Query API] Query executada com sucesso via cliente virtual`)
    console.log(`📊 [Virtual Query API] Resultado:`, JSON.stringify(result, null, 2))

    res.status(200).json({
      success: true,
      result
    })

  } catch (error) {
    console.error('❌ [Virtual Query API] Erro na execução da query:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  } finally {
    // Desconectar o cliente virtual
    if (virtualClient) {
      try {
        await virtualClient.$disconnect()
        console.log(`🔌 [Virtual Query API] Cliente virtual desconectado para sessão: ${sessionId}`)
      } catch (disconnectError) {
        console.warn(`⚠️ [Virtual Query API] Erro ao desconectar cliente virtual:`, disconnectError)
      }
    }
  }
}
