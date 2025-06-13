# Instruções para Captura de Tela

Para completar a configuração do projeto para o GitHub Pages, siga os passos abaixo:

## 1. Gerar Captura de Tela

1. Execute a aplicação localmente com `npm run dev`
2. Abra o navegador em `http://localhost:3000`
3. Use a ferramenta de captura de tela do seu navegador (geralmente acessível com F12 > ... > Capturar tela inteira)
4. Salve a imagem como `playground-screenshot.png` na pasta `public/images`

## 2. Verificar o Arquivo de Configuração do GitHub Actions

O arquivo `.github/workflows/deploy.yml.bak` foi corrigido. Remova a extensão `.bak` para utilizá-lo:

```bash
mv .github\workflows\deploy.yml.bak .github\workflows\deploy.yml
```

## 3. Executar o Build

```bash
npm run deploy:github
```

## 4. Configurações Finais

1. Crie um novo repositório no GitHub
2. Faça o push do código para o repositório
3. Configure o GitHub Pages para utilizar a branch `gh-pages`

## Notas sobre Implantação

- O projeto está configurado para funcionar como site estático no GitHub Pages
- As APIs serverless são substituídas automaticamente por versões mock quando executadas no GitHub Pages
- A captura de tela em `public/images/playground-screenshot.png` é apresentada no README do repositório
