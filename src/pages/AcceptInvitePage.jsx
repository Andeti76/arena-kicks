import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
    <div className="min-h-screen bg-kicks-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Arena Kicks" className="h-20 w-20 object-contain mb-4" />
          <h1 className="text-white text-2xl font-bold">Arena Kicks</h1>
          <p className="text-white/60 text-sm">Jacareí</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {loading && <p className="text-center text-gray-400 py-4">Verificando convite...</p>}

          {!loading && error && !invite && (
            <div className="text-center py-4">
              <p className="text-red-500 font-medium mb-4">{error}</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full">Ir para o login</button>
            </div>
          )}

          {!loading && invite && confirmationSent && (
            <div className="text-center py-4">
              <p className="font-bold text-kicks-navy mb-2">Confirme seu e-mail</p>
              <p className="text-sm text-gray-500">
                Enviamos uma confirmação para {invite.email}. Ao abrir o link, seu acesso será concluído automaticamente.
              </p>
            </div>
          )}

          {!loading && invite && !confirmationSent && (
            <>
              <div className="bg-kicks-navy/5 rounded-lg p-3 mb-5">
                <p className="text-sm text-gray-600">Você foi convidado como</p>
                <p className="font-bold text-kicks-navy">{ROLE_LABEL[invite.role]}
                  {invite.cost_centers && ` — ${invite.cost_centers.name}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">{invite.email}</p>
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
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? 'Criando conta...' : 'Criar conta e entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
