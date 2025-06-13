/**
 * 🎯 Cliente Prisma Virtual para Supabase
 * 
 * Este arquivo implementa um cliente Prisma virtual que funciona diretamente
 * com Supabase usando SQL raw, eliminando a necessidade de gerar o cliente
 * Prisma localmente (resolve problemas EPERM no Windows).
 */

import { Client } from 'pg'

// Tipos para o cliente virtual
interface VirtualPrismaClient {
  user: VirtualModel
  profile: VirtualModel
  post: VirtualModel
  category: VirtualModel
  tag: VirtualModel
  postTag: VirtualModel
  comment: VirtualModel
  $queryRaw: (query: TemplateStringsArray, ...values: any[]) => Promise<any[]>
  $queryRawUnsafe: (query: string, ...values: any[]) => Promise<any[]>
  $disconnect: () => Promise<void>
}

interface VirtualModel {
  findMany: (args?: any) => Promise<any[]>
  findUnique: (args: any) => Promise<any | null>
  findFirst: (args?: any) => Promise<any | null>
  create: (args: any) => Promise<any>
  createMany: (args: any) => Promise<{ count: number }>
  update: (args: any) => Promise<any>
  updateMany: (args: any) => Promise<{ count: number }>
  upsert: (args: any) => Promise<any>
  delete: (args: any) => Promise<any>
  deleteMany: (args?: any) => Promise<{ count: number }>
  count: (args?: any) => Promise<number>
  aggregate: (args?: any) => Promise<any>
  groupBy: (args: any) => Promise<any[]>
}

// Schema mapping para conversão automática
const SCHEMA_MAPPING = {
  user: {
    table: 'users',
    fields: {
      id: 'id',
      email: 'email',
      name: 'name',
      bio: 'bio',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    relations: {
      profile: { type: 'one', model: 'profile', foreignKey: 'userId' },
      posts: { type: 'many', model: 'post', foreignKey: 'authorId' },
      comments: { type: 'many', model: 'comment', foreignKey: 'authorId' }
    }
  },
  profile: {
    table: 'profiles',
    fields: {
      id: 'id',
      avatar: 'avatar',
      website: 'website',
      twitter: 'twitter',
      userId: 'userId'
    },
    relations: {
      user: { type: 'one', model: 'user', foreignKey: 'userId' }
    }
  },
  post: {
    table: 'posts',
    fields: {
      id: 'id',
      title: 'title',
      content: 'content',
      published: 'published',
      views: 'views',
      authorId: 'authorId',
      categoryId: 'categoryId',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    relations: {
      author: { type: 'one', model: 'user', foreignKey: 'authorId' },
      category: { type: 'one', model: 'category', foreignKey: 'categoryId' },
      postTags: { type: 'many', model: 'postTag', foreignKey: 'postId' },
      comments: { type: 'many', model: 'comment', foreignKey: 'postId' }
    }
  },
  category: {
    table: 'categories',
    fields: {
      id: 'id',
      name: 'name',
      description: 'description',
      color: 'color'
    },
    relations: {
      posts: { type: 'many', model: 'post', foreignKey: 'categoryId' }
    }
  },
  tag: {
    table: 'tags',
    fields: {
      id: 'id',
      name: 'name'
    },
    relations: {
      postTags: { type: 'many', model: 'postTag', foreignKey: 'tagId' }
    }
  },
  postTag: {
    table: 'post_tags',
    fields: {
      postId: 'postId',
      tagId: 'tagId'
    },
    relations: {
      post: { type: 'one', model: 'post', foreignKey: 'postId' },
      tag: { type: 'one', model: 'tag', foreignKey: 'tagId' }
    }
  },
  comment: {
    table: 'comments',
    fields: {
      id: 'id',
      content: 'content',
      authorId: 'authorId',
      postId: 'postId',
      parentId: 'parentId',
      createdAt: 'createdAt'
    },
    relations: {
      author: { type: 'one', model: 'user', foreignKey: 'authorId' },
      post: { type: 'one', model: 'post', foreignKey: 'postId' },
      parent: { type: 'one', model: 'comment', foreignKey: 'parentId' },
      replies: { type: 'many', model: 'comment', foreignKey: 'parentId' }
    }
  }
}

/**
 * Criar cliente Prisma virtual para uma sessão
 */
export async function createVirtualPrismaClient(sessionId: string, usePublicSchema: boolean = true): Promise<VirtualPrismaClient> {
  console.log(`🎯 [Virtual Prisma] Criando cliente virtual para sessão: ${sessionId} (schema: ${usePublicSchema ? 'public' : sessionId})`)
  
  // Criar conexão PostgreSQL direta
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })
  
  await client.connect()
  console.log(`✅ [Virtual Prisma] Conectado ao PostgreSQL`)
  // Configurar schema baseado na preferência do usuário
  const targetSchema = usePublicSchema ? 'public' : sessionId
  await client.query(`SET search_path TO ${usePublicSchema ? 'public' : `"${sessionId}"`}`)
  console.log(`🔧 [Virtual Prisma] Schema configurado: ${targetSchema}`)
  
  // Verificar se as tabelas existem no schema escolhido
  await ensureTablesExist(client, targetSchema)
  
  // Função para construir queries SELECT
  function buildSelectQuery(modelName: string, args: any = {}) {
    const schema = SCHEMA_MAPPING[modelName as keyof typeof SCHEMA_MAPPING]
    if (!schema) throw new Error(`Modelo ${modelName} não encontrado`)
    
    let query = `SELECT * FROM "${schema.table}"`
    const values: any[] = []
    let valueIndex = 1
    
    // WHERE clause
    if (args.where) {
      const whereConditions = Object.entries(args.where).map(([field, value]) => {
        const dbField = schema.fields[field as keyof typeof schema.fields] || field
        values.push(value)
        return `"${dbField}" = $${valueIndex++}`
      })
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`
      }
    }
      // ORDER BY
    if (args.orderBy) {
      const orderFields = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]
      const orderClauses = orderFields.map((order: any) => {
        const [[field, direction]] = Object.entries(order)
        const dbField = schema.fields[field as keyof typeof schema.fields] || field
        return `"${dbField}" ${String(direction).toUpperCase()}`
      })
      query += ` ORDER BY ${orderClauses.join(', ')}`
    }
    
    // LIMIT
    if (args.take) {
      query += ` LIMIT ${args.take}`
    }
    
    // OFFSET
    if (args.skip) {
      query += ` OFFSET ${args.skip}`
    }
    
    return { query, values }
  }
    // Função para construir queries INSERT
  function buildInsertQuery(modelName: string, data: any) {
    const schema = SCHEMA_MAPPING[modelName as keyof typeof SCHEMA_MAPPING]
    if (!schema) throw new Error(`Modelo ${modelName} não encontrado`)
    
    // Adicionar campos automáticos baseados no modelo
    const enhancedData = { ...data }
      // Adicionar timestamps se não estiverem presentes
    if ('createdAt' in schema.fields && !enhancedData.createdAt) {
      enhancedData.createdAt = new Date()
    }
    if ('updatedAt' in schema.fields && !enhancedData.updatedAt) {
      enhancedData.updatedAt = new Date()
    }
    
    const fields = Object.keys(enhancedData).filter(key => schema.fields[key as keyof typeof schema.fields])
    const dbFields = fields.map(field => `"${schema.fields[field as keyof typeof schema.fields]}"`)
    const placeholders = fields.map((_, i) => `$${i + 1}`)
    const values = fields.map(field => enhancedData[field])
    
    const query = `
      INSERT INTO "${schema.table}" (${dbFields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `
    
    return { query, values }
  }
    // Função para construir queries UPDATE
  function buildUpdateQuery(modelName: string, args: any) {
    const schema = SCHEMA_MAPPING[modelName as keyof typeof SCHEMA_MAPPING]
    if (!schema) throw new Error(`Modelo ${modelName} não encontrado`)
      // Adicionar updatedAt automático
    const enhancedData = { ...args.data }
    if ('updatedAt' in schema.fields && !enhancedData.updatedAt) {
      enhancedData.updatedAt = new Date()
    }
    
    const setFields = Object.keys(enhancedData).filter(key => schema.fields[key as keyof typeof schema.fields])
    const setClauses = setFields.map((field, i) => {
      const dbField = schema.fields[field as keyof typeof schema.fields]
      return `"${dbField}" = $${i + 1}`
    })
    const setValues = setFields.map(field => enhancedData[field])
    
    let query = `UPDATE "${schema.table}" SET ${setClauses.join(', ')}`
    const values = [...setValues]
    let valueIndex = setValues.length + 1
    
    // WHERE clause
    if (args.where) {
      const whereConditions = Object.entries(args.where).map(([field, value]) => {
        const dbField = schema.fields[field as keyof typeof schema.fields] || field
        values.push(value)
        return `"${dbField}" = $${valueIndex++}`
      })
      query += ` WHERE ${whereConditions.join(' AND ')}`
    }
    
    query += ' RETURNING *'
    
    return { query, values }
  }
  
  // Função para construir queries DELETE
  function buildDeleteQuery(modelName: string, args: any) {
    const schema = SCHEMA_MAPPING[modelName as keyof typeof SCHEMA_MAPPING]
    if (!schema) throw new Error(`Modelo ${modelName} não encontrado`)
    
    let query = `DELETE FROM "${schema.table}"`
    const values: any[] = []
    let valueIndex = 1
    
    // WHERE clause
    if (args.where) {
      const whereConditions = Object.entries(args.where).map(([field, value]) => {
        const dbField = schema.fields[field as keyof typeof schema.fields] || field
        values.push(value)
        return `"${dbField}" = $${valueIndex++}`
      })
      query += ` WHERE ${whereConditions.join(' AND ')}`
    }
    
    return { query, values }
  }
  
  // Criar modelo virtual
  function createVirtualModel(modelName: string): VirtualModel {
    return {
      async findMany(args = {}) {
        console.log(`🔍 [Virtual Prisma] ${modelName}.findMany:`, JSON.stringify(args, null, 2))
        const { query, values } = buildSelectQuery(modelName, args)
        console.log(`📝 [Virtual Prisma] SQL:`, query)
        console.log(`📊 [Virtual Prisma] Values:`, values)
        
        const result = await client.query(query, values)
        return result.rows
      },
      
      async findUnique(args) {
        console.log(`🔍 [Virtual Prisma] ${modelName}.findUnique:`, JSON.stringify(args, null, 2))
        const { query, values } = buildSelectQuery(modelName, { ...args, take: 1 })
        console.log(`📝 [Virtual Prisma] SQL:`, query)
        
        const result = await client.query(query, values)
        return result.rows[0] || null
      },
      
      async findFirst(args = {}) {
        console.log(`🔍 [Virtual Prisma] ${modelName}.findFirst:`, JSON.stringify(args, null, 2))
        const { query, values } = buildSelectQuery(modelName, { ...args, take: 1 })
        console.log(`📝 [Virtual Prisma] SQL:`, query)
        
        const result = await client.query(query, values)
        return result.rows[0] || null
      },
      
      async create(args) {
        console.log(`➕ [Virtual Prisma] ${modelName}.create:`, JSON.stringify(args, null, 2))
        const { query, values } = buildInsertQuery(modelName, args.data)
        console.log(`📝 [Virtual Prisma] SQL:`, query)
        
        const result = await client.query(query, values)
        return result.rows[0]
      },
      
      async createMany(args) {
        console.log(`➕ [Virtual Prisma] ${modelName}.createMany:`, JSON.stringify(args, null, 2))
        let count = 0
        
        for (const data of args.data) {
          const { query, values } = buildInsertQuery(modelName, data)
          await client.query(query, values)
          count++
        }
        
        return { count }
      },
      
      async update(args) {
        console.log(`✏️ [Virtual Prisma] ${modelName}.update:`, JSON.stringify(args, null, 2))
        const { query, values } = buildUpdateQuery(modelName, args)
        console.log(`📝 [Virtual Prisma] SQL:`, query)
        
        const result = await client.query(query, values)
        if (result.rows.length === 0) {
          throw new Error(`Registro não encontrado para atualização`)
        }
        return result.rows[0]
      },
      
      async updateMany(args) {
        console.log(`✏️ [Virtual Prisma] ${modelName}.updateMany:`, JSON.stringify(args, null, 2))
        const { query, values } = buildUpdateQuery(modelName, args)
        const result = await client.query(query.replace(' RETURNING *', ''), values)
        return { count: result.rowCount || 0 }
      },
      
      async upsert(args) {
        console.log(`🔄 [Virtual Prisma] ${modelName}.upsert:`, JSON.stringify(args, null, 2))
        
        // Tentar encontrar o registro primeiro
        const existing = await this.findUnique({ where: args.where })
        
        if (existing) {
          // Atualizar
          return await this.update({ where: args.where, data: args.update })
        } else {
          // Criar
          return await this.create({ data: { ...args.where, ...args.create } })
        }
      },
      
      async delete(args) {
        console.log(`🗑️ [Virtual Prisma] ${modelName}.delete:`, JSON.stringify(args, null, 2))
        
        // Buscar o registro primeiro para retornar
        const existing = await this.findUnique({ where: args.where })
        if (!existing) {
          throw new Error(`Registro não encontrado para exclusão`)
        }
        
        const { query, values } = buildDeleteQuery(modelName, args)
        console.log(`📝 [Virtual Prisma] SQL:`, query)
        
        await client.query(query, values)
        return existing
      },
      
      async deleteMany(args = {}) {
        console.log(`🗑️ [Virtual Prisma] ${modelName}.deleteMany:`, JSON.stringify(args, null, 2))
        const { query, values } = buildDeleteQuery(modelName, args)
        const result = await client.query(query, values)
        return { count: result.rowCount || 0 }
      },
      
      async count(args = {}) {
        console.log(`🔢 [Virtual Prisma] ${modelName}.count:`, JSON.stringify(args, null, 2))
        const schema = SCHEMA_MAPPING[modelName as keyof typeof SCHEMA_MAPPING]
        
        let query = `SELECT COUNT(*) as count FROM "${schema.table}"`
        const values: any[] = []
        let valueIndex = 1
        
        if (args.where) {
          const whereConditions = Object.entries(args.where).map(([field, value]) => {
            const dbField = schema.fields[field as keyof typeof schema.fields] || field
            values.push(value)
            return `"${dbField}" = $${valueIndex++}`
          })
          query += ` WHERE ${whereConditions.join(' AND ')}`
        }
        
        const result = await client.query(query, values)
        return parseInt(result.rows[0].count)
      },
      
      async aggregate(args = {}) {
        console.log(`📊 [Virtual Prisma] ${modelName}.aggregate:`, JSON.stringify(args, null, 2))
        // Implementação simplificada
        const count = await this.count(args.where ? { where: args.where } : {})
        return { _count: { _all: count } }
      },
      
      async groupBy(args) {
        console.log(`📈 [Virtual Prisma] ${modelName}.groupBy:`, JSON.stringify(args, null, 2))
        // Implementação simplificada
        const records = await this.findMany(args.where ? { where: args.where } : {})
        return records
      }
    }
  }
  
  // Criar cliente virtual completo
  const virtualClient: VirtualPrismaClient = {
    user: createVirtualModel('user'),
    profile: createVirtualModel('profile'),
    post: createVirtualModel('post'),
    category: createVirtualModel('category'),
    tag: createVirtualModel('tag'),
    postTag: createVirtualModel('postTag'),
    comment: createVirtualModel('comment'),
    
    async $queryRaw(query: TemplateStringsArray, ...values: any[]) {
      console.log(`🔧 [Virtual Prisma] $queryRaw:`, query.join('?'))
      const sqlQuery = query.join('?') // Simplificado
      const result = await client.query(sqlQuery, values)
      return result.rows
    },
    
    async $queryRawUnsafe(query: string, ...values: any[]) {
      console.log(`🔧 [Virtual Prisma] $queryRawUnsafe:`, query)
      const result = await client.query(query, values)
      return result.rows
    },
    
    async $disconnect() {
      console.log(`🔌 [Virtual Prisma] Desconectando sessão: ${sessionId}`)
      await client.end()
    }
  }
  
  console.log(`✅ [Virtual Prisma] Cliente virtual criado para sessão: ${sessionId}`)
  return virtualClient
}

/**
 * Função para garantir que as tabelas existam no schema
 */
async function ensureTablesExist(client: Client, schemaName: string) {
  try {
    console.log(`🔍 [Virtual Prisma] Verificando tabelas no schema: ${schemaName}`)
    
    // Para schema público, não precisamos criar o schema
    if (schemaName !== 'public') {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
    }
    
    // Verificar se as tabelas já existem (verificando apenas as tabelas do Prisma)
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name IN ('users', 'profiles', 'posts', 'categories', 'tags', 'PostTag', 'comments')
    `, [schemaName])
    
    const existingTableNames = existingTables.rows.map(row => row.table_name)
    const missingTables = ['users', 'profiles', 'posts', 'categories', 'tags', 'PostTag', 'comments']
      .filter(table => !existingTableNames.includes(table))
    
    if (missingTables.length > 0) {
      console.log(`📦 [Virtual Prisma] Criando tabelas faltantes: ${missingTables.join(', ')}`)
      
      // SQL para criar apenas as tabelas que não existem (sem schema prefix para public)
      const schemaPrefix = schemaName === 'public' ? '' : `"${schemaName}".`
      const createTablesSQL = `
        -- Users table (se não existir)
        CREATE TABLE IF NOT EXISTS ${schemaPrefix}users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          bio TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );

        -- Profiles table (se não existir)
        CREATE TABLE IF NOT EXISTS ${schemaPrefix}profiles (
          id SERIAL PRIMARY KEY,
          avatar VARCHAR(255),
          website VARCHAR(255),
          twitter VARCHAR(255),
          "userId" INTEGER UNIQUE REFERENCES ${schemaPrefix}users(id) ON DELETE CASCADE
        );

        -- Categories table (se não existir)
        CREATE TABLE IF NOT EXISTS ${schemaPrefix}categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          color VARCHAR(7)
        );

        -- Posts table (se não existir)
        CREATE TABLE IF NOT EXISTS ${schemaPrefix}posts (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          published BOOLEAN DEFAULT FALSE,
          views INTEGER DEFAULT 0,
          "authorId" INTEGER REFERENCES ${schemaPrefix}users(id) ON DELETE CASCADE,
          "categoryId" INTEGER REFERENCES ${schemaPrefix}categories(id),
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );

        -- Tags table (se não existir)
        CREATE TABLE IF NOT EXISTS ${schemaPrefix}tags (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL
        );

        -- PostTags table (Many-to-Many) (se não existir)
        CREATE TABLE IF NOT EXISTS ${schemaPrefix}"PostTag" (
          "postId" INTEGER REFERENCES ${schemaPrefix}posts(id) ON DELETE CASCADE,
          "tagId" INTEGER REFERENCES ${schemaPrefix}tags(id) ON DELETE CASCADE,
          PRIMARY KEY ("postId", "tagId")
        );

        -- Comments table (se não existir)
        CREATE TABLE IF NOT EXISTS ${schemaPrefix}comments (
          id SERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          "postId" INTEGER REFERENCES ${schemaPrefix}posts(id) ON DELETE CASCADE,
          "authorId" INTEGER REFERENCES ${schemaPrefix}users(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMP DEFAULT NOW()
        );
      `
      
      await client.query(createTablesSQL)
      console.log(`✅ [Virtual Prisma] Tabelas criadas no schema: ${schemaName}`)
    } else {
      console.log(`✅ [Virtual Prisma] Todas as tabelas já existem no schema: ${schemaName}`)
    }
  } catch (error) {
    console.error(`❌ [Virtual Prisma] Erro ao verificar/criar tabelas:`, error)
  }
}
