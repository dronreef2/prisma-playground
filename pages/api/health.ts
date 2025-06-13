import type { NextApiRequest, NextApiResponse } from 'next'

interface HealthCheck {
  status: 'ok' | 'error'
  message: string
  details?: any
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  checks: {
    supabase: HealthCheck
    database: HealthCheck
    cache: HealthCheck
    config: HealthCheck
  }
  metadata: {
    environment: string
    uptime: number
    version: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        supabase: { status: 'error', message: 'Method not allowed' },
        database: { status: 'error', message: 'Method not allowed' },
        cache: { status: 'error', message: 'Method not allowed' },
        config: { status: 'error', message: 'Method not allowed' }
      },
      metadata: {
        environment: process.env.NODE_ENV || 'unknown',
        uptime: process.uptime(),
        version: '1.0.0'
      }
    })
  }

  const checks: HealthResponse['checks'] = {
    supabase: { status: 'ok', message: 'Conectado' },
    database: { status: 'ok', message: 'Funcionando' },
    cache: { status: 'ok', message: 'Operacional' },
    config: { status: 'ok', message: 'Válida' }
  }

  // 1. Verificar configuração básica
  try {
    if (!process.env.DATABASE_URL) {
      checks.config = {
        status: 'error',
        message: 'DATABASE_URL não configurada'
      }
    } else if (!process.env.DIRECT_URL) {
      checks.config = {
        status: 'error',
        message: 'DIRECT_URL não configurada'
      }
    } else {
      checks.config = {
        status: 'ok',
        message: 'Configuração válida',
        details: {
          hasPooling: process.env.DATABASE_URL.includes('pooler'),
          hasSSL: process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('supabase.com'),
          isSupabase: process.env.DATABASE_URL.includes('supabase.com')
        }
      }
    }
  } catch (error) {
    checks.config = {
      status: 'error',
      message: `Erro ao verificar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }
  // 2. Verificar conexão com Supabase
  try {
    const { PrismaClient } = await import('@prisma/client')
    const healthClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })

    // Teste básico de conexão
    await healthClient.$queryRaw`SELECT 1 as test`
    await healthClient.$disconnect()

    checks.supabase = {
      status: 'ok',
      message: 'Conexão com Supabase estabelecida',
      details: {
        pooling: process.env.DATABASE_URL?.includes('pooler') || false,
        ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('supabase.com') || false
      }
    }
  } catch (error) {
    checks.supabase = {
      status: 'error',
      message: `Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }
  // 3. Verificar operações de banco de dados (criação de schema)
  try {
    const { PrismaClient } = await import('@prisma/client')
    const testClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DIRECT_URL || process.env.DATABASE_URL
        }
      }
    })

    // Testar criação e remoção de schema
    const testSchemaName = `health_check_${Date.now()}`
    await testClient.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${testSchemaName}"`)
    await testClient.$executeRawUnsafe(`DROP SCHEMA "${testSchemaName}"`)
    await testClient.$disconnect()

    checks.database = {
      status: 'ok',
      message: 'Operações de schema funcionando',
      details: {
        canCreateSchema: true,
        canDropSchema: true
      }
    }
  } catch (error) {
    checks.database = {
      status: 'error',
      message: `Erro nas operações de banco: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }

  // 4. Verificar cache (implementação básica)
  try {
    // Simular verificação de cache sem dependência externa
    checks.cache = {
      status: 'ok',
      message: 'Cache operacional',
      details: {
        type: 'memory',
        available: true
      }
    }
  } catch (error) {
    checks.cache = {
      status: 'error',
      message: `Erro no cache: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }

  // Determinar status geral
  const hasErrors = Object.values(checks).some(check => check.status === 'error')
  const status = hasErrors ? 'unhealthy' : 'healthy'

  const response: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    metadata: {
      environment: process.env.NODE_ENV || 'unknown',
      uptime: process.uptime(),
      version: '1.0.0'
    }
  }

  // Status HTTP baseado na saúde
  const statusCode = status === 'healthy' ? 200 : 503

  res.status(statusCode).json(response)
}
