/**
 * 🔧 Configurações Supabase para Prisma Playground
 * 
 * Este arquivo centraliza todas as configurações específicas do Supabase
 * para garantir compatibilidade e performance otimizada.
 */

export interface SupabaseConfig {
  databaseUrl: string
  directUrl: string
  pooling: boolean
  ssl: boolean
  schema: string
  maxConnections: number
  connectionTimeout: number
}

export interface SessionConfig {
  sessionPrefix: string
  sessionTimeout: number
  maxSessions: number
  cleanupInterval: number
}

/**
 * Configuração padrão do Supabase
 */
export const SUPABASE_CONFIG: SupabaseConfig = {
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  pooling: true,
  ssl: true,
  schema: 'public',
  maxConnections: 20,
  connectionTimeout: 30000 // 30 segundos
}

/**
 * Configuração de sessões
 */
export const SESSION_CONFIG: SessionConfig = {
  sessionPrefix: 'playground_',
  sessionTimeout: 30 * 60 * 1000, // 30 minutos
  maxSessions: 100,
  cleanupInterval: 5 * 60 * 1000 // 5 minutos
}

/**
 * Validar configurações do Supabase
 */
export function validateSupabaseConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!SUPABASE_CONFIG.databaseUrl) {
    errors.push('DATABASE_URL não configurada')
  }

  if (!SUPABASE_CONFIG.directUrl) {
    errors.push('DIRECT_URL não configurada')
  }

  // Verificar formato da URL
  if (SUPABASE_CONFIG.databaseUrl && !SUPABASE_CONFIG.databaseUrl.includes('supabase.com')) {
    errors.push('DATABASE_URL não parece ser uma URL do Supabase')
  }

  // Verificar se tem pooling habilitado
  if (SUPABASE_CONFIG.databaseUrl && !SUPABASE_CONFIG.databaseUrl.includes('pooler.supabase.com')) {
    console.warn('⚠️ [Supabase] URL não parece usar connection pooling')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Gerar URL de conexão para uma sessão específica
 */
export function getSessionDatabaseUrl(sessionId: string): string {
  const baseUrl = SUPABASE_CONFIG.databaseUrl
  
  // Para Supabase, usar search_path para direcionar ao schema específico
  if (baseUrl.includes('?')) {
    return `${baseUrl}&options=-c search_path=${sessionId},public`
  } else {
    return `${baseUrl}?options=-c search_path=${sessionId},public`
  }
}

/**
 * Gerar URL direta para migrações
 */
export function getSessionDirectUrl(sessionId: string): string {
  const baseUrl = SUPABASE_CONFIG.directUrl
  
  // Para migrações, usar a URL direta com search_path
  if (baseUrl.includes('?')) {
    return `${baseUrl}&options=-c search_path=${sessionId},public`
  } else {
    return `${baseUrl}?options=-c search_path=${sessionId},public`
  }
}

/**
 * Configurações de logging para desenvolvimento
 */
export const LOG_CONFIG = {
  enableQueryLogging: process.env.NODE_ENV === 'development',
  enableConnectionLogging: true,
  enableErrorLogging: true,
  logLevel: process.env.LOG_LEVEL || 'info'
}

/**
 * Configurações de segurança
 */
export const SECURITY_CONFIG = {
  maxQueryLength: 10000, // 10KB
  maxPayloadSize: 50000, // 50KB
  allowedActions: [
    'findMany', 'findUnique', 'findFirst',
    'create', 'createMany',
    'update', 'updateMany', 'upsert',
    'delete', 'deleteMany',
    'count', 'aggregate',
    'groupBy'
  ],
  forbiddenKeywords: [
    'DROP', 'TRUNCATE', 'ALTER', 'CREATE INDEX',
    'DROP INDEX', 'GRANT', 'REVOKE', '$executeRaw',
    '$queryRaw', 'eval', 'Function', 'setTimeout'
  ]
}

/**
 * Configurações de performance
 */
export const PERFORMANCE_CONFIG = {
  enableQueryCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
  enableConnectionPooling: true,
  poolSize: 10,
  idleTimeout: 10000, // 10 segundos
  acquireTimeout: 30000 // 30 segundos
}

/**
 * Status de saúde da configuração
 */
export function getConfigHealth() {
  const validation = validateSupabaseConfig()
  
  return {
    timestamp: new Date().toISOString(),
    supabase: {
      configured: validation.valid,
      errors: validation.errors,
      pooling: SUPABASE_CONFIG.databaseUrl.includes('pooler'),
      ssl: SUPABASE_CONFIG.databaseUrl.includes('sslmode=require')
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      logLevel: LOG_CONFIG.logLevel,
      development: process.env.NODE_ENV === 'development'
    },
    limits: {
      maxSessions: SESSION_CONFIG.maxSessions,
      sessionTimeout: SESSION_CONFIG.sessionTimeout,
      maxConnections: SUPABASE_CONFIG.maxConnections
    }
  }
}
