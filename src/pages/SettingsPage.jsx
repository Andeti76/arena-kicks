import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fmtDate } from '../lib/format'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-kicks-navy mb-6">Configurações</h1>
      <div className="space-y-6">
        <UsersSection />
        <InviteSection />
      </div>
    </div>
  )
}

/* ─────────────────────────────── USUÁRIOS ── */
function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { user: me } = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('user_roles')
      .select(`
        id, role, cost_center_id,
        profiles(id, full_name),
        cost_centers(name)
      `)
      .order('role')
    setUsers(data || [])
    setLoading(false)
  }

  async function removeUser(ur) {
    if (!confirm(`Remover acesso de "${ur.profiles?.full_name}"?`)) return
    await supabase.from('user_roles').delete().eq('id', ur.id)
    load()
  }

  const ROLE_LABEL = { owner: 'Dono', partner: 'Sócio', area_manager: 'Responsável de área' }
  const ROLE_COLOR = {
    owner:        'bg-kicks-navy text-white',
    partner:      'bg-kicks-gold text-white',
    area_manager: 'bg-gray-100 text-gray-700',
  }

  return (
    <Section title="Usuários com acesso">
      {loading && <p className="text-gray-400 text-sm">Carregando...</p>}
      <div className="space-y-2">
        {users.map(ur => (
          <div key={ur.id} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
              {ur.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{ur.profiles?.full_name || 'Usuário'}</p>
              {ur.cost_centers && <p className="text-xs text-gray-400">{ur.cost_centers.name}</p>}
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[ur.role]}`}>
              {ROLE_LABEL[ur.role]}
            </span>
            {ur.profiles?.id !== me?.id && ur.role !== 'owner' && (
              <button onClick={() => removeUser(ur)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remover">
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ─────────────────────────────── CONVITES ── */
function InviteSection() {
  const [email,         setEmail]         = useState('')
  const [role,          setRole]          = useState('partner')
  const [ccId,          setCcId]          = useState('')
  const [ccs,           setCcs]           = useState([])
  const [sending,       setSending]       = useState(false)
  const [error,         setError]         = useState(null)
  const [createdInvite, setCreatedInvite] = useState(null) // { email, token }
  const [emailSent,     setEmailSent]     = useState(false)
  const [invites,       setInvites]       = useState([])
  const [copied,        setCopied]        = useState(null) // id do invite copiado

  useEffect(() => {
    supabase.from('cost_centers').select('id, name').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCcs(data || []))
    loadInvites()
  }, [])

  async function loadInvites() {
    const { data } = await supabase
      .from('invites')
      .select('id, email, role, token, expires_at, accepted_at, cost_centers(name)')
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
    setInvites(data || [])
  }

  function inviteLink(token) {
    return `${window.location.origin}/convite?token=${token}`
  }

  async function copyLink(token, id) {
    await navigator.clipboard.writeText(inviteLink(token))
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function openEmail(inv) {
    const link  = inviteLink(inv.token ?? inv.linkToken)
    const name  = inv.email.split('@')[0]
    const subj  = encodeURIComponent('Você foi convidado para o Arena Kicks')
    const body  = encodeURIComponent(
      `Olá${name ? ' ' + name : ''},\n\nVocê foi convidado para acessar o sistema Arena Kicks Jacareí.\n\nClique no link abaixo para criar sua conta:\n${link}\n\nO link expira em 7 dias.\n\nArena Kicks Jacareí`
    )
    window.open(`mailto:${inv.email}?subject=${subj}&body=${body}`)
  }

  async function sendInvite(e) {
    e.preventDefault()
    if (!email) return
    setSending(true)
    setError(null)
    setCreatedInvite(null)
    setEmailSent(false)

    try {
      const { data, error: err } = await supabase.functions.invoke('send-invite', {
        body: {
          email:          email.toLowerCase().trim(),
          role,
          cost_center_id: role === 'area_manager' ? ccId || null : null,
        },
      })
      if (err) {
        // Tenta extrair erro real da Edge Function (non-2xx)
        if (err.context) {
          try {
            const body = await err.context.json()
            throw new Error(body?.error || err.message)
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== err.message) throw parseErr
          }
        }
        throw err
      }
      if (data?.error) throw new Error(data.error)

      const inviteEmail = email.toLowerCase().trim()
      setCreatedInvite({ email: inviteEmail, token: data.token, linkToken: data.token })
      if (data.email_sent) {
        setEmailSent(true)
      }
      setEmail('')
      setCcId('')
      loadInvites()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function revokeInvite(id) {
    await supabase.from('invites').delete().eq('id', id)
    if (createdInvite) setCreatedInvite(null)
    loadInvites()
  }

  const ROLE_LABEL = { owner: 'Dono', partner: 'Sócio', area_manager: 'Responsável de área' }

  return (
    <Section title="Convidar usuário">
      <form onSubmit={sendInvite} className="space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="input" placeholder="usuario@email.com" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Perfil</label>
            <select value={role} onChange={e => { setRole(e.target.value); setCcId('') }} className="input">
              <option value="partner">Sócio (acessa tudo)</option>
              <option value="area_manager">Responsável de área</option>
            </select>
          </div>
          {role === 'area_manager' && (
            <div>
              <label className="label">Área</label>
              <select value={ccId} onChange={e => setCcId(e.target.value)} className="input" required>
                <option value="">Selecione...</option>
                {ccs.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button type="submit" disabled={sending} className="btn-primary">
          {sending ? 'Gerando...' : 'Gerar convite'}
        </button>
      </form>

      {/* Link gerado após criar convite */}
      {createdInvite && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800">
            ✅ Convite criado para <span className="font-bold">{createdInvite.email}</span>
          </p>
          <p className="text-xs text-green-700">
            {emailSent
              ? 'E-mail enviado automaticamente! O link também está disponível abaixo caso queira compartilhar por outro meio.'
              : 'Copie o link abaixo e envie para o usuário. Ao abrir, ele poderá criar a senha e acessar o sistema.'}
          </p>
          <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-600 flex-1 truncate font-mono">
              {inviteLink(createdInvite.token)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyLink(createdInvite.token, 'new')}
              className="flex-1 text-sm font-medium bg-kicks-navy text-white rounded-lg py-2 hover:bg-kicks-navy/90 transition-colors"
            >
              {copied === 'new' ? '✅ Copiado!' : '📋 Copiar link'}
            </button>
            <button
              onClick={() => openEmail(createdInvite)}
              className="flex-1 text-sm font-medium border border-kicks-navy text-kicks-navy rounded-lg py-2 hover:bg-gray-50 transition-colors"
            >
              ✉️ Abrir e-mail
            </button>
          </div>
        </div>
      )}

      {/* Convites pendentes */}
      {invites.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Convites pendentes</p>
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{inv.email}</p>
                    <p className="text-xs text-gray-400">
                      {ROLE_LABEL[inv.role]}
                      {inv.cost_centers && ` — ${inv.cost_centers.name}`}
                      {' • '}Expira {fmtDate(inv.expires_at?.split('T')[0])}
                    </p>
                  </div>
                  <button onClick={() => revokeInvite(inv.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0">
                    Revogar
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(inv.token, inv.id)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {copied === inv.id ? '✅ Copiado!' : '📋 Copiar link'}
                  </button>
                  <button
                    onClick={() => openEmail(inv)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    ✉️ Abrir e-mail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

