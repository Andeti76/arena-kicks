import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fmt, fmtDate } from '../lib/format'

// ─── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]

const PAYMENT_METHODS = [
  { value: 'pix',      label: 'PIX' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'cash',     label: 'Dinheiro' },
  { value: 'card',     label: 'Cartão' },
  { value: 'boleto',   label: 'Boleto' },
  { value: 'other',    label: 'Outros' },
]

const EMPTY_FORM = {
  expense_date:   today(),
  cost_center_id: '',
  sub_area_id:    '',
  category_id:    '',
  description:    '',
  amount:         '',
  payment_method: 'pix',
  is_general:     false,
  supplier_name:  '',
  proof_note:     '',
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DespesasPage() {
  const { user } = useAuth()

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [tab, setTab] = useState('form')         // 'form' | 'list'
  const [costCenters, setCostCenters] = useState([])
  const [subAreas, setSubAreas] = useState([])
  const [categories, setCategories] = useState([])
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  // Rateio: { [cc_id]: percentage }
  const [alloc, setAlloc] = useState({})
  // Filtros do histórico
  const [filterMonth,  setFilterMonth]  = useState(defaultMonth)
  const [filterCC,     setFilterCC]     = useState('')

  // ── Busca dados de referência ──
  useEffect(() => {
    supabase.from('cost_centers').select('id, name, code').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCostCenters(data ?? []))
    supabase.from('expense_categories').select('id, name').order('sort_order')
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  // ── Sub-áreas ao trocar CC ──
  useEffect(() => {
    if (!form.cost_center_id || form.is_general) { setSubAreas([]); return }
    supabase.from('sub_areas').select('id, name')
      .eq('cost_center_id', form.cost_center_id).eq('is_active', true).order('sort_order')
      .then(({ data }) => setSubAreas(data ?? []))
  }, [form.cost_center_id, form.is_general])

  // ── Init rateio igualitário ao marcar "geral" ──
  useEffect(() => {
    if (form.is_general && costCenters.length > 0) {
      const pct = parseFloat((100 / costCenters.length).toFixed(2))
      const init = {}
      costCenters.forEach((cc, i) => {
        init[cc.id] = i === costCenters.length - 1
          ? (100 - pct * (costCenters.length - 1)).toFixed(2)
          : pct.toFixed(2)
      })
      setAlloc(init)
    } else {
      setAlloc({})
    }
  }, [form.is_general, costCenters])

  // ── Busca lista de despesas ──
  const loadExpenses = useCallback(async () => {
    setLoading(true)
    const [year, month] = filterMonth.split('-')
    const start = `${year}-${month}-01`
    const end   = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]

    let q = supabase
      .from('expenses')
      .select(`
        id, expense_date, description, amount, payment_method, is_general, supplier_name, proof_note,
        cost_centers ( name ),
        expense_categories ( name )
      `)
      .gte('expense_date', start)
      .lte('expense_date', end)
      .order('expense_date', { ascending: false })

    if (filterCC) q = q.eq('cost_center_id', filterCC)

    const { data } = await q
    setLoading(false)
    setExpenses(data ?? [])
  }, [filterMonth, filterCC])

  useEffect(() => {
    if (tab === 'list') loadExpenses()
  }, [tab, loadExpenses])

  // ── Handlers ──
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const totalAlloc = Object.values(alloc).reduce((s, v) => s + parseFloat(v || 0), 0)
  const allocValid = !form.is_general || Math.abs(totalAlloc - 100) < 0.1

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.expense_date || !form.description || !form.amount || !form.category_id) {
      setError('Preencha data, categoria, descrição e valor.')
      return
    }
    if (form.is_general && !allocValid) {
      setError(`O rateio deve somar 100%. Atual: ${totalAlloc.toFixed(1)}%`)
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)

    const payload = {
      expense_date:   form.expense_date,
      cost_center_id: form.is_general ? null : (form.cost_center_id || null),
      sub_area_id:    form.sub_area_id || null,
      category_id:    form.category_id,
      description:    form.description,
      amount:         parseFloat(form.amount),
      payment_method: form.payment_method,
      is_general:     form.is_general,
      supplier_name:  form.supplier_name || null,
      proof_note:     form.proof_note || null,
      created_by:     user?.id,
    }

    const { data: inserted, error: errIns } = await supabase
      .from('expenses')
      .insert(payload)
      .select('id')
      .single()

    if (errIns) { setSaving(false); setError(errIns.message); return }

    // Salva rateio se for geral
    if (form.is_general && inserted?.id) {
      const amt = parseFloat(form.amount)
      const allocRows = costCenters
        .filter(cc => parseFloat(alloc[cc.id] || 0) > 0)
        .map(cc => ({
          expense_id:     inserted.id,
          cost_center_id: cc.id,
          percentage:     parseFloat(alloc[cc.id]),
          amount:         parseFloat(((parseFloat(alloc[cc.id]) / 100) * amt).toFixed(2)),
        }))
      await supabase.from('expense_allocations').insert(allocRows)
    }

    setSaving(false)
    setSuccess(true)
    setForm({ ...EMPTY_FORM, expense_date: form.expense_date })
    setAlloc({})
    setTimeout(() => setSuccess(false), 3000)
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-kicks-navy">Despesas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Lançamento de custos por área
          </p>
        </div>
        <div className="flex gap-2">
          {['form', 'list'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-kicks-navy text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-kicks-navy'
              }`}
            >
              {t === 'form' ? 'Lançar' : 'Histórico'}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: FORMULÁRIO ── */}
      {tab === 'form' && (
        <form onSubmit={handleSave} className="space-y-5 max-w-2xl">

          {/* Identificação */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              Identificação
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Data</label>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={e => set('expense_date', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Categoria</label>
                <select
                  value={form.category_id}
                  onChange={e => set('category_id', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Selecione...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Despesa geral ou por área */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_general"
                checked={form.is_general}
                onChange={e => { set('is_general', e.target.checked); set('cost_center_id', ''); set('sub_area_id', '') }}
                className="h-4 w-4 rounded border-gray-300 text-kicks-navy"
              />
              <label htmlFor="is_general" className="text-sm text-gray-700">
                Despesa geral (rateio entre áreas)
              </label>
            </div>

            {!form.is_general && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Área</label>
                  <select
                    value={form.cost_center_id}
                    onChange={e => { set('cost_center_id', e.target.value); set('sub_area_id', '') }}
                    className="input-field"
                  >
                    <option value="">Selecione...</option>
                    {costCenters.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.name}</option>
                    ))}
                  </select>
                </div>
                {subAreas.length > 0 && (
                  <div>
                    <label className="label-field">Sub-área</label>
                    <select
                      value={form.sub_area_id}
                      onChange={e => set('sub_area_id', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Geral</option>
                      {subAreas.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rateio (se geral) */}
          {form.is_general && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <h2 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">
                Rateio entre Áreas
              </h2>
              <p className="text-xs text-amber-700">
                Distribua o percentual de custo por área. Total deve ser 100%.
              </p>
              <div className="space-y-2">
                {costCenters.map(cc => (
                  <div key={cc.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 shrink-0">{cc.name}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={alloc[cc.id] ?? ''}
                      onChange={e => setAlloc(prev => ({ ...prev, [cc.id]: e.target.value }))}
                      className="input-field w-24 text-right"
                    />
                    <span className="text-sm text-gray-500">%</span>
                    {form.amount && (
                      <span className="text-xs text-gray-400 ml-auto">
                        = {fmt((parseFloat(alloc[cc.id] || 0) / 100) * parseFloat(form.amount || 0))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className={`text-sm font-semibold ${allocValid ? 'text-green-700' : 'text-red-600'}`}>
                Total: {totalAlloc.toFixed(1)}% {allocValid ? '✓' : '⚠️'}
              </div>
            </div>
          )}

          {/* Valor e pagamento */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              Valor e Pagamento
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Forma de Pagamento</label>
                <select
                  value={form.payment_method}
                  onChange={e => set('payment_method', e.target.value)}
                  className="input-field"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label-field">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Compra de copos descartáveis para o Bar"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Fornecedor (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Atacadão, Posto Shell"
                  value={form.supplier_name}
                  onChange={e => set('supplier_name', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Nota do comprovante (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Comprovante no WhatsApp, pasta Junho"
                  value={form.proof_note}
                  onChange={e => set('proof_note', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              ✅ Despesa lançada com sucesso!
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-kicks-navy text-white font-semibold text-sm
                         hover:bg-kicks-navy/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : 'Lançar Despesa'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB: LISTA ── */}
      {tab === 'list' && (
        <div>
          {/* Filtros */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="label-field">Mês</label>
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="input-field w-40"
              />
            </div>
            <div>
              <label className="label-field">Área</label>
              <select
                value={filterCC}
                onChange={e => setFilterCC(e.target.value)}
                className="input-field w-44"
              >
                <option value="">Todas</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.name}</option>
                ))}
              </select>
            </div>
            {expenses.length > 0 && (
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total do período</p>
                <p className="text-lg font-bold text-red-600">
                  -{fmt(expenses.reduce((s, e) => s + Number(e.amount), 0))}
                </p>
                <p className="text-xs text-gray-400">{expenses.length} lançamento{expenses.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              Carregando...
            </div>
          )}
          {!loading && expenses.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">💸</p>
              <p className="font-medium">Nenhuma despesa encontrada</p>
              <p className="text-sm">Nenhum lançamento para o período e área selecionados.</p>
            </div>
          )}
          {!loading && expenses.length > 0 && (
            <div className="space-y-3 max-w-2xl">
              {expenses.map(exp => (
                <div
                  key={exp.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-kicks-navy text-sm truncate">
                        {exp.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs text-gray-500">{fmtDate(exp.expense_date)}</span>
                        {exp.expense_categories?.name && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {exp.expense_categories.name}
                          </span>
                        )}
                        {exp.is_general ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Geral
                          </span>
                        ) : exp.cost_centers?.name ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {exp.cost_centers.name}
                          </span>
                        ) : null}
                      </div>
                      {exp.supplier_name && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          🏪 {exp.supplier_name}
                        </p>
                      )}
                      {exp.proof_note && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{exp.proof_note}</p>
                      )}
                    </div>
                    <span className="font-bold text-red-600 text-sm shrink-0">
                      -{fmt(exp.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

