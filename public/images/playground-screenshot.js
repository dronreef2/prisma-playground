/**
 * Para gerar uma captura de tela real, execute o comando abaixo em um navegador com a aplicação rodando:
 * 
 * Instruções para gerar captura de tela:
 * 1. Execute a aplicação com `npm run dev`
 * 2. Abra o navegador no endereço localhost:3000
 * 3. Use a ferramenta de captura do navegador (F12 > Opções > Capturar tela inteira)
 * 4. Salve a imagem como playground-screenshot.png na pasta public/images
 */

// Base64 de uma imagem placeholder simples (1x1 pixel transparente)
// Este arquivo será substituído por uma captura de tela real
const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// No ambiente do navegador, este script criaria um elemento de imagem
if (typeof document !== "undefined") {
  const img = document.createElement("img");
  img.src = base64Image;
  img.alt = "Prisma Playground Screenshot";
  document.body.appendChild(img);
}

console.log("Por favor, substitua este arquivo JS por uma imagem PNG real da aplicação executando.");
