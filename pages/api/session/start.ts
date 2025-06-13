import type { NextApiRequest, NextApiResponse } from 'next'

// Função para gerar ID único sem uuid
const generateSessionId = () => {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `playground_${timestamp}_${randomPart}`
}

type SessionResponse = {
  success: boolean
  sessionId?: string
  error?: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SessionResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    console.log('🚀 [API] Iniciando criação de sessão...')
    
    // Verificar variáveis de ambiente
    console.log('🔍 [API] DATABASE_URL:', process.env.DATABASE_URL ? 'configurada' : 'não encontrada')
    console.log('🔍 [API] DIRECT_URL:', process.env.DIRECT_URL ? 'configurada' : 'não encontrada')
    
    // Gerar ID único para a sessão
    const sessionId = generateSessionId()
    console.log('📝 [API] SessionId gerado:', sessionId)
    
    // Para o client virtual, não precisamos criar schemas
    // O schema será usado automaticamente pelo virtual client
    console.log(`✅ [API] Sessão virtual criada: ${sessionId}`)
    
    res.status(200).json({
      success: true,
      sessionId
    })
    
  } catch (error) {
    console.error('❌ [API] Erro ao criar sessão:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    })
  }
}
