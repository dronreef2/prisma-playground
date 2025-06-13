import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Monaco } from '@monaco-editor/react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import Link from 'next/link'
import { createSession, executeQuery, runMigration, generateClient } from '../src/services/api-service'
import { isGitHubPages } from '../src/config/environment'

// Importação dinâmica do Monaco Editor para evitar problemas de SSR
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface LogEntry {
  id: string
  timestamp: Date
  type: 'success' | 'error' | 'info' | 'warning' | 'sql' | 'explain' | 'tip' | 'performance'
  message: string
  operation?: string
  duration?: number
  details?: any
  sqlQuery?: string
  affectedRows?: number
  explanation?: string
}

interface PlaygroundState {
  sessionId: string | null
  schema: string
  query: string
  logs: LogEntry[]
  queryResult: any
  isLoading: boolean
  needsMigration: boolean
  lastMigratedSchema: string
  clientGenerated: boolean
  logsFilter: 'all' | 'success' | 'error' | 'info' | 'warning' | 'sql' | 'explain' | 'tip' | 'performance'
  autoScroll: boolean
  activePanel: 'schema' | 'logs' | 'query'
  queryHistory: Array<{ query: string; timestamp: Date; success: boolean }>
  usePublicSchema: boolean // Novo: usar schema público do Supabase ou schemas isolados
}

export default function PrismaPlayground() {
  const [state, setState] = useState<PlaygroundState>({
    sessionId: null,    schema: `// 🎓 PRISMA SCHEMA EDUCACIONAL
// Este é um exemplo completo para aprender Prisma ORM
// Documentação: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 👤 Modelo de Usuário com relacionamentos
model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique
  name        String
  bio         String?   // Campo opcional
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // 📝 Relacionamentos
  posts       Post[]    // Um usuário tem muitos posts
  profile     Profile?  // Um usuário tem um perfil (opcional)
  comments    Comment[] // Um usuário tem muitos comentários
  
  @@map("users") // Nome da tabela no banco
}

// 👤 Perfil do usuário (relacionamento 1:1)
model Profile {
  id        Int     @id @default(autoincrement())
  avatar    String?
  website   String?
  twitter   String?
  userId    Int     @unique
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("profiles")
}

// 📄 Posts com categorias e tags
model Post {
  id          Int       @id @default(autoincrement())
  title       String
  content     String?
  published   Boolean   @default(false)
  views       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // 🔗 Relacionamentos
  authorId    Int
  author      User      @relation(fields: [authorId], references: [id])
  categoryId  Int?
  category    Category? @relation(fields: [categoryId], references: [id])
  comments    Comment[]
  postTags    PostTag[] // Relacionamento muitos-para-muitos com tags
  
  @@index([authorId])
  @@index([published, createdAt])
  @@map("posts")
}

// 🏷️ Categorias para organizar posts
model Category {
  id          Int    @id @default(autoincrement())
  name        String @unique
  description String?
  color       String @default("#3B82F6")
  posts       Post[]
  
  @@map("categories")
}

// 🏷️ Tags para posts (relacionamento N:N)
model Tag {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  postTags PostTag[]
  
  @@map("tags")
}

// 🔗 Tabela de junção para Posts e Tags
model PostTag {
  postId Int
  tagId  Int
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([postId, tagId])
  @@map("post_tags")
}

// 💬 Comentários com threading (respostas)
model Comment {
  id        Int       @id @default(autoincrement())
  content   String
  createdAt DateTime  @default(now())
  
  // 🔗 Relacionamentos
  authorId  Int
  author    User      @relation(fields: [authorId], references: [id])
  postId    Int
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  // 💬 Threading: comentário pode responder outro comentário
  parentId  Int?
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  
  @@index([postId])
  @@index([authorId])
  @@map("comments")
}`,    query: `// 🎓 EXEMPLOS EDUCACIONAIS DE PRISMA CLIENT
// Clique em "Executar Query" para testar cada exemplo

// 1️⃣ CRIAR USUÁRIO COM PERFIL (Relacionamento 1:1)
const usuarioComPerfil = await prisma.user.create({
  data: {
    name: "Maria Silva",
    email: "maria@exemplo.com",
    bio: "Desenvolvedora apaixonada por tecnologia",
    profile: {
      create: {
        avatar: "https://exemplo.com/avatar.jpg",
        website: "https://mariasilva.dev",
        twitter: "@maria_dev"
      }
    }
  },
  include: {
    profile: true // ✨ Inclui o perfil na resposta
  }
})

// 2️⃣ CRIAR POST COM CATEGORIA E TAGS (Relacionamentos N:N)
const postCompleto = await prisma.post.create({
  data: {
    title: "Aprendendo Prisma ORM",
    content: "Prisma é incrível para trabalhar com bancos de dados!",
    published: true,
    author: {
      connect: { id: 1 } // 🔗 Conecta a um usuário existente
    },
    category: {
      create: {
        name: "Tecnologia",
        description: "Posts sobre desenvolvimento e tecnologia",
        color: "#10B981"
      }
    },
    postTags: {
      create: [
        { tag: { create: { name: "prisma" } } },
        { tag: { create: { name: "database" } } },
        { tag: { create: { name: "orm" } } }
      ]
    }
  },
  include: {
    author: true,
    category: true,
    postTags: {
      include: { tag: true }
    }
  }
})

// 3️⃣ BUSCAR POSTS COM FILTROS E RELACIONAMENTOS
const postsPublicados = await prisma.post.findMany({
  where: {
    published: true,
    author: {
      email: {
        contains: "@exemplo.com" // 🔍 Filtro aninhado
      }
    }
  },
  include: {
    author: {
      select: { name: true, email: true } // ✂️ Seleciona apenas campos específicos
    },
    category: true,
    _count: {
      comments: true // 📊 Conta comentários
    }
  },
  orderBy: {
    createdAt: "desc" // 📅 Ordena por data
  },
  take: 10 // 📄 Limita a 10 resultados
})

// 4️⃣ AGREGAÇÕES E ESTATÍSTICAS
const estatisticas = await prisma.post.aggregate({
  _count: {
    id: true // Total de posts
  },
  _avg: {
    views: true // Média de visualizações
  },
  _max: {
    views: true // Post com mais visualizações
  },
  where: {
    published: true
  }
})

// 5️⃣ TRANSAÇÃO (Múltiplas operações)
const transacao = await prisma.$transaction(async (tx) => {
  // Criar usuário
  const usuario = await tx.user.create({
    data: {
      name: "João Santos",
      email: "joao@exemplo.com"
    }
  })
  
  // Criar post para o usuário
  const post = await tx.post.create({
    data: {
      title: "Meu primeiro post",
      content: "Olá mundo!",
      authorId: usuario.id
    }
  })
  
  return { usuario, post }
})

// ⚠️ Descomente UMA operação por vez para testar!
console.log(usuarioComPerfil)
// console.log(postCompleto)
// console.log(postsPublicados)
// console.log(estatisticas)
// console.log(transacao)`,logs: [],
    queryResult: null,    isLoading: false,
    needsMigration: false,
    lastMigratedSchema: '',    clientGenerated: false,
    logsFilter: 'all',
    autoScroll: true,
    activePanel: 'schema',
    queryHistory: [] as Array<{ query: string; timestamp: Date; success: boolean }>,
    usePublicSchema: true // Por padrão, usar schema público do Supabase
  })
  // Função para adicionar logs estruturados
  const addLog = (
    type: LogEntry['type'], 
    message: string, 
    operation?: string, 
    duration?: number, 
    details?: any,
    sqlQuery?: string,
    affectedRows?: number,
    explanation?: string
  ) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      operation,
      duration,
      details,
      sqlQuery,
      affectedRows,
      explanation
    }

    setState(prev => ({
      ...prev,
      logs: [...prev.logs, logEntry]
    }))

    // Auto-scroll se habilitado
    setTimeout(() => {
      if (state.autoScroll) {
        const logsContainer = document.querySelector('.logs')
        if (logsContainer) {
          logsContainer.scrollTop = logsContainer.scrollHeight
        }
      }
    }, 100)
  }
  // Função para processar logs recebidos das APIs com explicações educacionais
  const processApiLogs = (apiLogs: string[], operation: string, startTime: number) => {
    const duration = Date.now() - startTime
    
    // Adicionar explicação da operação
    if (operation === 'migration') {
      addLog('explain', '🎓 EXPLICAÇÃO: A migração sincroniza seu schema Prisma com o banco de dados, criando/alterando tabelas conforme necessário.', operation)
    } else if (operation === 'generate') {
      addLog('explain', '🎓 EXPLICAÇÃO: A geração do cliente cria o Prisma Client tipado baseado no seu schema, permitindo queries type-safe.', operation)
    }
    
    apiLogs.forEach(log => {
      let type: LogEntry['type'] = 'info'
      let explanation = ''
      let sqlQuery = ''
      
      // Categorizar logs baseado no conteúdo
      if (log.includes('✅') || log.includes('concluída') || log.includes('Success') || log.includes('Generated')) {
        type = 'success'
        if (log.includes('migração concluída')) {
          explanation = 'Todas as tabelas foram criadas/atualizadas com sucesso no banco de dados.'
        } else if (log.includes('Generated')) {
          explanation = 'O Prisma Client foi gerado e está pronto para uso em suas queries.'
        }
      } else if (log.includes('❌') || log.includes('Erro') || log.includes('Error')) {
        type = 'error'
        explanation = 'Verifique a sintaxe do schema e a conexão com o banco de dados.'
      } else if (log.includes('⚠️') || log.includes('Warning')) {
        type = 'warning'
        explanation = 'Atenção: esta operação pode afetar dados existentes.'      } else if (log.includes('prisma:query') || log.includes('CREATE') || log.includes('SELECT') || log.includes('INSERT')) {
        type = 'sql'
        sqlQuery = log.replace('prisma:query ', '')
        explanation = 'Esta é a query SQL real executada pelo Prisma no banco de dados.'
        
        // Adicionar explicação educacional da query SQL
        setTimeout(() => explainSqlQuery(sqlQuery), 500)
      }
      
      // Detectar queries específicas e adicionar dicas
      if (log.includes('CREATE TABLE')) {
        addLog('tip', '💡 DICA: O Prisma criou uma nova tabela. Observe como os tipos do schema foram convertidos para SQL.', operation)
      } else if (log.includes('CREATE INDEX')) {
        addLog('tip', '💡 DICA: Índices foram criados automaticamente para melhorar a performance das consultas.', operation)
      }
      
      addLog(type, log, operation, duration, null, sqlQuery, undefined, explanation)
    })
    
    // Adicionar dicas de performance
    if (duration > 5000) {
      addLog('performance', `⚡ PERFORMANCE: Operação demorou ${(duration/1000).toFixed(1)}s. Em produção, considere usar migrations incrementais.`, operation)
    } else {
      addLog('performance', `⚡ PERFORMANCE: Operação completada em ${(duration/1000).toFixed(1)}s - ótimo tempo!`, operation)
    }
  }
  // Inicializar sessão quando componente monta
  useEffect(() => {
    initializeSession()
    showWelcomeLogs()
  }, [])

  // Função para mostrar logs de boas-vindas educacionais
  const showWelcomeLogs = () => {
    setTimeout(() => {
      addLog('info', '🎓 Bem-vindo ao Prisma Playground Educacional!', 'welcome')
    }, 500)
    
    setTimeout(() => {
      addLog('explain', '🔍 Este playground usa um schema real com relacionamentos complexos para ensinar conceitos avançados do Prisma ORM.', 'welcome')
    }, 1000)
    
    setTimeout(() => {
      addLog('tip', '💡 DICA: Observe que temos relacionamentos 1:1 (User ↔ Profile), 1:N (User → Posts) e N:N (Posts ↔ Tags).', 'welcome')
    }, 1500)
      setTimeout(() => {
      addLog('tip', '💡 DICA: Use os filtros na parte superior dos logs para ver apenas SQL, explicações ou dicas específicas.', 'welcome')
    }, 2000)
    
    setTimeout(() => {
      addLog('performance', '⚡ PERFORMANCE: Este playground está conectado ao Supabase PostgreSQL em produção para demonstrações reais.', 'welcome')
    }, 2500)
  }
  
  const initializeSession = async () => {
    const startTime = Date.now()
    addLog('info', '🔄 Iniciando nova sessão...', 'session_init')
      try {
      // Usando o serviço de API que funciona em todos os ambientes
      const data = await createSession()
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          sessionId: data.sessionId || null
        }))
        addLog('success', `✅ Sessão criada: ${data.sessionId}`, 'session_init', Date.now() - startTime)
        
        if (isGitHubPages()) {
          addLog('info', '🌐 Executando no GitHub Pages - Usando API simulada', 'environment')
        }
      } else {
        addLog('error', `❌ Falha ao criar sessão: ${data.error || 'Erro desconhecido'}`, 'session_init', Date.now() - startTime)
      }
    } catch (error) {      console.error('Erro ao inicializar sessão:', error)
      addLog('error', `❌ Erro ao criar sessão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'session_init', Date.now() - startTime)
    }
  }
  
  const handleMigrate = async () => {
    if (!state.sessionId) {
      alert('Sessão não inicializada!')
      return
    }

    const startTime = Date.now()
    setState(prev => ({ ...prev, isLoading: true }))
    addLog('info', '🔄 Iniciando migração do schema...', 'migration')

    try {
      // Usando o serviço de API que funciona em todos os ambientes
      const data = await runMigration(state.sessionId, state.schema)
      
      // Processar logs da API
      if (data.logs && data.logs.length > 0) {
        processApiLogs(data.logs, 'migration', startTime)
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        needsMigration: !data.success,
        lastMigratedSchema: data.success ? prev.schema : prev.lastMigratedSchema,
        clientGenerated: data.success ? false : prev.clientGenerated // Reset quando migração bem-sucedida
      }))
    } catch (error) {
      addLog('error', `❌ Erro na migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'migration', Date.now() - startTime)
      setState(prev => ({
        ...prev,
        isLoading: false
      }))
    }
  }
  const handleGenerate = async () => {
    if (!state.sessionId) {
      alert('Sessão não inicializada!')
      return
    }

    const startTime = Date.now()
    setState(prev => ({ ...prev, isLoading: true }))
    addLog('info', '🔄 Gerando cliente Prisma...', 'generate')

    try {
      // Usando o serviço de API que funciona em todos os ambientes
      const data = await generateClient(state.sessionId)
      
      // Processar logs da API
      if (data.logs && data.logs.length > 0) {
        processApiLogs(data.logs, 'generate', startTime)
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        clientGenerated: data.success
      }))
    } catch (error) {
      addLog('error', `❌ Erro na geração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'generate', Date.now() - startTime)
      setState(prev => ({        ...prev,
        isLoading: false
      }))
    }
  }
  
  const handleExecuteQuery = async () => {
    if (!state.sessionId) {
      alert('Sessão não inicializada!')
      return
    }

    const startTime = Date.now()
    setState(prev => ({ ...prev, isLoading: true, queryResult: null }))
    addLog('info', '🔄 Executando query...', 'query')

    try {      // Usar nosso serviço de API que funciona em todos os ambientes
      const data = await executeQuery(state.sessionId, state.query, state.usePublicSchema)
      
      // Processar logs da API
      if (data.logs && data.logs.length > 0) {
        processApiLogs(data.logs, 'query', startTime)
      }
      
      setState(prev => ({
        ...prev,
        queryResult: data.result || data.error,
        isLoading: false
      }))
      
      if (data.success) {
        addLog('success', '✅ Query executada com sucesso', 'query', Date.now() - startTime, data.result)
        saveToHistory(state.query, true)
      } else {
        addLog('error', `❌ Erro na query: ${data.error}`, 'query', Date.now() - startTime, data.error)
        saveToHistory(state.query, false)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
      addLog('error', `❌ Erro na execução: ${errorMsg}`, 'query', Date.now() - startTime)
      setState(prev => ({
        ...prev,
        queryResult: { error: errorMsg },
        isLoading: false
      }))
    }
  }
  // Função para carregar exemplos educacionais específicos
  const loadExample = (type: string) => {
    let exampleQuery = '';
    
    switch (type) {
      case 'basic':
        exampleQuery = `// 🎯 EXEMPLO BÁSICO: Criar e buscar usuários
const novoUsuario = await prisma.user.create({
  data: {
    name: "Ana Silva",
    email: "ana@exemplo.com",
    bio: "Desenvolvedora Full Stack"
  }
})

const usuarios = await prisma.user.findMany({
  take: 5, // Limita a 5 resultados
  orderBy: { createdAt: 'desc' }
})`;
        break;
        
      case 'relations':
        exampleQuery = `// 🔗 EXEMPLO RELACIONAMENTOS: Posts com autor e categoria
const postComRelacionamentos = await prisma.post.create({
  data: {
    title: "Aprendendo Prisma com Relacionamentos",
    content: "Prisma facilita muito o trabalho com relacionamentos!",
    published: true,
    author: {
      connect: { id: 1 } // Conecta a usuário existente
    },
    category: {
      create: {
        name: "Tutorial",
        description: "Posts educacionais",
        color: "#4CAF50"
      }
    },
    postTags: {
      create: [
        { tag: { create: { name: "prisma" } } },
        { tag: { create: { name: "relacionamentos" } } }
      ]
    }
  },
  include: {
    author: { select: { name: true, email: true } },
    category: true,
    postTags: { include: { tag: true } }
  }
})`;
        break;
        
      case 'advanced':
        exampleQuery = `// 🚀 EXEMPLO AVANÇADO: Agregações e filtros complexos
const estatisticasCompletas = await prisma.$transaction([
  // Contagem de posts por categoria
  prisma.post.groupBy({
    by: ['categoryId'],
    _count: { id: true },
    where: { published: true }
  }),
  
  // Usuários mais ativos
  prisma.user.findMany({
    include: {
      _count: { 
        select: { posts: true, comments: true } 
      }
    },
    orderBy: {
      posts: { _count: 'desc' }
    },
    take: 3
  }),
  
  // Posts mais comentados
  prisma.post.findMany({
    where: { published: true },
    include: {
      author: { select: { name: true } },
      _count: { select: { comments: true } }
    },
    orderBy: {
      comments: { _count: 'desc' }
    },
    take: 5
  })
])`;
        break;
        
      case 'transactions':
        exampleQuery = `// 💰 EXEMPLO TRANSAÇÕES: Operações atômicas
const criarUsuarioCompleto = await prisma.$transaction(async (tx) => {
  // 1. Criar usuário
  const usuario = await tx.user.create({
    data: {
      name: "Carlos Santos",
      email: "carlos@exemplo.com",
      bio: "Especialista em bancos de dados"
    }
  })
  
  // 2. Criar perfil para o usuário
  const perfil = await tx.profile.create({
    data: {
      userId: usuario.id,
      avatar: "https://exemplo.com/avatar-carlos.jpg",
      website: "https://carlos-dev.com"
    }
  })
  
  // 3. Criar primeiro post
  const post = await tx.post.create({
    data: {
      title: "Minha jornada com Prisma",
      content: "Descobrindo o poder das transações...",
      authorId: usuario.id
    }
  })
  
  return { usuario, perfil, post }
})`;
        break;
    }
    
    setState(prev => ({ ...prev, query: exampleQuery }))
    addLog('info', `📚 Exemplo "${type}" carregado no editor de queries`, 'examples')
    addLog('tip', '💡 DICA: Execute o exemplo e observe os logs SQL gerados em tempo real!', 'examples')
  }

  // Função para explicar queries SQL de forma educacional
  const explainSqlQuery = (sqlQuery: string) => {
    const query = sqlQuery.toLowerCase().trim()
    
    if (query.includes('create table')) {
      addLog('explain', '🏗️ EXPLICAÇÃO SQL: CREATE TABLE cria uma nova tabela no banco de dados. O Prisma automaticamente define tipos de dados PostgreSQL baseados no seu schema.', 'sql_explanation')
    } else if (query.includes('create index')) {
      addLog('explain', '📈 EXPLICAÇÃO SQL: CREATE INDEX melhora a performance de consultas. O Prisma cria índices automáticos para chaves primárias, estrangeiras e campos únicos.', 'sql_explanation')
    } else if (query.includes('alter table')) {
      addLog('explain', '🔧 EXPLICAÇÃO SQL: ALTER TABLE modifica a estrutura de uma tabela existente. Usado quando o schema Prisma é atualizado.', 'sql_explanation')
    } else if (query.includes('insert into')) {
      addLog('explain', '➕ EXPLICAÇÃO SQL: INSERT INTO adiciona novos registros. Corresponde ao prisma.model.create() ou .createMany().', 'sql_explanation')
    } else if (query.includes('select') && query.includes('from')) {
      addLog('explain', '🔍 EXPLICAÇÃO SQL: SELECT busca dados. Corresponde ao prisma.model.findMany(), .findFirst() ou .findUnique().', 'sql_explanation')
    } else if (query.includes('update')) {
      addLog('explain', '✏️ EXPLICAÇÃO SQL: UPDATE modifica registros existentes. Corresponde ao prisma.model.update() ou .updateMany().', 'sql_explanation')
    } else if (query.includes('delete')) {
      addLog('explain', '🗑️ EXPLICAÇÃO SQL: DELETE remove registros. Corresponde ao prisma.model.delete() ou .deleteMany().', 'sql_explanation')
    } else if (query.includes('join')) {
      addLog('explain', '🔗 EXPLICAÇÃO SQL: JOIN combina dados de múltiplas tabelas. O Prisma usa JOINs automaticamente quando você usa "include" ou "select" com relacionamentos.', 'sql_explanation')
    }
  }

  // Função para analisar logs e gerar dicas de otimização
  const generateOptimizationTips = () => {
    const sqlLogs = state.logs.filter(log => log.type === 'sql')
    const errorLogs = state.logs.filter(log => log.type === 'error')
    const slowLogs = state.logs.filter(log => log.duration && log.duration > 3000)
    
    addLog('tip', '🧠 ANÁLISE DOS LOGS: Gerando dicas de otimização baseadas na sua atividade...', 'optimization')
    
    setTimeout(() => {
      if (sqlLogs.length > 10) {
        addLog('tip', '💡 DICA DE PERFORMANCE: Você executou muitas queries. Considere usar "include" para buscar relacionamentos em uma única query ao invés de múltiplas.', 'optimization')
      }
      
      if (errorLogs.length > 0) {
        addLog('tip', '💡 DICA DE DEBUGGING: Para reduzir erros, sempre valide dados antes de inserir e use tipos TypeScript corretamente.', 'optimization')
      }
      
      if (slowLogs.length > 0) {
        addLog('tip', '💡 DICA DE PERFORMANCE: Operações lentas detectadas! Use índices nos campos mais consultados e evite buscar dados desnecessários.', 'optimization')
      }
      
      if (sqlLogs.some(log => log.message.includes('SELECT') && !log.message.includes('LIMIT'))) {
        addLog('tip', '💡 DICA DE BOAS PRÁTICAS: Use "take" ou "skip" para paginar resultados e evitar carregar dados desnecessários.', 'optimization')
      }
      
      addLog('explain', '🎓 CONCEITO: O Prisma otimiza automaticamente suas queries, mas você pode melhorar ainda mais usando select específicos, índices adequados e relacionamentos eficientes.', 'optimization')
    }, 1000)
  }

  // Função para adicionar dicas contextuais baseadas na atividade
  const addContextualTips = () => {
    const sqlLogs = state.logs.filter(log => log.type === 'sql')
    const recentErrors = state.logs.filter(log => log.type === 'error' && 
      Date.now() - log.timestamp.getTime() < 30000) // Últimos 30 segundos

    if (recentErrors.length > 0) {
      addLog('tip', '🔧 DICA: Erros recentes detectados! Verifique a sintaxe do Prisma Client e se o schema está atualizado.', 'contextual')
    }

    if (sqlLogs.length > 0) {
      const hasUnsafeQueries = sqlLogs.some(log => 
        log.sqlQuery?.includes('SELECT') && !log.sqlQuery?.includes('LIMIT'))
      
      if (hasUnsafeQueries) {
        addLog('tip', '⚠️ DICA: Detectadas queries sem LIMIT. Use "take" para limitar resultados e melhorar performance.', 'contextual')
      }
    }

    const successRate = state.queryHistory.length > 0 ? 
      (state.queryHistory.filter(q => q.success).length / state.queryHistory.length) * 100 : 100

    if (successRate < 70 && state.queryHistory.length >= 3) {
      addLog('tip', '📚 DICA: Taxa de sucesso baixa detectada. Consulte a documentação do Prisma ou use os exemplos educacionais.', 'contextual')
    }
  }

  // Monitorar atividade para dicas contextuais
  useEffect(() => {
    const interval = setInterval(addContextualTips, 45000) // A cada 45 segundos
    return () => clearInterval(interval)
  }, [state.logs, state.queryHistory])

  // Atalhos de teclado para melhorar produtividade
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+M: Migrar
      if (e.ctrlKey && e.key === 'm' && !state.isLoading && state.sessionId) {
        e.preventDefault()
        handleMigrate()
        addLog('info', '⌨️ Atalho usado: Ctrl+M - Migração iniciada', 'keyboard')
      }
      
      // Ctrl+G: Gerar Client
      if (e.ctrlKey && e.key === 'g' && !state.isLoading && state.sessionId && !state.needsMigration) {
        e.preventDefault()
        handleGenerate()
        addLog('info', '⌨️ Atalho usado: Ctrl+G - Geração do client iniciada', 'keyboard')
      }
      
      // Ctrl+Enter: Executar Query
      if (e.ctrlKey && e.key === 'Enter' && !state.isLoading && state.sessionId && !state.needsMigration) {
        e.preventDefault()
        handleExecuteQuery()
        addLog('info', '⌨️ Atalho usado: Ctrl+Enter - Query executada', 'keyboard')
      }
      
      // Ctrl+L: Limpar Logs
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        setState(prev => ({ ...prev, logs: [] }))
        addLog('info', '⌨️ Atalho usado: Ctrl+L - Logs limpos', 'keyboard')
      }
      
      // Ctrl+1, 2, 3: Alternar painéis (mobile)
      if (e.ctrlKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        const panels = ['schema', 'logs', 'query'] as const
        const panelIndex = parseInt(e.key) - 1
        setState(prev => ({ ...prev, activePanel: panels[panelIndex] }))
        addLog('info', `⌨️ Atalho usado: Ctrl+${e.key} - Painel ${panels[panelIndex]} ativado`, 'keyboard')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isLoading, state.sessionId, state.needsMigration])

  // Função para salvar query no histórico
  const saveToHistory = (query: string, success: boolean) => {
    setState(prev => ({
      ...prev,
      queryHistory: [
        { query, timestamp: new Date(), success },
        ...prev.queryHistory.slice(0, 9) // Manter apenas os últimos 10
      ]
    }))
  }

  // Função para exportar logs
  const exportLogs = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      logs: state.logs,
      queryHistory: state.queryHistory,
      sessionId: state.sessionId
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prisma-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    addLog('success', 'Logs exportados com sucesso!', 'EXPORT')
  }

  // Função para importar query do histórico
  const loadFromHistory = (query: string) => {
    setState(prev => ({ ...prev, query }))
    addLog('info', 'Query carregada do histórico', 'HISTORY')
  }

  // Função para gerar sugestões inteligentes de queries
  const generateSmartSuggestions = () => {
    const suggestions = []
    
    // Sugestões baseadas no status
    if (!state.lastMigratedSchema) {
      suggestions.push({
        title: "🚀 Comece criando um usuário",
        query: `// ✨ Criar seu primeiro usuário
const novoUsuario = await prisma.user.create({
  data: {
    name: "João Silva",
    email: "joao@exemplo.com",
    bio: "Desenvolvedor apaixonado por Prisma ORM"
  }
})

console.log(novoUsuario)`
      })
    }
    
    if (state.lastMigratedSchema && !state.logs.some(log => log.operation === 'query' && log.type === 'success')) {
      suggestions.push({
        title: "📊 Explore os dados existentes",
        query: `// 🔍 Buscar todos os usuários
const usuarios = await prisma.user.findMany({
  include: {
    profile: true,
    posts: true
  }
})

console.log(usuarios)`
      })
    }
    
    if (state.logs.some(log => log.type === 'sql' && log.sqlQuery?.includes('SELECT'))) {
      suggestions.push({
        title: "⚡ Otimize suas consultas",
        query: `// 🎯 Query otimizada com paginação
const postsOtimizados = await prisma.post.findMany({
  take: 10, // Limitar resultados
  skip: 0,  // Paginação
  select: { // Selecionar apenas campos necessários
    id: true,
    title: true,
    createdAt: true,
    author: {
      select: {
        name: true,
        email: true
      }
    }
  },
  orderBy: {
    createdAt: 'desc'
  }
})

console.log(postsOtimizados)`
      })
    }
    
    return suggestions
  }

  // Função para detectar qual query está ativa
  const detectActiveQuery = () => {
    const lines = state.query.split('\n')
    let activeQueryName = ''
    
    // Procurar por console.log descomentado
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine.startsWith('//') && trimmedLine.includes('console.log(') && trimmedLine.includes(')')) {
        const match = trimmedLine.match(/console\.log\((\w+)\)/)
        if (match) {
          activeQueryName = match[1]
          break
        }
      }
    }
    
    // Se não encontrou console.log ativo, procurar pela primeira const
    if (!activeQueryName) {
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine.startsWith('//') && trimmedLine.includes('const ') && trimmedLine.includes('await prisma')) {
          const match = trimmedLine.match(/const\s+(\w+)\s*=/)
          if (match) {
            activeQueryName = match[1]
            break
          }
        }
      }
    }
    
    return activeQueryName
  }

  return (
    <>
      <Head>
        <title>Prisma Playground Interativo</title>
        <meta name="description" content="Playground interativo para aprender Prisma ORM" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation */}      <nav style={{ 
        backgroundColor: '#2d2d30', 
        padding: '1rem 2rem',
        borderBottom: '1px solid #3e3e42',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <h1 style={{ margin: 0, color: '#ffffff', fontSize: '1.5rem' }}>
              🚀 Prisma Playground
            </h1>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/" style={{ 
                color: '#ffffff', 
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                backgroundColor: '#007acc',
                transition: 'background-color 0.2s'
              }}>
                Playground
              </Link>
              <Link href="/tutorial" style={{ 
                color: '#cccccc', 
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                backgroundColor: '#404040',
                transition: 'background-color 0.2s'
              }}>
                Tutorial
              </Link>
              <Link href="/exemplos" style={{ 
                color: '#cccccc', 
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                backgroundColor: '#404040',
                transition: 'background-color 0.2s'
              }}>
                Exemplos
              </Link>
            </div>
          </div>
            {/* Session Info moved to navigation */}
          <div style={{ color: '#ffffff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Status da Aplicação */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className={`status-indicator ${state.sessionId ? 'connected' : 'connecting'}`}></div>
              <span style={{ fontSize: '0.8rem' }}>
                {state.sessionId ? 'Conectado' : 'Conectando...'}
              </span>
            </div>
            
            {/* Info da Sessão */}
            {state.sessionId ? (
              <span style={{ 
                backgroundColor: '#007acc', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '12px',
                fontSize: '0.8rem'
              }}>
                Sessão: {state.sessionId.slice(0, 8)}...
              </span>
            ) : (
              <span style={{ color: '#cccccc' }}>Inicializando...</span>
            )}
          </div></div>
      </nav>

      {/* Status Flow Indicator */}
      <div className="status-flow">
        <div className="flow-step">
          <div className={`step-circle ${state.sessionId ? 'completed' : 'pending'}`}>
            {state.sessionId ? '✓' : '1'}
          </div>
          <span className="step-label">Sessão</span>
        </div>
        
        <div className="flow-arrow">→</div>
        
        <div className="flow-step">
          <div className={`step-circle ${!state.needsMigration && state.lastMigratedSchema ? 'completed' : state.needsMigration ? 'warning' : 'pending'}`}>
            {!state.needsMigration && state.lastMigratedSchema ? '✓' : state.needsMigration ? '!' : '2'}
          </div>
          <span className="step-label">Migrate</span>
        </div>
        
        <div className="flow-arrow">→</div>
          <div className="flow-step">
          <div className={`step-circle ${state.clientGenerated ? 'completed' : 'pending'}`}>
            {state.clientGenerated ? '✓' : '3'}
          </div>
          <span className="step-label">Generate</span>
        </div>
        
        <div className="flow-arrow">→</div>
        
        <div className="flow-step">
          <div className={`step-circle pending`}>
            4
          </div>
          <span className="step-label">Query</span>
        </div>      </div>

      {/* Navegação por Abas (Mobile) */}
      <div className="mobile-tabs">
        <button 
          className={`tab-btn ${state.activePanel === 'schema' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activePanel: 'schema' }))}
        >
          📋 Schema
        </button>
        <button 
          className={`tab-btn ${state.activePanel === 'logs' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activePanel: 'logs' }))}
        >
          📄 Logs
        </button>
        <button 
          className={`tab-btn ${state.activePanel === 'query' ? 'active' : ''}`}
          onClick={() => setState(prev => ({ ...prev, activePanel: 'query' }))}
        >
          💻 Query
        </button>
      </div>

      <div className="playground-container">
        {/* Main Content - 3 Panels */}        <main className="playground-main">
          {/* Painel Esquerdo - Schema Editor */}
          <div className={`panel schema-panel ${state.activePanel === 'schema' ? 'active' : ''}`}>
            <div className="panel-header">
              <h3>📋 Prisma Schema</h3>
            </div>
            <div className="editor-container">
              <MonacoEditor
                height="100%"
                language="prisma"
                value={state.schema}                onChange={(value) => {
                  const newSchema = value || ''
                  setState(prev => ({ 
                    ...prev, 
                    schema: newSchema,
                    needsMigration: newSchema !== prev.lastMigratedSchema && prev.lastMigratedSchema !== '',
                    clientGenerated: newSchema === prev.lastMigratedSchema ? prev.clientGenerated : false // Invalida client se schema mudou
                  }))
                }}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </div>
          </div>          {/* Painel Central - Actions & Logs */}
          <div className={`panel actions-panel ${state.activePanel === 'logs' ? 'active' : ''}`}>
            <div className="panel-header">
              <h3>⚡ Ações & Logs</h3>
            </div>
              <div className="actions">              
              {/* Toggle para Schema Público/Privado */}
              <div className="schema-mode-toggle">
                <label>
                  <input 
                    type="checkbox" 
                    checked={state.usePublicSchema}
                    onChange={(e) => setState(prev => ({ ...prev, usePublicSchema: e.target.checked }))}
                  />
                  <span className="toggle-text">
                    {state.usePublicSchema ? '🌐 Schema Público (Supabase)' : '🔒 Schema Isolado (Sandbox)'}
                  </span>
                </label>
                <small className="schema-explanation">
                  {state.usePublicSchema 
                    ? 'Os dados aparecerão no seu dashboard do Supabase' 
                    : 'Dados isolados por sessão (não afeta o banco principal)'}
                </small>
              </div>

              <button 
                className={`action-btn migrate-btn ${state.needsMigration ? 'needs-migration' : ''}`}
                onClick={handleMigrate}
                disabled={state.isLoading || !state.sessionId}
                title={state.needsMigration ? 'Schema alterado - migração necessária' : 'Migrar schema para o banco de dados'}
              >
                {state.needsMigration ? '🔥 Migrar Schema (Necessário)' : '🔄 Migrar Schema'}
              </button>
                <button 
                className="action-btn generate-btn"
                onClick={handleGenerate}
                disabled={state.isLoading || !state.sessionId || state.needsMigration}
                title={state.needsMigration ? 'Execute a migração primeiro' : 'Gerar cliente Prisma'}              >
                ⚙️ Gerar Client {state.needsMigration ? '(Requer Migração)' : ''}
              </button>
            </div>

            {/* Seção de Exemplos Educacionais */}
            <div className="examples-section">
              <div className="examples-header">
                <h4>📚 Exemplos Educacionais</h4>
              </div>
              <div className="examples-grid">
                <button 
                  className="example-btn example-basic"
                  onClick={() => loadExample('basic')}
                  title="Operações básicas CRUD"
                >
                  🎯 Básico
                </button>
                <button 
                  className="example-btn example-relations"
                  onClick={() => loadExample('relations')}
                  title="Relacionamentos entre modelos"
                >
                  🔗 Relacionamentos
                </button>
                <button 
                  className="example-btn example-advanced"
                  onClick={() => loadExample('advanced')}
                  title="Queries avançadas e agregações"
                >
                  🚀 Avançado
                </button>
                <button 
                  className="example-btn example-transactions"
                  onClick={() => loadExample('transactions')}
                  title="Transações e operações atômicas"
                >
                  💰 Transações
                </button>
              </div>
              
              {/* Histórico de Queries */}
              {state.queryHistory.length > 0 && (
                <div className="history-section">
                  <div className="history-header">
                    <h5>🕐 Histórico de Queries</h5>
                    <span className="history-count">({state.queryHistory.length})</span>
                  </div>
                  <div className="history-list">
                    {state.queryHistory.slice(0, 5).map((item, index) => (
                      <div 
                        key={index} 
                        className={`history-item ${item.success ? 'success' : 'error'}`}
                        onClick={() => loadFromHistory(item.query)}
                        title="Clique para carregar esta query"
                      >
                        <div className="history-icon">
                          {item.success ? '✅' : '❌'}
                        </div>
                        <div className="history-content">
                          <div className="history-preview">
                            {item.query.split('\n')[0].substring(0, 40)}...
                          </div>
                          <div className="history-time">
                            {item.timestamp.toLocaleTimeString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div><div className="logs-container">
              <div className="logs-header">
                <div className="logs-title">
                  <span>📄 Logs do Sistema</span>
                  <span className="logs-count">({state.logs.length})</span>
                </div>                <div className="logs-controls">
                  <button 
                    className="optimization-btn"
                    onClick={generateOptimizationTips}
                    title="Analisar logs e gerar dicas de otimização"
                  >
                    🧠 Dicas
                  </button>
                  <button 
                    className="export-btn"
                    onClick={exportLogs}
                    title="Exportar logs e histórico para arquivo JSON"
                  >
                    📥 Exportar
                  </button>
                  <select 
                    value={state.logsFilter} 
                    onChange={(e) => setState(prev => ({ ...prev, logsFilter: e.target.value as any }))}
                    className="logs-filter"
                  >
                    <option value="all">🔍 Todos</option>
                    <option value="success">✅ Sucesso</option>
                    <option value="error">❌ Erros</option>
                    <option value="warning">⚠️ Avisos</option>
                    <option value="info">ℹ️ Info</option>
                    <option value="sql">🗃️ SQL</option>
                    <option value="explain">🎓 Explicações</option>
                    <option value="tip">💡 Dicas</option>
                    <option value="performance">⚡ Performance</option>
                  </select>
                  <button 
                    className={`auto-scroll-btn ${state.autoScroll ? 'active' : ''}`}
                    onClick={() => setState(prev => ({ ...prev, autoScroll: !prev.autoScroll }))}
                    title="Auto-scroll"
                  >
                    📜
                  </button>
                  <button 
                    className="clear-logs"
                    onClick={() => setState(prev => ({ ...prev, logs: [] }))}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="logs">                {state.logs
                  .filter(log => state.logsFilter === 'all' || log.type === state.logsFilter)
                  .map((log) => (
                    <div key={log.id} className={`log-entry log-${log.type}`}>
                      <div className="log-header">
                        <div className="log-icon">
                          {log.type === 'success' && '✅'}
                          {log.type === 'error' && '❌'}
                          {log.type === 'warning' && '⚠️'}
                          {log.type === 'info' && 'ℹ️'}
                          {log.type === 'sql' && '🗃️'}
                          {log.type === 'explain' && '🎓'}
                          {log.type === 'tip' && '💡'}
                          {log.type === 'performance' && '⚡'}
                        </div>
                        <span className="log-time">
                          {log.timestamp.toLocaleTimeString('pt-BR')}
                        </span>
                        {log.operation && (
                          <span className="log-operation">{log.operation}</span>
                        )}
                        {log.duration && (
                          <span className="log-duration">{log.duration}ms</span>
                        )}
                      </div>
                      <div className="log-message">{log.message}</div>
                      
                      {/* Explanação educacional */}
                      {log.explanation && (
                        <div className="log-explanation">
                          <strong>💭 Explicação:</strong> {log.explanation}
                        </div>
                      )}
                        {/* Query SQL formatada */}
                      {log.sqlQuery && (
                        <details className="log-sql">
                          <summary>
                            🗃️ Query SQL
                            {log.sqlQuery.toLowerCase().includes('select') && !log.sqlQuery.toLowerCase().includes('limit') && (
                              <span className="sql-warning">⚠️ Sem LIMIT</span>
                            )}
                            {log.duration && log.duration > 1000 && (
                              <span className="sql-slow">🐌 Lenta</span>
                            )}
                          </summary>
                          <pre className="sql-code">{log.sqlQuery}</pre>
                          {log.sqlQuery.toLowerCase().includes('select') && !log.sqlQuery.toLowerCase().includes('limit') && (
                            <div className="sql-suggestion">
                              💡 <strong>Sugestão:</strong> Considere adicionar LIMIT para evitar carregar muitos dados
                            </div>
                          )}
                        </details>
                      )}
                      
                      {/* Detalhes técnicos */}
                      {log.details && (
                        <details className="log-details">
                          <summary>🔍 Detalhes Técnicos</summary>
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </details>
                      )}
                      
                      {/* Informações de performance */}
                      {log.affectedRows && (
                        <div className="log-stats">
                          📊 Linhas afetadas: {log.affectedRows}
                        </div>
                      )}
                    </div>
                  ))}
                {state.logs.length === 0 && (
                  <div className="log-entry placeholder">
                    <div className="log-message">Logs aparecerão aqui...</div>
                  </div>
                )}
              </div>
            </div>
          </div>          {/* Painel Direito - Query Editor & Results */}
          <div className={`panel query-panel ${state.activePanel === 'query' ? 'active' : ''}`}>
            <div className="panel-header">
              <h3>💻 Prisma Client</h3>
            </div>
            
            <div className="query-editor">
              <MonacoEditor
                height="200px"
                language="typescript"
                value={state.query}
                onChange={(value) => setState(prev => ({ ...prev, query: value || '' }))}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </div>            <div className="query-actions">
              {/* Indicador de Query Ativa */}
              {detectActiveQuery() && (
                <div className="active-query-indicator">
                  🎯 Query Ativa: <code>{detectActiveQuery()}</code>
                  <span className="indicator-tip">Esta query será executada</span>
                </div>
              )}
              
              <button 
                className="action-btn execute-btn"
                onClick={handleExecuteQuery}
                disabled={state.isLoading || !state.sessionId || state.needsMigration}
                title={state.needsMigration ? 'Execute a migração primeiro' : 'Executar query Prisma'}
              >
                ▶️ Executar Query {state.needsMigration ? '(Requer Migração)' : ''}
              </button>
              
              {/* Sugestões Inteligentes */}
              {generateSmartSuggestions().length > 0 && (
                <div className="smart-suggestions">
                  <h5>💡 Sugestões para Você</h5>
                  {generateSmartSuggestions().map((suggestion, index) => (
                    <button
                      key={index}
                      className="suggestion-btn"
                      onClick={() => {
                        setState(prev => ({ ...prev, query: suggestion.query }))
                        addLog('info', `💡 Sugestão carregada: ${suggestion.title}`, 'suggestion')
                      }}
                      title="Clique para usar esta sugestão"
                    >
                      {suggestion.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="results-container">
              <div className="results-header">
                <span>📊 Resultado</span>
              </div>
              <div className="results">
                <pre>
                  {state.queryResult ? 
                    JSON.stringify(state.queryResult, null, 2) : 
                    'Resultado aparecerá aqui...'
                  }
                </pre>
              </div>
            </div>
          </div>
        </main>

        {/* Loading Overlay */}
        {state.isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <span>Processando...</span>
            </div>
          </div>
        )}
      </div>      <style jsx>{`
        /* Reset global */
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .playground-container {
          height: calc(100vh - 120px); /* Ajusta para navegação e status flow */
          display: flex;
          flex-direction: column;
          background: #1e1e1e;
          color: #ffffff;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }        .status-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 2rem;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
          gap: 1rem;
        }

        /* Indicador de Status */
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-indicator.connecting {
          background: #ff9800;
          animation: pulse-orange 2s infinite;
        }

        .status-indicator.connected {
          background: #4caf50;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
        }

        @keyframes pulse-orange {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(255, 152, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 152, 0, 0);
          }
        }

        .flow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .step-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .step-circle.pending {
          background: #3e3e42;
          color: #888;
          border: 2px solid #555;
        }

        .step-circle.completed {
          background: #16825d;
          color: white;
          border: 2px solid #1a9968;
          box-shadow: 0 0 8px rgba(26, 153, 104, 0.4);
        }

        .step-circle.warning {
          background: #ff6b6b;
          color: white;
          border: 2px solid #ff5252;
          animation: pulse-warning 2s infinite;
        }

        @keyframes pulse-warning {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(255, 107, 107, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
          }
        }

        .step-label {
          font-size: 12px;
          color: #cccccc;
          font-weight: 500;
        }        .flow-arrow {
          color: #666;
          font-size: 18px;
          margin: 0 0.5rem;
        }

        /* Navegação por Abas Mobile */
        .mobile-tabs {
          display: none;
          background: #2d2d30;
          border-bottom: 1px solid #3e3e42;
          padding: 0;
        }

        .tab-btn {
          flex: 1;
          background: none;
          border: none;
          color: #cccccc;
          padding: 0.75rem 1rem;
          cursor: pointer;
          font-size: 0.9rem;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          background: #3e3e42;
          color: #ffffff;
        }

        .tab-btn.active {
          color: #569cd6;
          border-bottom-color: #569cd6;
          background: #3e3e42;
        }.playground-main {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(300px, 1fr) minmax(350px, 400px) minmax(300px, 1fr);
          gap: 1px;
          background: #3e3e42;
          min-height: 0; /* Permite que os painéis sejam scroll */
          overflow: hidden;
        }        .panel {
          background: #1e1e1e;
          display: flex;
          flex-direction: column;
          min-height: 0; /* Permite que o painel seja scroll */
          overflow: hidden;
        }

        .panel-header {
          background: #2d2d30;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #3e3e42;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #cccccc;
        }

        .editor-container {
          flex: 1;
          min-height: 0;        }        .actions {
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        /* Toggle para Schema Público/Privado */
        .schema-mode-toggle {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .schema-mode-toggle label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          margin: 0;
        }

        .schema-mode-toggle input[type="checkbox"] {
          accent-color: #0e639c;
        }

        .toggle-text {
          font-size: 0.85rem;
          font-weight: 500;
          color: #495057;
        }

        .schema-explanation {
          display: block;
          font-size: 0.75rem;
          color: #6c757d;
          margin-top: 0.25rem;
          line-height: 1.3;
        }.action-btn {
          background: #0e639c;
          color: white;
          border: none;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: background-color 0.2s;
        }

        .action-btn:hover:not(:disabled) {
          background: #1177bb;
        }

        .action-btn:disabled {
          background: #555;
          cursor: not-allowed;
        }

        .migrate-btn {
          background: #16825d;
        }        .migrate-btn:hover:not(:disabled) {
          background: #1a9968;
        }

        .needs-migration {
          background: #ff6b6b !important;
          animation: pulse 2s infinite;
          box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
        }

        .needs-migration:hover:not(:disabled) {
          background: #ff5252 !important;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
          }
        }

        .generate-btn {
          background: #c586c0;
        }

        .generate-btn:hover:not(:disabled) {
          background: #d19ad1;
        }

        .execute-btn {
          background: #dcdcaa;
          color: #1e1e1e;
        }

        .execute-btn:hover:not(:disabled) {
          background: #e6e6bb;
        }        /* Seção de Exemplos Educacionais - Compacta */
        .examples-section {
          margin-top: 0.75rem;
          border-top: 1px solid #3e3e42;
          padding-top: 0.75rem;
        }

        .examples-header {
          padding: 0 1rem;
          margin-bottom: 0.5rem;
        }

        .examples-header h4 {
          margin: 0;
          font-size: 0.8rem;
          color: #cccccc;
          font-weight: 600;
        }        .examples-grid {
          padding: 0 1rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.4rem;
        }.example-btn {
          background: #2d2d30;
          color: #cccccc;
          border: 1px solid #3e3e42;
          padding: 0.4rem 0.6rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s ease;
          text-align: center;
          font-weight: 500;
        }

        .example-btn:hover {
          background: #3e3e42;
          border-color: #569cd6;
          transform: translateY(-1px);
        }

        .example-basic:hover {
          border-color: #4caf50;
          color: #81c784;
        }

        .example-relations:hover {
          border-color: #2196f3;
          color: #64b5f6;
        }

        .example-advanced:hover {
          border-color: #ff9800;
          color: #ffb74d;
        }

        .example-transactions:hover {
          border-color: #9c27b0;
          color: #ba68c8;
        }

        .logs-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background: #2d2d30;
          font-size: 0.9rem;
          border-bottom: 1px solid #3e3e42;
        }

        .logs-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logs-count {
          background: #007acc;
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: bold;
        }        .logs-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Container principal dos logs com scroll */
        .logs {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 0.5rem;
          background: #1e1e1e;
          scrollbar-width: thin;
          scrollbar-color: #569cd6 #2d2d30;
        }

        .logs::-webkit-scrollbar {
          width: 8px;
        }

        .logs::-webkit-scrollbar-track {
          background: #2d2d30;
          border-radius: 4px;
        }

        .logs::-webkit-scrollbar-thumb {
          background: #569cd6;
          border-radius: 4px;
        }

        .logs::-webkit-scrollbar-thumb:hover {
          background: #6ba3e0;
        }

        .optimization-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .optimization-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .export-btn {
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }        .export-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          background: linear-gradient(135deg, #45a049 0%, #4caf50 100%);
        }

        /* Estilos dos Log Entries */
        .log-entry {
          margin-bottom: 0.75rem;
          padding: 0.75rem;
          background: #2d2d30;
          border-radius: 6px;
          border-left: 3px solid #569cd6;
          transition: all 0.2s ease;
        }

        .log-entry:hover {
          background: #333336;
          transform: translateX(2px);
        }

        .log-entry.log-success {
          border-left-color: #4caf50;
        }

        .log-entry.log-error {
          border-left-color: #f44336;
        }

        .log-entry.log-warning {
          border-left-color: #ff9800;
        }

        .log-entry.log-info {
          border-left-color: #2196f3;
        }

        .log-entry.log-sql {
          border-left-color: #9c27b0;
        }

        .log-entry.log-explain {
          border-left-color: #ffd700;
        }

        .log-entry.log-tip {
          border-left-color: #00bcd4;
        }

        .log-entry.log-performance {
          border-left-color: #ff5722;
        }

        .log-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
        }

        .log-icon {
          font-size: 1rem;
        }

        .log-time {
          color: #888;
          font-size: 0.7rem;
        }

        .log-operation {
          background: #007acc;
          color: white;
          padding: 0.1rem 0.4rem;
          border-radius: 3px;
          font-size: 0.65rem;
          font-weight: bold;
        }

        .log-duration {
          background: #ff9800;
          color: white;
          padding: 0.1rem 0.4rem;
          border-radius: 3px;
          font-size: 0.65rem;
          font-weight: bold;
        }

        .log-message {
          font-size: 0.85rem;
          line-height: 1.4;
          color: #cccccc;
          word-wrap: break-word;
        }

        .log-explanation {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(255, 215, 0, 0.1);
          border-radius: 4px;
          border-left: 3px solid #ffd700;
          font-size: 0.8rem;
          color: #ffd700;
        }

        .log-details {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #1a1a1a;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.75rem;
          color: #569cd6;
          overflow-x: auto;
        }

        .log-sql {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(156, 39, 176, 0.1);
          border-radius: 4px;
          border-left: 3px solid #9c27b0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.75rem;
          color: #ba68c8;
          overflow-x: auto;
        }        /* Estilos do Histórico de Queries - Expandido */
        .history-section {
          margin-top: 0.75rem;
          background: #2a2a2a;
          border-radius: 6px;
          overflow: hidden;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0.75rem;
          background: #333;
          border-bottom: 1px solid #3e3e42;
        }

        .history-header h5 {
          margin: 0;
          font-size: 0.8rem;
          color: #cccccc;
          font-weight: 600;
        }

        .history-count {
          background: #007acc;
          color: white;
          padding: 0.15rem 0.4rem;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: bold;
        }

        .history-list {
          max-height: 180px;
          overflow-y: auto;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid #3e3e42;
        }

        .history-item:hover {
          background: #3a3a3a;
          transform: translateX(2px);
        }

        .history-item:last-child {
          border-bottom: none;
        }

        .history-item.success {
          border-left: 3px solid #4caf50;
        }

        .history-item.error {
          border-left: 3px solid #f44336;
        }

        .history-icon {
          font-size: 0.8rem;
        }

        .history-content {
                   flex: 1;
          min-width: 0;
        }

        .history-preview {
          font-size: 0.7rem;
          color: #cccccc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .history-time {
          font-size: 0.6rem;
          color: #888;
          margin-top: 0.1rem;
        }

        /* Estilos das Sugestões Inteligentes */
        .smart-suggestions {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 8px;
          border: 1px solid #3e3e42;
        }

        .smart-suggestions h5 {
          margin: 0 0 0.5rem 0;
          font-size: 0.8rem;
          color: #ffd700;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .suggestion-btn {
          display: block;
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.25rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.75rem;
          text-align: left;
          transition: all 0.2s ease;
        }

        .suggestion-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
          background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .suggestion-btn:last-child {
          margin-bottom: 0;
        }

        /* Indicador de Query Ativa */
        .active-query-indicator {
          background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #569cd6;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          animation: subtle-pulse 3s ease-in-out infinite;
        }

        .active-query-indicator code {
          background: rgba(255, 255, 255, 0.15);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-weight: bold;
          color: #ffcc02;
        }

        .indicator-tip {
          margin-left: auto;
          font-size: 0.75rem;
          opacity: 0.8;
          font-style: italic;
        }

        @keyframes subtle-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(0, 122, 204, 0.3);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(0, 122, 204, 0.1);
          }
        }

        /* ...existing code... */
      `}</style>
    </>
  )
}
