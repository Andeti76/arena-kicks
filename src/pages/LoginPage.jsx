import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mode,     setMode]     = useState('login') // 'login' | 'reset'
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
    <div className="min-h-screen bg-kicks-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Arena Kicks" className="h-24 w-24 object-contain mb-4" />
          <h1 className="text-white text-2xl font-bold">Arena Kicks</h1>
          <p className="text-white/60 text-sm">Jacareí</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {mode === 'login' ? (
            <>
              <h2 className="text-kicks-navy font-bold text-lg mb-5">Entrar</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kicks-navy"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kicks-navy"
                    placeholder="••••••••"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-kicks-navy text-white rounded-lg py-2.5 font-medium text-sm hover:bg-kicks-navy-dark transition-colors disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
              <button
                onClick={() => { setMode('reset'); setError('') }}
                className="mt-4 text-sm text-kicks-navy/60 hover:text-kicks-navy w-full text-center transition-colors"
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <h2 className="text-kicks-navy font-bold text-lg mb-2">Recuperar senha</h2>
              {resetSent ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    E-mail enviado! Verifique sua caixa de entrada.
                  </p>
                  <button
                    onClick={() => { setMode('login'); setResetSent(false) }}
                    className="w-full bg-kicks-navy text-white rounded-lg py-2.5 font-medium text-sm hover:bg-kicks-navy-dark transition-colors"
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Informe seu e-mail e enviaremos um link para redefinir sua senha.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kicks-navy"
                      placeholder="seu@email.com"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-kicks-gold text-white rounded-lg py-2.5 font-medium text-sm hover:bg-kicks-gold-dark transition-colors disabled:opacity-60"
                  >
                    {loading ? 'Enviando...' : 'Enviar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError('') }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    Voltar
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
