/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuração para resolver problemas de cache no Windows
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Desabilita o cache persistente no desenvolvimento para evitar problemas de permissão
      config.cache = false
    }
    return config
  },
  // Configuração para GitHub Pages
  basePath: process.env.GITHUB_ACTIONS ? '/PrismaORM' : '', // Substitua 'PrismaORM' pelo nome do seu repositório
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Desabilitar output: 'export' se for usar Vercel, apenas para GitHub Pages
  output: process.env.GITHUB_ACTIONS ? 'export' : undefined,
}

module.exports = nextConfig
