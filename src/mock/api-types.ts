/**
 * Tipos para APIs
 * 
 * Definição de tipos compartilhados entre as APIs reais e simuladas
 */

// API Session
export interface SessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

// API Query
export interface QueryResponse {
  success: boolean;
  result?: any;
  error?: string;
  logs?: string[];
}

// API Health
export interface HealthCheck {
  status: 'ok' | 'error';
  message: string;
  details?: any;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    supabase: HealthCheck;
    database: HealthCheck;
    cache: HealthCheck;
    config: HealthCheck;
  };
  metadata: {
    environment: string;
    uptime: number;
    version: string;
  };
}

// API Migrate
export interface MigrateResponse {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
  logs?: string[];
}
