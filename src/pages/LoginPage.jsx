import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth()
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [mode,      setMode]      = useState('login') // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError('E-mail ou senha incorretos.')
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await resetPassword(email)
    if (error) setError('Não foi possível enviar o e-mail. Verifique o endereço.')
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0B2238 0%, #123653 60%, #1a4a72 100%)',
      }}
    >
      {/* Decorative circles */}
      <div
        aria-hidden
        style={{
          position: 'fixed', top: '-120px', right: '-120px',
          width: '400px', height: '400px',
          borderRadius: '50%',
          background: 'rgba(201,154,46,0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed', bottom: '-80px', left: '-80px',
          width: '280px', height: '280px',
          borderRadius: '50%',
          background: 'rgba(201,154,46,0.06)',
          pointerEvents: 'none',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '50%',
              padding: '12px',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(201,154,46,0.3)',
              marginBottom: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <img
              src="/logo.png"
              alt="Arena Kicks"
              style={{ width: '120px', height: '120px', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <p
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '12px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            Sistema de Gestão
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {mode === 'login' ? (
            <>
              <div className="mb-6">
                <h2 style={{ color: '#0B2238', fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
                  Bem-vindo de volta
                </h2>
                <p style={{ color: '#6b7280', fontSize: '13px' }}>
                  Faça login para acessar o painel
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    style={{
                      width: '100%',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C99A2E'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#C99A2E'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                {error && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#dc2626',
                    fontSize: '13px',
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #0B2238, #123653)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginTop: '8px',
                    boxShadow: loading ? 'none' : '0 4px 15px rgba(11,34,56,0.4)',
                    transition: 'all 0.2s',
                    letterSpacing: '0.5px',
                  }}
                >
                  {loading ? 'Entrando...' : '→  Entrar'}
                </button>
              </form>

              <button
                onClick={() => { setMode('reset'); setError('') }}
                style={{
                  marginTop: '16px',
                  fontSize: '13px',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 style={{ color: '#0B2238', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                  Recuperar senha
                </h2>
                <p style={{ color: '#6b7280', fontSize: '13px' }}>
                  Enviaremos um link para seu e-mail
                </p>
              </div>

              {resetSent ? (
                <div>
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '16px',
                    textAlign: 'center',
                    marginBottom: '20px',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                    <p style={{ color: '#15803d', fontSize: '14px', fontWeight: 500 }}>
                      E-mail enviado com sucesso!
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                      Verifique sua caixa de entrada.
                    </p>
                  </div>
                  <button
                    onClick={() => { setMode('login'); setResetSent(false) }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #0B2238, #123653)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      style={{
                        width: '100%',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor = '#C99A2E'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                  {error && (
                    <p style={{ color: '#dc2626', fontSize: '13px' }}>⚠️ {error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #C99A2E, #a87d22)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(201,154,46,0.3)',
                    }}
                  >
                    {loading ? 'Enviando...' : 'Enviar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError('') }}
                    style={{
                      width: '100%',
                      fontSize: '13px',
                      color: '#6b7280',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                    }}
                  >
                    ← Voltar
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '11px',
          marginTop: '24px',
          letterSpacing: '0.5px',
        }}>
          Arena Kicks Jacareí © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
