import type { NextApiRequest, NextApiResponse } from 'next'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

// Função para lidar com problemas EPERM no Windows
async function handleWindowsEPERM(logs: string[]): Promise<void> {
  try {
    const prismaDir = path.join(process.cwd(), 'src', 'generated', 'prisma')
    
    // Verificar se o diretório existe
    try {
      await fs.access(prismaDir)
      logs.push(`🔍 Verificando diretório Prisma: ${prismaDir}`)
      
      // Tentar remover arquivos temporários do query engine
      const files = await fs.readdir(prismaDir)
      for (const file of files) {
        if (file.includes('query_engine-windows.dll.node.tmp')) {
          try {
            await fs.unlink(path.join(prismaDir, file))
            logs.push(`🧹 Removido arquivo temporário: ${file}`)
          } catch (error) {
            logs.push(`⚠️ Não foi possível remover: ${file}`)
          }
        }
      }
      
      // Verificar se o arquivo principal está em uso
      const mainEngine = path.join(prismaDir, 'query_engine-windows.dll.node')
      try {
        await fs.access(mainEngine)
        logs.push(`🔍 Query engine encontrado: ${mainEngine}`)
      } catch (error) {
        logs.push(`📝 Query engine será criado: ${mainEngine}`)
      }
      
    } catch (error) {
      logs.push(`📁 Diretório Prisma será criado: ${prismaDir}`)
    }
    
    // Aguardar um pouco para Windows liberar recursos
    await new Promise(resolve => setTimeout(resolve, 1000))
    logs.push(`⏳ Aguardado 1s para liberação de recursos`)
    
  } catch (error) {
    logs.push(`⚠️ Erro durante limpeza Windows: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

// Função para executar geração no Windows com retries
async function executeWindowsGenerate(
  command: string, 
  projectDir: string, 
  dbUrl: string, 
  logs: string[]
): Promise<{ stdout: string; stderr: string }> {
  const maxRetries = 3
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logs.push(`🔄 Tentativa ${attempt}/${maxRetries} de geração`)
      
      // Aguardar antes de cada tentativa (exceto a primeira)
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
        logs.push(`⏳ Aguardado ${2 * attempt}s antes da tentativa`)
      }
      
      const result = await execAsync(command, {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          DIRECT_URL: process.env.DIRECT_URL,
          // Força o Prisma a usar um diretório temporário diferente
          TMPDIR: path.join(process.cwd(), 'temp'),
          TMP: path.join(process.cwd(), 'temp'),
          TEMP: path.join(process.cwd(), 'temp')
        },
        cwd: projectDir,
        timeout: 90000 // 90 segundos timeout
      })
      
      logs.push(`✅ Geração bem-sucedida na tentativa ${attempt}`)
      return result
      
    } catch (error) {
      lastError = error as Error
      logs.push(`❌ Tentativa ${attempt} falhou: ${lastError.message}`)
      
      if (lastError.message.includes('EPERM') && attempt < maxRetries) {
        logs.push(`🔄 Erro EPERM detectado, tentando novamente...`)
        
        // Tentar limpar arquivos temporários antes da próxima tentativa
        try {
          await handleWindowsEPERM(logs)
        } catch (cleanupError) {
          logs.push(`⚠️ Erro durante limpeza: ${cleanupError}`)
        }
      }
    }
  }
  
  throw lastError || new Error('Falha após todas as tentativas')
}

type GenerateRequest = {
  sessionId: string
  schema?: string
}

type GenerateResponse = {
  success: boolean
  logs: string[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      logs: [],
      error: 'Method not allowed' 
    })
  }

  console.log('🔍 [Generate API] Request body:', req.body)
  const { sessionId, schema }: GenerateRequest = req.body || {}
  const logs: string[] = []

  if (!sessionId) {
    console.log('❌ [Generate API] SessionId ausente')
    return res.status(400).json({
      success: false,
      logs: ['❌ SessionId é obrigatório'],
      error: 'sessionId é obrigatório'
    })
  }

  console.log(`🚀 [Generate API] Iniciando geração REAL para sessão: ${sessionId}`)
  
  try {
    logs.push(`🚀 Iniciando geração do Prisma Client para sessão: ${sessionId}`)
    
    // Verificar se é Windows e tratar o problema EPERM
    const isWindows = os.platform() === 'win32'
    if (isWindows) {
      logs.push(`🪟 Detectado Windows - aplicando correções para EPERM`)
      await handleWindowsEPERM(logs)
    }
    
    // Para geração, vamos usar o diretório do projeto em vez de temporário
    // pois precisamos do @prisma/client instalado
    const projectDir = process.cwd()
    logs.push(`📁 Usando diretório do projeto: ${projectDir}`)

    // Usar schema fornecido ou schema padrão do projeto
    let schemaContent = schema
    if (!schemaContent) {
      const defaultSchemaPath = path.join(projectDir, 'prisma', 'schema.prisma')
      try {
        schemaContent = await fs.readFile(defaultSchemaPath, 'utf-8')
        logs.push(`📄 Schema padrão carregado do projeto`)
      } catch (error) {
        throw new Error('Schema não fornecido e schema padrão não encontrado')
      }
    }

    // Criar schema temporário no projeto
    const tempSchemaPath = path.join(projectDir, 'prisma', `schema-${sessionId}.prisma`)
    
    // Configurar schema para usar Supabase com schema específico
    let modifiedSchema = schemaContent
    if (!schemaContent.includes('directUrl')) {
      modifiedSchema = schemaContent.replace(
        'url      = env("DATABASE_URL")',
        `url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")`
      )
    }
    
    await fs.writeFile(tempSchemaPath, modifiedSchema, 'utf-8')
    logs.push(`📝 Schema temporário salvo: schema-${sessionId}.prisma`)

    // Construir URL do banco com schema específico
    const baseUrl = process.env.DATABASE_URL
    if (!baseUrl) {
      throw new Error('DATABASE_URL não configurada')
    }

    const dbUrl = `${baseUrl}&options=-c search_path=${sessionId},public`
    logs.push(`🔗 URL configurada para schema: ${sessionId}`)

    // Executar geração real do Prisma Client com tratamento especial para Windows
    let generateCommand = `npx prisma generate --schema="${tempSchemaPath}"`
    
    logs.push(`⚡ Executando: ${generateCommand}`)

    let result
    if (isWindows) {
      // No Windows, usar spawn para melhor controle de processo
      result = await executeWindowsGenerate(generateCommand, projectDir, dbUrl, logs)
    } else {
      // Em outros sistemas, usar execAsync normal
      result = await execAsync(generateCommand, {
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          DIRECT_URL: process.env.DIRECT_URL
        },
        cwd: projectDir,
        timeout: 60000 // 60 segundos timeout
      })
    }

    // Processar saída
    const { stdout, stderr } = result
    if (stdout) {
      stdout.split('\n').forEach((line: string) => {
        if (line.trim()) {
          logs.push(`📤 ${line.trim()}`)
        }
      })
    }

    if (stderr) {
      stderr.split('\n').forEach((line: string) => {
        if (line.trim() && !line.includes('warn')) {
          logs.push(`⚠️  ${line.trim()}`)
        }
      })
    }

    logs.push(`✅ Cliente Prisma gerado com sucesso!`)
    logs.push(`🎯 Tipos TypeScript disponíveis para sessão: ${sessionId}`)

    // Limpar schema temporário
    try {
      await fs.unlink(tempSchemaPath)
      logs.push(`🧹 Schema temporário limpo`)
    } catch (cleanupError) {
      logs.push(`⚠️  Aviso: Não foi possível limpar schema temporário`)
    }

    console.log(`✅ [Generate API] Cliente gerado com sucesso para: ${sessionId}`)
    
    return res.status(200).json({
      success: true,
      logs
    })

  } catch (error) {
    console.error('❌ [Generate API] Erro na geração:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    logs.push(`❌ Erro na geração: ${errorMessage}`)
    
    return res.status(500).json({
      success: false,
      logs,
      error: errorMessage
    })
  }
}
