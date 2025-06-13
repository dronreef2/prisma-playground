/**
 * Configuração para ambientes de hospedagem
 * 
 * Este arquivo contém configurações específicas para detecção de ambiente
 * e adaptação do comportamento do aplicativo em diferentes plataformas.
 */

// Detecção de GitHub Pages
export const isGitHubPages = () => {
  if (typeof window === 'undefined') return false;
  
  // Verifica se a URL atual é de GitHub Pages
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  
  return (
    // Subdomínio github.io
    hostname.endsWith('github.io') || 
    // Nome do repositório na URL (quando hospedado com basePath)
    pathname.startsWith('/PrismaORM')
  );
};

// Retorna a URL base para as APIs, dependendo do ambiente
export const getApiBaseUrl = () => {
  if (isGitHubPages()) {
    // No GitHub Pages, usamos dados simulados, então retornamos um stub
    return '/api-stub';
  }
  
  // Em ambiente de desenvolvimento ou Vercel, usamos as APIs reais
  return '/api';
};

// Configuração para base path no GitHub Pages
export const getBasePath = () => {
  if (isGitHubPages()) {
    return '/PrismaORM'; // Substitua pelo nome do seu repositório
  }
  return '';
};

// Função para verificar se APIs do servidor estão disponíveis
export const areServerApisAvailable = () => {
  return !isGitHubPages();
};
