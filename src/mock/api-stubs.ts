/**
 * API Stubs para GitHub Pages
 * 
 * Este arquivo fornece implementações simuladas das APIs para ambientes
 * onde as APIs do servidor não estão disponíveis (como GitHub Pages)
 */

import { SessionResponse, QueryResponse, HealthResponse, MigrateResponse } from './api-types';

// Dados simulados
const MOCK_SESSION_ID = 'playground_static_session';
const MOCK_SUCCESSFUL_QUERY_RESULT = { id: 1, name: 'John Doe', email: 'john@example.com' };

// API Session simulada
export async function mockSessionAPI(): Promise<SessionResponse> {
  console.log('[Mock API] Simulando criação de sessão');
  
  return {
    success: true,
    sessionId: MOCK_SESSION_ID
  };
}

// API Query simulada
export async function mockQueryAPI(query: string): Promise<QueryResponse> {
  console.log('[Mock API] Simulando query:', query);
  
  // Simples extração de modelo da query
  const modelMatch = query.match(/prisma\.(\w+)/);
  const model = modelMatch ? modelMatch[1] : 'user';
  
  // Resultados diferentes baseados no modelo
  const mockResults: Record<string, any> = {
    user: [{ id: 1, name: 'John Doe', email: 'john@example.com' }],
    post: [{ id: 1, title: 'Hello World', content: 'This is a test post', authorId: 1 }],
    profile: [{ id: 1, bio: 'I am a mock user', userId: 1 }],
    comment: [{ id: 1, text: 'Nice post!', postId: 1, authorId: 1 }],
    category: [{ id: 1, name: 'Technology' }],
    tag: [{ id: 1, name: 'Next.js' }]
  };
  
  // Gera logs simulados para propósitos educacionais
  const mockLogs = [
    `prisma:query SELECT * FROM "${model}" WHERE 1=1 LIMIT 5`,
    `✅ Query executada com sucesso em ${model}`,
    `⚡ Tempo de execução simulado: 42ms`
  ];
  
  return {
    success: true,
    result: mockResults[model] || [{ message: 'Mock data for demo purposes only' }],
    logs: mockLogs
  };
}

// API Health simulada
export async function mockHealthAPI(): Promise<HealthResponse> {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      supabase: { status: 'ok', message: 'Simulado' },
      database: { status: 'ok', message: 'Simulado' },
      cache: { status: 'ok', message: 'Simulado' },
      config: { status: 'ok', message: 'Simulado' }
    },
    metadata: {
      environment: 'github-pages',
      uptime: 0,
      version: '1.0.0'
    }
  };
}

// API Migrate simulada
export async function mockMigrateAPI(): Promise<MigrateResponse> {
  // Gera logs simulados para propósitos educacionais
  const mockLogs = [
    `prisma:info Analisando schema Prisma...`,
    `prisma:query CREATE TABLE "users" ("id" SERIAL PRIMARY KEY, "email" TEXT UNIQUE, "name" TEXT, "bio" TEXT)`,
    `prisma:query CREATE TABLE "posts" ("id" SERIAL PRIMARY KEY, "title" TEXT, "content" TEXT, "published" BOOLEAN DEFAULT false)`,
    `✅ Migração concluída com sucesso`,
    `⚡ Tempo de execução simulado: 2.3s`
  ];
  
  return {
    success: true,
    message: 'Migração simulada para demonstração',
    details: {
      tablesCreated: ['User', 'Post', 'Profile', 'Comment', 'Category', 'Tag', 'PostTag'],
      duration: 0
    },
    logs: mockLogs
  };
}
