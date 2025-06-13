/**
 * 🚀 Cliente Playground Simplificado - Usando apenas Cliente Virtual
 * 
 * Este arquivo fornece um cliente simplificado que usa apenas o virtual client,
 * evitando problemas com o Prisma Client gerado.
 */

import { createVirtualPrismaClient } from './virtual-prisma-client'
import { getSessionDatabaseUrl, validateSupabaseConfig } from '../config/supabase-config'

// Cache de clientes por sessão
const clientCache = new Map<string, any>()

// Configuração de limpeza automática de cache
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000 // 30 minutos
const CACHE_MAX_AGE = 30 * 60 * 1000 // 30 minutos

// Limpeza automática do cache
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(clientCache.entries())
  for (const [sessionId, clientData] of entries) {
    if (now - clientData.createdAt > CACHE_MAX_AGE) {
      console.log(`🧹 [Playground Client] Removendo cliente expirado: ${sessionId}`)
      clientCache.delete(sessionId)
    }
  }
}, CACHE_CLEANUP_INTERVAL)

export async function createPlaygroundClient(sessionId: string) {
  // Verificar configuração do Supabase
  const configValidation = validateSupabaseConfig()
  if (!configValidation.valid) {
    throw new Error(`Configuração Supabase inválida: ${configValidation.errors.join(', ')}`)
  }

  // Verificar cache primeiro
  if (clientCache.has(sessionId)) {
    console.log(`♻️ [Playground Client] Reutilizando cliente em cache: ${sessionId}`)
    return clientCache.get(sessionId).client
  }

  console.log(`🔄 [Playground Client] Criando novo cliente virtual para sessão: ${sessionId}`)

  // Configurar URL do banco com schema específico
  const dbUrl = getSessionDatabaseUrl(sessionId)
  console.log(`🔗 [Playground Client] URL configurada para sessão: ${sessionId}`)
  // Criar cliente virtual (não depende do Prisma Client gerado)
  const client = await createVirtualPrismaClient(sessionId)
  
  // Armazenar no cache
  clientCache.set(sessionId, {
    client,
    createdAt: Date.now()
  })

  console.log(`✅ [Playground Client] Cliente virtual criado e cacheado: ${sessionId}`)
  return client
}

export async function disconnectPlaygroundClient(sessionId: string): Promise<void> {
  if (clientCache.has(sessionId)) {
    console.log(`🔌 [Playground Client] Removendo cliente do cache: ${sessionId}`)
    clientCache.delete(sessionId)
  }
}

export async function disconnectAllPlaygroundClients(): Promise<void> {
  console.log(`🧹 [Playground Client] Limpando todos os clientes (${clientCache.size} clientes)`)
  clientCache.clear()
}

export async function checkSessionConnection(sessionId: string): Promise<boolean> {
  try {
    const client = await createPlaygroundClient(sessionId)
    // Usar o cliente virtual para verificar conexão
    await client.user.findMany({ take: 1 })
    return true
  } catch (error) {
    console.error(`❌ [Playground Client] Sessão ${sessionId} não está conectada:`, error)
    return false
  }
}

export function getClientCacheStats() {
  return {
    totalClients: clientCache.size,
    sessions: Array.from(clientCache.keys())
  }
}
