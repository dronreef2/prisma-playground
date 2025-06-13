import type { NextApiRequest, NextApiResponse } from 'next'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

type MigrateRequest = {
  sessionId: string
  schema: string
}

type MigrateResponse = {
  success: boolean
  logs: string[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MigrateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      logs: [],
      error: 'Method not allowed' 
    })
  }

  const { sessionId, schema }: MigrateRequest = req.body
  const logs: string[] = []

  if (!sessionId || !schema) {
    return res.status(400).json({
      success: false,
      logs: [],
      error: 'sessionId e schema são obrigatórios'
    })
  }

  try {
    logs.push(`🚀 Iniciando migração para sessão: ${sessionId}`)

    // Criar diretório temporário para a sessão
    const tempDir = path.join(os.tmpdir(), 'prisma-playground', sessionId)
    await fs.mkdir(tempDir, { recursive: true })
      // Escrever schema temporário
    const schemaPath = path.join(tempDir, 'schema.prisma')
    
    // Verificar se o schema já tem directUrl configurado
    let modifiedSchema = schema
    if (!schema.includes('directUrl')) {
      modifiedSchema = schema.replace(
        'url      = env("DATABASE_URL")',
        `url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")`
      )
    }
    
    await fs.writeFile(schemaPath, modifiedSchema, 'utf-8')
    logs.push(`📝 Schema salvo em: ${schemaPath}`)    // Construir URL do banco com schema específico para Supabase
    const baseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
    if (!baseUrl) {
      throw new Error('DATABASE_URL não configurada')
    }

    // Para Supabase, usar search_path para direcionar ao schema específico
    const dbUrl = `${baseUrl}&options=-c search_path=${sessionId},public`
    logs.push(`🔗 URL do banco Supabase: ${baseUrl}`)
    logs.push(`🎯 Schema target: ${sessionId}`)    // Executar migração usando Prisma CLI
    const migrateCommand = `npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`
    
    logs.push(`⚡ Executando: ${migrateCommand}`)

    const { stdout, stderr } = await execAsync(migrateCommand, {
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        DIRECT_URL: dbUrl
      },
      cwd: process.cwd(),
      timeout: 60000 // 60 segundos timeout para Supabase
    })

    // Processar saída com mais detalhes
    if (stdout) {
      stdout.split('\n').forEach(line => {
        if (line.trim()) {
          logs.push(`📤 ${line.trim()}`)
        }
      })
    }

    if (stderr) {
      stderr.split('\n').forEach(line => {
        if (line.trim() && !line.includes('warn') && !line.includes('info')) {
          logs.push(`⚠️  ${line.trim()}`)
        }
      })
    }

    logs.push(`✅ Migração concluída no Supabase!`)
    logs.push(`🎯 Schema ${sessionId} está pronto para uso`)    // Verificar se as tabelas foram criadas corretamente
    try {
      const { PrismaClient } = await import('@prisma/client')
      const testPrisma = new PrismaClient({
        datasources: {
          db: { url: dbUrl }
        }
      })
      
      // Testar conexão ao schema
      await testPrisma.$executeRawUnsafe(`SET search_path TO "${sessionId}", public`)
      
      // Listar tabelas criadas
      const tables = await testPrisma.$queryRawUnsafe(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_type = 'BASE TABLE'
      `, sessionId)
      
      if (Array.isArray(tables) && tables.length > 0) {
        logs.push(`📊 Tabelas criadas: ${tables.map((t: any) => t.table_name).join(', ')}`)
      }
      
      await testPrisma.$disconnect()
    } catch (verifyError) {
      logs.push(`⚠️  Não foi possível verificar tabelas criadas`)
    }

    // Limpar arquivo temporário
    try {
      await fs.unlink(schemaPath)
    } catch (cleanupError) {
      logs.push(`⚠️  Aviso: Não foi possível limpar arquivo temporário`)
    }

    res.status(200).json({
      success: true,
      logs
    })

  } catch (error) {
    console.error('Erro na migração:', error)
    
    logs.push(`❌ Erro na migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    
    res.status(500).json({
      success: false,
      logs,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    })
  }
}
