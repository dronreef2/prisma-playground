# Prisma Playground - Interface Educacional

Um playground interativo para aprender e experimentar com Prisma ORM, especialmente projetado para contornar limitações do Windows e fornecer uma experiência de aprendizado completa.

![Prisma Playground Screenshot](./public/images/playground-screenshot.png)

## 🚀 Deploy no GitHub Pages

Este projeto está configurado para deploy automatizado no GitHub Pages usando GitHub Actions. Para fazer o deploy:

1. Faça um fork deste repositório para sua conta do GitHub
2. Vá em **Settings > Pages** e selecione a fonte como "GitHub Actions"
3. Configure os segredos do repositório em **Settings > Secrets and variables > Actions**:
   - `DATABASE_URL`: URL do seu banco de dados PostgreSQL (Supabase)
   - `DIRECT_URL`: URL direta do seu banco de dados PostgreSQL

O deploy será feito automaticamente a cada push na branch principal.

## 🚀 Características

- **Interface Visual Interativa**: Editor de código com syntax highlighting para Prisma
- **Cliente Virtual**: Implementação própria que substitui o Prisma Client para contornar problemas de geração no Windows
- **Schema Educacional Completo**: Schema com 7 modelos inter-relacionados (User, Profile, Post, Category, Tag, PostTag, Comment)
- **Execução Segura**: Parser inteligente que identifica e executa queries específicas
- **Suporte ao Supabase**: Configuração otimizada para PostgreSQL via Supabase

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **Editor**: Monaco Editor com syntax highlighting customizado para Prisma
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma (schema) + Cliente Virtual personalizado
- **Deploy**: GitHub Actions + GitHub Pages

## 📝 Configuração para Deploy

### Opção 1: GitHub Pages (Estático)
O projeto está configurado para ser deployado no GitHub Pages usando GitHub Actions. Esta opção tem algumas limitações:
- API routes funcionarão apenas localmente
- Conexão com banco de dados precisa ser simulada no ambiente de produção

### Opção 2: Vercel (Recomendado)
Para funcionalidade completa, incluindo API routes:
1. Importe o repositório na [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente `DATABASE_URL` e `DIRECT_URL`
3. A Vercel detectará automaticamente que é um projeto Next.js

## 📁 Estrutura do Projeto

```
📦 PrismaORM/
├── 📁 pages/
│   ├── index.tsx                 # Interface principal do playground
│   └── 📁 api/
│       ├── query.ts             # API principal para execução de queries
│       ├── query-virtual.ts     # API usando cliente virtual
│       ├── health.ts            # Health check
│       ├── migrate.ts           # Gerenciamento de migrações
│       ├── generate.ts          # Geração do Prisma Client (Windows-optimized)
│       └── 📁 session/
│           └── start.ts         # Gerenciamento de sessões
├── 📁 src/
│   ├── 📁 config/
│   │   └── supabase-config.ts   # Configurações do Supabase
│   └── 📁 database/
│       ├── virtual-prisma-client.ts  # Cliente virtual PostgreSQL
│       └── playground-client.ts      # Cliente Prisma otimizado
├── 📁 prisma/
│   ├── schema.prisma            # Schema educacional completo
│   └── seed.ts                  # Seeds para dados de exemplo
├── 📁 lib/
│   └── monaco-config.ts         # Configuração do Monaco Editor
└── 📁 public/
    └── favicon.ico
```

## 🎯 Como Usar

### 1. Instalação

```bash
npm install
```

### 2. Configuração do Banco

Crie um arquivo `.env.local` com as configurações do Supabase:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/database?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://usuario:senha@host:5432/database"
```

### 3. Executar Migrações

```bash
npm run db:migrate
```

### 4. Iniciar o Playground

```bash
npm run dev
```

Acesse `http://localhost:3000` para usar o playground.

## 📚 Como Funcionar

### Executando Queries

1. **Edite o código**: Use o editor Monaco para escrever suas queries Prisma
2. **Marque a query ativa**: Descomente a linha `console.log(variavel)` da query que deseja executar
3. **Execute**: Clique em "Executar Query" para ver os resultados

### Exemplo de Query

```typescript
// Buscar todos os usuários com seus perfis
const usuarios = await prisma.user.findMany({
  include: {
    profile: true,
    posts: {
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    }
  }
})

// Descomente para executar esta query:
console.log(usuarios)
```

## 🏗️ Arquitetura

### Cliente Virtual

O projeto utiliza um **Cliente Virtual** que:
- Substitui completamente o `@prisma/client` gerado
- Traduz queries Prisma para SQL nativo PostgreSQL
- Gerencia conexões e sessões automaticamente
- Contorna problemas de permissão no Windows

### Parser Inteligente

O parser:
- Analisa o código JavaScript/TypeScript
- Identifica queries ativas via `console.log()` 
- Extrai model, action e payload de forma robusta
- Suporta objetos complexos e nested queries

### Sistema de Sessões

- Cada sessão tem seu próprio namespace no banco
- Isolamento completo entre diferentes usuários
- Limpeza automática de dados temporários

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Iniciar em modo desenvolvimento
npm run build        # Build para produção
npm run start        # Iniciar em produção
npm run playground   # Alias para npm run dev
npm run db:migrate   # Executar migrações Prisma
npm run db:generate  # Gerar cliente Prisma
npm run db:studio    # Abrir Prisma Studio
npm run db:push      # Push schema para o banco
npm run db:reset     # Reset do banco de dados
npm run clean        # Limpar cache do Next.js
```

## 🎓 Schema Educacional

O projeto inclui um schema completo com:

- **User**: Usuários do sistema
- **Profile**: Perfis de usuário (1:1)
- **Post**: Posts dos usuários (1:N)
- **Category**: Categorias de posts (1:N)
- **Tag**: Tags para organização
- **PostTag**: Relacionamento many-to-many entre Posts e Tags
- **Comment**: Comentários nos posts

Todos os modelos incluem comentários explicativos em português.

## 🐛 Solução de Problemas

### Erro EPERM no Windows
O projeto inclui tratamento específico para erros de permissão no Windows. O sistema automaticamente:
- Tenta tomar posse dos arquivos problemáticos
- Usa o cliente virtual como fallback
- Limpa arquivos temporários automaticamente

### Problemas de Conexão
- Verifique as variáveis de ambiente
- Confirme que o Supabase está acessível
- Use a API `/api/health` para diagnosticar

## 📝 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

**Developed with ❤️ for learning Prisma ORM**