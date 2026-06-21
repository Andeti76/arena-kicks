import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Icon from '../components/ui/Icon'

export default function LoginPage() {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login')
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: loginError } = await signIn(email, password)
    if (loginError) setError('E-mail ou senha incorretos.')
    setLoading(false)
  }

  async function handleReset(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: resetError } = await resetPassword(email)
    if (resetError) setError('Não foi possível enviar o e-mail. Verifique o endereço.')
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071827]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 16% 10%, rgba(201,154,46,.18), transparent 28rem), radial-gradient(circle at 85% 88%, rgba(29,91,132,.34), transparent 35rem), linear-gradient(135deg, #071827 0%, #0B2238 45%, #123653 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[.055]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          maskImage: 'linear-gradient(to right, black, transparent 72%)',
        }}
      />
      <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full border border-kicks-gold/15" />
      <div className="absolute -left-12 top-[38%] h-48 w-48 rounded-full border border-kicks-gold/10" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1220px] items-center gap-12 px-5 py-10 lg:grid-cols-[1.05fr_.75fr] lg:px-10">
        <section className="hidden max-w-xl lg:block">
          <div className="mb-8 flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-5 rounded-full bg-kicks-gold/30 blur-2xl" />
              <img src="/logo.png" alt="Arena Kicks" className="relative h-36 w-36 object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.45)]" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.24em] text-kicks-gold-light">Gestão que joga junto</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-.05em] text-white">Arena Kicks Jacareí</h1>
            </div>
          </div>

          <h2 className="max-w-lg text-5xl font-black leading-[1.02] tracking-[-.055em] text-white">
            Visão clara para quem transforma o jogo.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
            Finanças, conciliações, áreas e patrocinadores em um só lugar — com a precisão que a operação merece.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            {[
              ['Visão', 'Financeira', 'dashboard', ''],
              ['Controle', 'Por área', 'areas', 'float-delay-1'],
              ['Decisão', 'Em tempo real', 'chart', 'float-delay-2'],
            ].map(([top, bottom, icon, delay]) => (
              <div key={top} className={`glass-float-card ${delay} p-4`}>
                <div className="relative z-10">
                  <span className="icon-live mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-kicks-gold/15 text-kicks-gold-light">
                    <Icon name={icon} size={18} />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-kicks-gold-light">{top}</p>
                  <p className="mt-1 text-sm font-semibold text-white/80">{bottom}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-12 text-[10px] font-semibold uppercase tracking-[.2em] text-white/22">
            Tecnologia e experiência por Andeti
          </p>
        </section>

        <section className="mx-auto w-full max-w-[430px]">
          <div className="mb-7 flex flex-col items-center lg:hidden">
            <img src="/logo.png" alt="Arena Kicks" className="h-28 w-28 object-contain drop-shadow-2xl" />
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[.25em] text-white/45">Sistema de gestão</p>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/[.97] p-7 shadow-[0_34px_90px_rgba(0,0,0,.36)] backdrop-blur-xl sm:p-9">
            <div className="mb-7 flex items-start justify-between gap-5">
              <div>
                <p className="page-eyebrow">{mode === 'login' ? 'Acesso seguro' : 'Recuperação'}</p>
                <h2 className="text-[26px] font-extrabold tracking-[-.04em] text-kicks-navy">
                  {mode === 'login' ? 'Bem-vindo de volta' : 'Recuperar senha'}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {mode === 'login' ? 'Entre para acessar o centro de gestão.' : 'Enviaremos um link seguro para seu e-mail.'}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-kicks-navy text-kicks-gold-light shadow-lg shadow-kicks-navy/15">
                <Icon name="shield" size={21} />
              </span>
            </div>

            {mode === 'login' ? (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label">E-mail</label>
                    <input
                      className="input"
                      type="email"
                      required
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <label className="label">Senha</label>
                    <input
                      className="input"
                      type="password"
                      required
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  {error && <Message type="error">{error}</Message>}

                  <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
                    {loading ? 'Entrando...' : 'Entrar no painel'}
                    {!loading && <span aria-hidden>→</span>}
                  </button>
                </form>

                <button
                  onClick={() => { setMode('reset'); setError('') }}
                  className="mt-5 w-full text-center text-xs font-semibold text-gray-500 transition-colors hover:text-kicks-navy"
                >
                  Esqueci minha senha
                </button>
              </>
            ) : resetSent ? (
              <div>
                <Message type="success">
                  <strong className="block">E-mail enviado com sucesso.</strong>
                  <span className="mt-1 block text-xs font-normal">Verifique sua caixa de entrada e também a pasta de spam.</span>
                </Message>
                <button onClick={() => { setMode('login'); setResetSent(false) }} className="btn-primary mt-5 w-full">
                  Voltar ao login
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="label">E-mail</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
                {error && <Message type="error">{error}</Message>}
                <button type="submit" disabled={loading} className="btn-gold w-full">
                  {loading ? 'Enviando...' : 'Enviar link seguro'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError('') }}
                  className="btn-secondary w-full"
                >
                  ← Voltar
                </button>
              </form>
            )}
          </div>

          <p className="mt-7 text-center text-[10px] font-semibold uppercase tracking-[.15em] text-white/28">
            Arena Kicks Jacareí © {new Date().getFullYear()} · Powered by Andeti
          </p>
        </section>
      </div>
    </div>
  )
}

function Message({ type, children }) {
  const success = type === 'success'
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${
      success
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-red-200 bg-red-50 text-red-600'
    }`}>
      {children}
    </div>
  )
}
