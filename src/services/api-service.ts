/**
 * Serviços de API com fallback para ambiente estático
 * 
 * Este arquivo fornece uma camada de abstração para chamadas de API,
 * com fallback para implementações simuladas quando as APIs do servidor
 * não estão disponíveis (como no GitHub Pages).
 */

import { areServerApisAvailable, getApiBaseUrl } from "../config/environment";
import { mockHealthAPI, mockMigrateAPI, mockQueryAPI, mockSessionAPI } from "../mock/api-stubs";
import { HealthResponse, MigrateResponse, QueryResponse, SessionResponse } from "../mock/api-types";

// Service para API Session
export async function createSession(): Promise<SessionResponse> {
  if (!areServerApisAvailable()) {
    return mockSessionAPI();
  }
  
  try {
    const response = await fetch(`${getApiBaseUrl()}/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao conectar com a API' 
    };
  }
}

// Service para API Query
export async function executeQuery(
  sessionId: string, 
  query: string
): Promise<QueryResponse> {
  if (!areServerApisAvailable()) {
    return mockQueryAPI(query);
  }
  
  try {
    const response = await fetch(`${getApiBaseUrl()}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        query
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao executar query:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao conectar com a API' 
    };
  }
}

// Service para API Health
export async function checkHealth(): Promise<HealthResponse> {
  if (!areServerApisAvailable()) {
    return mockHealthAPI();
  }
  
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`);
    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar saúde:', error);
    return mockHealthAPI(); // Fallback para o mock mesmo em ambiente real em caso de erro
  }
}

// Service para API Migrate
export async function runMigration(
  sessionId: string,
  schema: string
): Promise<MigrateResponse> {
  if (!areServerApisAvailable()) {
    return mockMigrateAPI();
  }
  
  try {
    const response = await fetch(`${getApiBaseUrl()}/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        schema
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    return { 
      success: false, 
      message: 'Erro na migração',
      error: error instanceof Error ? error.message : 'Erro ao conectar com a API' 
    };
  }
}

// Service para API Generate
export async function generateClient(
  sessionId: string
): Promise<MigrateResponse> {
  if (!areServerApisAvailable()) {
    // Reusamos o mockMigrateAPI mas poderíamos criar um mockGenerateAPI específico
    return {
      ...mockMigrateAPI(),
      message: 'Geração de cliente simulada para demonstração',
      logs: [
        'prisma:info Gerando cliente Prisma...',
        'prisma:info Analisando schema...',
        '✅ Prisma Client gerado com sucesso',
        '⚡ Tempo de execução simulado: 1.2s'
      ]
    };
  }
  
  try {
    const response = await fetch(`${getApiBaseUrl()}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao gerar cliente:', error);
    return { 
      success: false, 
      message: 'Erro na geração do cliente',
      error: error instanceof Error ? error.message : 'Erro ao conectar com a API' 
    };
  }
}
