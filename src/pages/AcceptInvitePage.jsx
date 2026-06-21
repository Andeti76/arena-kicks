import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from '../components/ui/Icon'

export default function AcceptInvitePage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const [invite,   setInvite]   = useState(null)
  const [form,     setForm]     = useState({ full_name: '', password: '', confirm: '' })
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  const token = params.get('token')

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return }
    supabase.rpc('get_invite_by_token', { p_token: token })
      .then(async ({ data, error }) => {
        if (error || !data || data.error) { setError('Convite não encontrado.') }
        else if (data.accepted_at)        { setError('Este convite já foi utilizado.') }
        else if (new Date(data.expires_at) < new Date()) { setError('Este convite expirou.') }
        else {
          setInvite({
            ...data,
            cost_centers: data.cost_center_name ? { name: data.cost_center_name } : null,
          })

          // Após confirmar o e-mail, o Supabase retorna a esta URL com a sessão ativa.
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            if (session.user.email?.toLowerCase() !== data.email.toLowerCase()) {
              setInvite(null)
              setError('Este convite pertence a outro endereço de e-mail.')
            } else {
              const { data: accepted, error: acceptError } = await supabase.rpc('accept_invite', {
                p_token: token,
              })
              if (acceptError || accepted?.error) {
                setInvite(null)
                setError(acceptError?.message || accepted.error)
              } else {
                navigate('/', { replace: true })
                return
              }
            }
          }
        }
        setLoading(false)
      })
  }, [navigate, token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return setError('Nome obrigatório.')
    if (form.password.length < 8) return setError('Senha mínima de 8 caracteres.')
    if (form.password !== form.confirm) return setError('Senhas não coincidem.')
    setSaving(true)
    setError('')
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email:    invite.email,
        password: form.password,
        options:  {
          data: { full_name: form.full_name },
          emailRedirectTo: `${window.location.origin}/convite?token=${token}`,
        },
      })
      if (signUpError) throw signUpError

      const userId = authData.user?.id
      if (!userId) throw new Error('Erro ao criar usuário.')

      if (!authData.session) {
        setConfirmationSent(true)
        return
      }

      // Atribuir role e marcar convite como aceito (RPC atômica — usa auth.uid())
      const { data: acceptData, error: acceptErr } = await supabase.rpc('accept_invite', {
        p_token: token,
      })
      if (acceptErr) throw acceptErr
      if (acceptData?.error) throw new Error(acceptData.error)

      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const ROLE_LABEL = { owner: 'Dono', partner: 'Sócio', area_manager: 'Responsável de área' }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071827]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 12% 12%, rgba(201,154,46,.20), transparent 28rem), radial-gradient(circle at 88% 80%, rgba(31,102,151,.28), transparent 35rem), linear-gradient(135deg, #071827 0%, #0B2238 48%, #123653 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />
      <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full border border-kicks-gold/15" />
      <div className="absolute -right-32 -top-32 h-[430px] w-[430px] rounded-full border border-white/[.05]" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1180px] items-center gap-12 px-5 py-10 lg:grid-cols-[.9fr_.72fr] lg:px-10">
        <section className="hidden lg:block">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-5 rounded-full bg-kicks-gold/30 blur-2xl" />
              <img src="/logo.png" alt="Arena Kicks" className="relative h-36 w-36 object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.45)]" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.24em] text-kicks-gold-light">Você foi convocado</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-.05em] text-white">Arena Kicks Jacareí</h1>
            </div>
          </div>

          <h2 className="mt-9 max-w-xl text-5xl font-black leading-[1.02] tracking-[-.055em] text-white">
            Faça parte de quem move essa arena.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
            Seu acesso reúne operação, finanças e decisões em uma experiência segura, simples e construída para o time.
          </p>

          <div className="relative mt-10 h-[280px] max-w-[570px]">
            <div className="ambient-orb absolute left-20 top-8 h-44 w-44 bg-kicks-gold/[.08] blur-3xl" />

            <div className="glass-float-card absolute left-0 top-3 w-[270px] p-5">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-white/35">Status do convite</p>
                  <p className="mt-2 text-lg font-black text-white">Acesso protegido</p>
                </div>
                <span className="icon-live flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Icon name="shield" size={22} />
                </span>
              </div>
              <div className="relative z-10 mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
                Validação segura ativa
              </div>
            </div>

            <div className="glass-float-card float-delay-1 absolute right-0 top-24 w-[250px] p-5">
              <div className="relative z-10 flex items-center gap-3">
                <span className="icon-live flex h-10 w-10 items-center justify-center rounded-xl bg-kicks-gold/15 text-kicks-gold-light">
                  <Icon name="dashboard" size={20} />
                </span>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-white/32">Gestão integrada</p>
                  <p className="mt-1 text-sm font-bold text-white">Uma visão. Um time.</p>
                </div>
              </div>
            </div>

            <div className="glass-float-card float-delay-2 absolute bottom-0 left-12 w-[240px] p-4">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-white/30">Seu perfil</p>
                  <p className="mt-1 text-sm font-bold text-white">Pronto para entrar</p>
                </div>
                <span className="icon-live flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                  <Icon name="areas" size={18} />
                </span>
              </div>
            </div>
          </div>

          <p className="mt-10 text-[10px] font-semibold uppercase tracking-[.2em] text-white/22">
            Experiência digital por Andeti
          </p>
        </section>

        <section className="mx-auto w-full max-w-[450px]">
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <img src="/logo.png" alt="Arena Kicks" className="h-28 w-28 object-contain drop-shadow-2xl" />
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[.25em] text-kicks-gold-light">Ativação de acesso</p>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/[.97] p-7 shadow-[0_34px_90px_rgba(0,0,0,.36)] backdrop-blur-xl sm:p-9">
            <div className="mb-7 flex items-start justify-between gap-5">
              <div>
                <p className="page-eyebrow">Bem-vindo ao time</p>
                <h2 className="text-[26px] font-extrabold tracking-[-.04em] text-kicks-navy">Ative seu acesso</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">Confirme seus dados para entrar no centro de gestão.</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-kicks-navy text-kicks-gold-light shadow-lg shadow-kicks-navy/15">
                <Icon name="shield" size={21} />
              </span>
            </div>

          {loading && (
            <div className="py-8 text-center">
              <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-[3px] border-kicks-navy/10 border-t-kicks-gold" />
              <p className="mt-4 text-sm font-medium text-gray-400">Verificando seu convite...</p>
            </div>
          )}

          {!loading && error && !invite && (
            <div className="py-3 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                <Icon name="alert" size={22} />
              </span>
              <p className="mb-1 mt-4 font-bold text-kicks-navy">Não foi possível validar o convite</p>
              <p className="mb-5 text-sm text-red-500">{error}</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">Ir para o login</button>
            </div>
          )}

          {!loading && invite && confirmationSent && (
            <div className="py-4 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Icon name="reconcile" size={23} />
              </span>
              <p className="mb-2 mt-4 font-bold text-kicks-navy">Confirme seu e-mail</p>
              <p className="text-sm leading-6 text-gray-500">
                Enviamos uma confirmação para {invite.email}. Ao abrir o link, seu acesso será concluído automaticamente.
              </p>
            </div>
          )}

          {!loading && invite && !confirmationSent && (
            <>
              <div className="mb-6 rounded-2xl border border-kicks-gold/20 bg-gradient-to-br from-kicks-navy/[.055] to-kicks-gold/[.08] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-kicks-gold-dark">Perfil do convite</p>
                <p className="mt-1 font-extrabold text-kicks-navy">{ROLE_LABEL[invite.role]}
                  {invite.cost_centers && ` — ${invite.cost_centers.name}`}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-500">{invite.email}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Seu nome</label>
                  <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="input" placeholder="Nome completo" required />
                </div>
                <div>
                  <label className="label">Senha</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input" placeholder="Mínimo 8 caracteres" required />
                </div>
                <div>
                  <label className="label">Confirmar senha</label>
                  <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                    className="input" placeholder="Repita a senha" required />
                </div>
                {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? 'Criando conta...' : 'Criar conta e entrar'}
                </button>
              </form>
            </>
          )}
          </div>

          <p className="mt-7 text-center text-[10px] font-semibold uppercase tracking-[.15em] text-white/28">
            Arena Kicks Jacareí · Acesso seguro · Powered by Andeti
          </p>
        </section>
      </div>
    </div>
  )
}
