import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Configuração do syntax highlighting para Prisma
export const configurePrismaLanguage = () => {
  // Registrar a linguagem Prisma
  monaco.languages.register({ id: 'prisma' })

  // Definir tokens para syntax highlighting
  monaco.languages.setMonarchTokensProvider('prisma', {
    tokenizer: {
      root: [
        // Comentários
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // Keywords
        [/\b(generator|datasource|model|enum|type)\b/, 'keyword'],
        [/\b(provider|url|output|relationMode|previewFeatures)\b/, 'keyword.control'],
        [/\b(String|Int|Float|Boolean|DateTime|Json|Bytes|Decimal|BigInt|Unsupported)\b/, 'type'],

        // Decorators
        [/@\w+/, 'decorator'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Identificadores
        [/[a-zA-Z_]\w*/, 'identifier'],

        // Operadores e delimitadores
        [/[{}()\[\]]/, 'delimiter.bracket'],
        [/[<>]/, 'delimiter.angle'],
        [/[,;]/, 'delimiter'],
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ]
    }
  })

  // Configurar tema escuro para Prisma
  monaco.editor.defineTheme('prisma-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'keyword.control', foreground: 'C586C0' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'decorator', foreground: 'DCDCAA' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'identifier', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6'
    }
  })
  // Auto-completion para Prisma
  monaco.languages.registerCompletionItemProvider('prisma', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      const suggestions = [
        {
          label: 'model',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'model ${1:ModelName} {\n  ${2}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range
        },
        {
          label: 'generator',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'generator ${1:client} {\n  provider = "${2:prisma-client-js}"\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range
        },
        {
          label: 'datasource',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'datasource ${1:db} {\n  provider = "${2:postgresql}"\n  url      = env("${3:DATABASE_URL}")\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range
        },
        {
          label: '@id',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: '@id',
          range: range
        },
        {
          label: '@default',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: '@default(${1:autoincrement()})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range
        },
        {
          label: '@unique',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: '@unique',
          range: range
        },
        {
          label: '@relation',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: '@relation(fields: [${1:fieldName}], references: [${2:id}])',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range
        }
      ]

      return { suggestions }
    }
  })
}

// Configurar o loader do Monaco
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs'
  }
})

export default configurePrismaLanguage
