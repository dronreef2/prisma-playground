import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { isGitHubPages } from '../src/config/environment'

export default function App({ Component, pageProps }: AppProps) {
  const [isGithubEnvironment, setIsGithubEnvironment] = useState(false)

  useEffect(() => {
    // Verificar se estamos rodando no GitHub Pages
    setIsGithubEnvironment(isGitHubPages())
    
    if (isGitHubPages()) {
      console.log('🌐 Executando no ambiente GitHub Pages - APIs simuladas estão sendo usadas')
    }
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {isGithubEnvironment && (
        <div style={{
          background: '#FF9800',
          color: 'white',
          padding: '8px 12px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          ⚠️ Rodando no GitHub Pages - APIs simuladas em uso, algumas funcionalidades podem estar limitadas
        </div>
      )}
      <Component {...pageProps} />
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1e1e1e;
          color: #ffffff;
          height: 100%;
          overflow: hidden;
        }

        #__next {
          height: 100%;
        }

        /* Monaco Editor Dark Theme customizations */
        .monaco-editor {
          background: #1e1e1e !important;
        }

        .monaco-editor .margin {
          background: #1e1e1e !important;
        }

        .monaco-editor .minimap {
          background: #1e1e1e !important;
        }

        /* Scrollbar customizations */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #2d2d30;
        }

        ::-webkit-scrollbar-thumb {
          background: #424242;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </>
  )
}
