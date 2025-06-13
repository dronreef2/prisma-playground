import React, { useState, useEffect } from 'react'
import { createSession, executeQuery } from '../src/services/api-service'

interface User {
  id: number
  name: string
  email: string
  bio?: string
  createdAt: string
  updatedAt: string
}

export default function Exemplos() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    bio: ''
  })

  // Iniciar sessão automaticamente
  useEffect(() => {
    initSession()
  }, [])

  const initSession = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        setSessionId(data.sessionId)
        console.log('✅ Sessão iniciada:', data.sessionId)
      }
    } catch (error) {
      console.error('❌ Erro ao iniciar sessão:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Consultar todos os usuários
  const consultarUsuarios = async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const query = `
        const todosUsuarios = await prisma.user.findMany({
          orderBy: { createdAt: 'desc' }
        })      console.log('todosUsuarios', todosUsuarios)
      `
      
      const response = await executeQuery(sessionId, query, true)
      if (response.success && response.result) {
        setUsers(Array.isArray(response.result) ? response.result : [])
        setResult(response.result)
      }    } catch (error: any) {
      console.error('❌ Erro ao consultar usuários:', error)
      setResult({ error: error?.message || 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }

  // Criar novo usuário
  const criarUsuario = async () => {
    if (!sessionId || !newUserData.name || !newUserData.email) {
      alert('Preencha pelo menos nome e email!')
      return
    }
    
    try {
      setIsLoading(true)
      const timestamp = Date.now()
      const query = `
        const novoUsuario = await prisma.user.create({
          data: {
            name: "${newUserData.name}",
            email: "${newUserData.email}.${timestamp}@exemplo.com",
            bio: "${newUserData.bio || 'Usuário criado via página de exemplos'}"
          }
        })      console.log('novoUsuario', novoUsuario)
      `
      
      const response = await executeQuery(sessionId, query, true)
      if (response.success) {
        setResult(response.result)
        // Limpar formulário
        setNewUserData({ name: '', email: '', bio: '' })
        // Atualizar lista
        await consultarUsuarios()
        alert('✅ Usuário criado com sucesso!')
      }    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error)
      setResult({ error: error?.message || 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }

  // Buscar usuário por ID
  const buscarUsuarioPorId = async (id: number) => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const query = `
        const usuario = await prisma.user.findUnique({
          where: { id: ${id} },
          include: {
            profile: true,
            posts: true
          }
        })      console.log('usuario', usuario)
      `
      
      const response = await executeQuery(sessionId, query, true)
      if (response.success) {
        setResult(response.result)
      }    } catch (error: any) {
      console.error('❌ Erro ao buscar usuário:', error)
      setResult({ error: error?.message || 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }
  // Contar usuários
  const contarUsuarios = async () => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const query = `
        const total = await prisma.user.count()      console.log('total', total)
      `
      
      const response = await executeQuery(sessionId, query, true)
      if (response.success) {
        setResult({ totalUsuarios: response.result })
      }    } catch (error: any) {
      console.error('❌ Erro ao contar usuários:', error)
      setResult({ error: error?.message || 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }

  // Atualizar usuário
  const atualizarUsuario = async (id: number, novaBio: string) => {
    if (!sessionId) return
    
    try {
      setIsLoading(true)
      const query = `
        const usuarioAtualizado = await prisma.user.update({
          where: { id: ${id} },
          data: { 
            bio: "${novaBio}",
            updatedAt: new Date()
          }
        })      console.log('usuarioAtualizado', usuarioAtualizado)
      `
      
      const response = await executeQuery(sessionId, query, true)
      if (response.success) {
        setResult(response.result)
        await consultarUsuarios() // Atualizar lista
        alert('✅ Usuário atualizado com sucesso!')
      }    } catch (error: any) {
      console.error('❌ Erro ao atualizar usuário:', error)
      setResult({ error: error?.message || 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }

  // Deletar usuário
  const deletarUsuario = async (id: number) => {
    if (!sessionId) return
    
    const confirmacao = confirm(`Tem certeza que deseja deletar o usuário #${id}? Esta ação não pode ser desfeita.`)
    if (!confirmacao) return
    
    try {
      setIsLoading(true)
      const query = `
        const usuarioDeletado = await prisma.user.delete({
          where: { id: ${id} }
        })      console.log('usuarioDeletado', usuarioDeletado)
      `
      
      const response = await executeQuery(sessionId, query, true)
      if (response.success) {
        setResult(response.result)
        await consultarUsuarios() // Atualizar lista
        alert('✅ Usuário deletado com sucesso!')
      }    } catch (error: any) {
      console.error('❌ Erro ao deletar usuário:', error)
      setResult({ error: error?.message || 'Erro desconhecido' })
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>📚 Exemplos - Prisma + Supabase Database</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
        Esta página demonstra como usar o <strong>Prisma ORM</strong> para interagir com um database <strong>PostgreSQL do Supabase</strong> em tempo real.
        Aqui você pode testar queries de consulta, criação, atualização e busca de dados que aparecerão instantaneamente no seu dashboard do Supabase.
      </p>
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b6d4fe', 
        borderRadius: '5px',
        marginBottom: '30px',
        fontSize: '14px'
      }}>
        <strong>🔗 Integração Ativa:</strong> Todos os dados criados aqui são salvos no schema público do seu Supabase e podem ser visualizados no dashboard em tempo real.
      </div>

      {/* Status da Sessão */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: sessionId ? '#d4edda' : '#f8d7da', 
        border: `1px solid ${sessionId ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <strong>Status da Sessão:</strong> {sessionId ? `✅ Conectado (${sessionId})` : '❌ Não conectado'}
        {!sessionId && (
          <button 
            onClick={initSession} 
            disabled={isLoading}
            style={{ marginLeft: '10px', padding: '5px 10px' }}
          >
            Reconectar
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Painel de Ações */}
        <div>
          <h2>🔧 Ações no Database</h2>
          
          {/* Consultar Usuários */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <h3>📋 Consultar Todos os Usuários</h3>
            <p>Busca todos os usuários do database</p>
            <button 
              onClick={consultarUsuarios} 
              disabled={!sessionId || isLoading}
              style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              {isLoading ? 'Consultando...' : 'Consultar Usuários'}
            </button>
          </div>

          {/* Criar Usuário */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <h3>➕ Criar Novo Usuário</h3>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Nome"
                value={newUserData.name}
                onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <input
                type="text"
                placeholder="Email (sem @exemplo.com)"
                value={newUserData.email}
                onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
              <textarea
                placeholder="Bio (opcional)"
                value={newUserData.bio}
                onChange={(e) => setNewUserData({...newUserData, bio: e.target.value})}
                style={{ width: '100%', padding: '8px', marginBottom: '8px', border: '1px solid #ccc', borderRadius: '3px', resize: 'vertical', height: '60px' }}
              />
            </div>
            <button 
              onClick={criarUsuario} 
              disabled={!sessionId || isLoading || !newUserData.name || !newUserData.email}
              style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              {isLoading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>          {/* Contar Usuários */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <h3>📊 Contar Usuários</h3>
            <p>Conta o total de usuários no database</p>
            <button 
              onClick={contarUsuarios} 
              disabled={!sessionId || isLoading}
              style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              {isLoading ? 'Contando...' : 'Contar Usuários'}
            </button>
          </div>

          {/* Operações Avançadas */}
          <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f8f9fa' }}>
            <h3>⚙️ Operações Avançadas</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Para usar estas funções, primeiro consulte os usuários e clique em um para ver os botões de ação.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  const id = prompt('Digite o ID do usuário para atualizar:')
                  const novaBio = prompt('Digite a nova bio:')
                  if (id && novaBio) atualizarUsuario(parseInt(id), novaBio)
                }}
                disabled={!sessionId || isLoading}
                style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '3px', fontSize: '14px' }}
              >
                ✏️ Atualizar Bio
              </button>
              
              <button 
                onClick={() => {
                  const id = prompt('Digite o ID do usuário para deletar:')
                  if (id) deletarUsuario(parseInt(id))
                }}
                disabled={!sessionId || isLoading}
                style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', fontSize: '14px' }}
              >
                🗑️ Deletar Usuário
              </button>
            </div>
          </div>
        </div>

        {/* Painel de Resultados */}
        <div>
          <h2>📊 Resultados</h2>
            {/* Lista de Usuários */}
          {users.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3>👥 Usuários Encontrados ({users.length})</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '5px' }}>
                {users.map(user => (
                  <div 
                    key={user.id} 
                    style={{ padding: '10px', borderBottom: '1px solid #eee' }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <strong>#{user.id} - {user.name}</strong><br />
                      <small style={{ color: '#666' }}>
                        {user.email}<br />
                        {user.bio && `Bio: ${user.bio}`}
                      </small>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => buscarUsuarioPorId(user.id)}
                        style={{ padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                        title="Ver detalhes completos"
                      >
                        👁️ Detalhes
                      </button>
                      
                      <button 
                        onClick={() => {
                          const novaBio = prompt(`Nova bio para ${user.name}:`, user.bio || '')
                          if (novaBio !== null) atualizarUsuario(user.id, novaBio)
                        }}
                        style={{ padding: '4px 8px', backgroundColor: '#ffc107', color: '#212529', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                        title="Atualizar bio"
                      >
                        ✏️ Editar
                      </button>
                      
                      <button 
                        onClick={() => deletarUsuario(user.id)}
                        style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                        title="Deletar usuário"
                      >
                        🗑️ Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultado da Última Operação */}
          {result && (
            <div>
              <h3>📝 Último Resultado</h3>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '5px', 
                overflow: 'auto',
                maxHeight: '400px',
                fontSize: '12px',
                border: '1px solid #ddd'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>      {/* Dicas */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#e7f3ff', border: '1px solid #b6d4fe', borderRadius: '5px' }}>
        <h3>💡 Dicas de Uso</h3>
        <ul>
          <li>✅ <strong>Consultar:</strong> Clique em "Consultar Usuários" para ver todos os dados</li>
          <li>➕ <strong>Criar:</strong> Preencha o formulário e clique em "Criar Usuário"</li>
          <li>�️ <strong>Detalhes:</strong> Use o botão "Detalhes" em qualquer usuário para ver informações completas</li>
          <li>✏️ <strong>Editar:</strong> Use o botão "Editar" para atualizar a bio de um usuário</li>
          <li>🗑️ <strong>Deletar:</strong> Use o botão "Deletar" para remover um usuário (com confirmação)</li>
          <li>📊 <strong>Dashboard:</strong> Vá ao seu Supabase para ver os dados em tempo real</li>
          <li>🔄 <strong>Atualizar:</strong> Os dados são atualizados automaticamente após cada ação</li>
          <li>⚠️ <strong>Cuidado:</strong> Operações de delete são irreversíveis!</li>
        </ul>
      </div>
    </div>
  )
}