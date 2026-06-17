import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const today = () => new Date().toISOString().split('T')[0]

const PERIODICITY = [
  { value: 'mensal',  label: 'Mensal' },
  { value: 'anual',   label: 'Anual' },
  { value: 'pontual', label: 'Pontual' },
]

const TYPES = [
  { value: 'empresa',       label: 'Empresa' },
  { value: 'pessoa_fisica', label: 'Pessoa Física' },
]

const EMPTY_SPONSOR = {
  name:        '',
  type:        'empresa',
  contact:     '',
  amount:      '',
  periodicity: 'mensal',
  status:      'ativo',
  notes:       '',
}

const EMPTY_PAYMENT = {
  sponsor_id:   '',
  payment_date: today(),
  amount:       '',
  notes:        '',
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PatrocinadoresPage() {
  const { isOwner } = useAuth()

  const [tab, setTab]             = useState('lista')   // 'lista' | 'cadastro' | 'pagamento'
  const [sponsors, setSponsors]   = useState([])
  const [payments, setPayments]   = useState([])
  const [sponsorForm, setSponsorForm] = useState(EMPTY_SPONSOR)
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT)
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(null)
  const [editingId, setEditingId] = useState(null)

  // ── Busca patrocinadores ──
  const loadSponsors = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sponsors')
      .select('*')
      .order('status')
      .order('name')
    setSponsors(data ?? [])
    setLoading(false)
  }, [])

  // ── Busca pagamentos recentes ──
  const loadPayments = useCallback(async () => {
    const { data } = await supabase
      .from('sponsor_payments')
      .select('id, payment_date, amount, notes, sponsor_id, sponsors ( name )')
      .order('payment_date', { ascending: false })
      .limit(30)
    setPayments(data ?? [])
  }, [])

  useEffect(() => {
    loadSponsors()
    loadPayments()
  }, [loadSponsors, loadPayments])

  // ── Handlers formulário patrocinador ──
  const setS = (k, v) => setSponsorForm(prev => ({ ...prev, [k]: v }))
  const setP = (k, v) => setPaymentForm(prev => ({ ...prev, [k]: v }))

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleSaveSponsor = async (e) => {
    e.preventDefault()
    if (!sponsorForm.name) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError(null)

    const payload = {
      name:        sponsorForm.name,
      type:        sponsorForm.type,
      contact:     sponsorForm.contact || null,
      amount:      sponsorForm.amount ? parseFloat(sponsorForm.amount) : null,
      periodicity: sponsorForm.periodicity,
      status:      sponsorForm.status,
      notes:       sponsorForm.notes || null,
    }

    let err
    if (editingId) {
      ;({ error: err } = await supabase.from('sponsors').update(payload).eq('id', editingId))
    } else {
      ;({ error: err } = await supabase.from('sponsors').insert(payload))
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setSponsorForm(EMPTY_SPONSOR)
    setEditingId(null)
    await loadSponsors()
    flash(editingId ? 'Patrocinador atualizado!' : 'Patrocinador cadastrado!')
    setTab('lista')
  }

  const handleSavePayment = async (e) => {
    e.preventDefault()
    if (!paymentForm.sponsor_id || !paymentForm.amount) {
      setError('Selecione o patrocinador e informe o valor.')
      return
    }
    setSaving(true); setError(null)

    const { error: err } = await supabase.from('sponsor_payments').insert({
      sponsor_id:   paymentForm.sponsor_id,
      payment_date: paymentForm.payment_date,
      amount:       parseFloat(paymentForm.amount),
      notes:        paymentForm.notes || null,
    })

    setSaving(false)
    if (err) { setError(err.message); return }
    setPaymentForm(EMPTY_PAYMENT)
    await loadPayments()
    flash('Pagamento registrado!')
    setTab('lista')
  }

  const handleEdit = (sp) => {
    setSponsorForm({
      name:        sp.name,
      type:        sp.type ?? 'empresa',
      contact:     sp.contact ?? '',
      amount:      sp.amount ?? '',
      periodicity: sp.periodicity ?? 'mensal',
      status:      sp.status ?? 'ativo',
      notes:       sp.notes ?? '',
    })
    setEditingId(sp.id)
    setTab('cadastro')
  }

  // ── Totais ──
  const ativos = sponsors.filter(s => s.status === 'ativo')
  const totalMensal = ativos.reduce((sum, s) => {
    if (!s.amount) return sum
    if (s.periodicity === 'mensal') return sum + Number(s.amount)
    if (s.periodicity === 'anual')  return sum + Number(s.amount) / 12
    return sum
  }, 0)
  const totalRecebido = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-kicks-navy">Patrocinadores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestão de patrocínios e receitas não operacionais
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'lista',     label: 'Lista' },
            { id: 'pagamento', label: 'Registrar Pgto' },
            ...(isOwner ? [{ id: 'cadastro', label: editingId ? 'Editar' : '+ Novo' }] : []),
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-kicks-navy text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-kicks-navy'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback global */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          ✅ {success}
        </div>
      )}

      {/* ── TAB: LISTA ── */}
      {tab === 'lista' && (
        <div className="space-y-6 max-w-3xl">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Patrocinadores Ativos</p>
              <p className="text-2xl font-bold text-kicks-navy">{ativos.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Receita Mensal Estimada</p>
              <p className="text-2xl font-bold text-green-600">{fmt(totalMensal)}</p>
            </div>
          </div>

          {/* Lista patrocinadores */}
          {loading ? (
            <div className="text-center py-10 text-gray-400">Carregando...</div>
          ) : sponsors.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🤝</p>
              <p className="font-medium">Nenhum patrocinador cadastrado</p>
              {isOwner && (
                <p className="text-sm mt-1">Use o botão "+ Novo" para cadastrar.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sponsors.map(sp => (
                <div key={sp.id}
                  className={`bg-white rounded-xl border p-4 shadow-sm flex items-start justify-between gap-3
                    ${sp.status === 'inativo' ? 'opacity-50' : 'border-gray-100'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-kicks-navy text-sm">{sp.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${sp.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {sp.status}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {TYPES.find(t => t.value === sp.type)?.label ?? sp.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                      {sp.amount && (
                        <span className="font-semibold text-green-600">
                          {fmt(sp.amount)} / {PERIODICITY.find(p => p.value === sp.periodicity)?.label}
                        </span>
                      )}
                      {sp.contact && <span>📞 {sp.contact}</span>}
                    </div>
                    {sp.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{sp.notes}</p>
                    )}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleEdit(sp)}
                      className="text-xs text-gray-400 hover:text-kicks-navy transition-colors shrink-0 pt-0.5"
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagamentos recentes */}
          {payments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-kicks-navy uppercase tracking-wide mb-3">
                Pagamentos Recentes
              </h2>
              <div className="space-y-2">
                {payments.slice(0, 10).map(p => (
                  <div key={p.id}
                    className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-kicks-navy truncate">
                        {p.sponsors?.name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">{fmtDateBR(p.payment_date)}{p.notes ? ` · ${p.notes}` : ''}</p>
                    </div>
                    <span className="font-bold text-green-600 text-sm shrink-0">+{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">
                Total registrado: <span className="font-semibold text-green-600">{fmt(totalRecebido)}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CADASTRO ── */}
      {tab === 'cadastro' && isOwner && (
        <form onSubmit={handleSaveSponsor} className="space-y-5 max-w-xl">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              {editingId ? 'Editar Patrocinador' : 'Novo Patrocinador'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label-field">Nome *</label>
                <input
                  type="text"
                  placeholder="Ex: Empresa ABC Ltda"
                  value={sponsorForm.name}
                  onChange={e => setS('name', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Tipo</label>
                <select value={sponsorForm.type} onChange={e => setS('type', e.target.value)} className="input-field">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Status</label>
                <select value={sponsorForm.status} onChange={e => setS('status', e.target.value)} className="input-field">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div>
                <label className="label-field">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={sponsorForm.amount}
                  onChange={e => setS('amount', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Periodicidade</label>
                <select value={sponsorForm.periodicity} onChange={e => setS('periodicity', e.target.value)} className="input-field">
                  {PERIODICITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label-field">Contato (opcional)</label>
                <input
                  type="text"
                  placeholder="Telefone, e-mail ou nome do responsável"
                  value={sponsorForm.contact}
                  onChange={e => setS('contact', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="col-span-2">
                <label className="label-field">Observações (opcional)</label>
                <input
                  type="text"
                  placeholder="Detalhes do contrato, condições, etc."
                  value={sponsorForm.notes}
                  onChange={e => setS('notes', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            {editingId && (
              <button
                type="button"
                onClick={() => { setSponsorForm(EMPTY_SPONSOR); setEditingId(null); setTab('lista') }}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-gray-400 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-kicks-navy text-white font-semibold text-sm
                         hover:bg-kicks-navy/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB: REGISTRAR PAGAMENTO ── */}
      {tab === 'pagamento' && (
        <form onSubmit={handleSavePayment} className="space-y-5 max-w-xl">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              Registrar Pagamento Recebido
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label-field">Patrocinador *</label>
                <select
                  value={paymentForm.sponsor_id}
                  onChange={e => setP('sponsor_id', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Selecione...</option>
                  {sponsors.filter(s => s.status === 'ativo').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Data *</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={e => setP('payment_date', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={paymentForm.amount}
                  onChange={e => setP('amount', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="label-field">Observações (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Referente a maio/2026, PIX recebido"
                  value={paymentForm.notes}
                  onChange={e => setP('notes', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Sugestão de valor se patrocinador selecionado */}
          {paymentForm.sponsor_id && (() => {
            const sp = sponsors.find(s => s.id === paymentForm.sponsor_id)
            if (!sp?.amount) return null
            return (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 text-sm text-blue-700 flex items-center justify-between">
                <span>Valor contratado: <strong>{fmt(sp.amount)}</strong> / {PERIODICITY.find(p => p.value === sp.periodicity)?.label}</span>
                <button
                  type="button"
                  onClick={() => setP('amount', sp.amount)}
                  className="text-xs underline ml-3 hover:text-blue-900"
                >
                  Usar este valor
                </button>
              </div>
            )
          })()}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-kicks-navy text-white font-semibold text-sm
                         hover:bg-kicks-navy/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : 'Registrar Pagamento'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function fmtDateBR(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
