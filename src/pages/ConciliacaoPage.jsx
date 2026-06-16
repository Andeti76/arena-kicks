import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const today = () => new Date().toISOString().split('T')[0]

const STATUS_LABEL = {
  pending:     { text: 'Pendente',     cls: 'bg-yellow-100 text-yellow-700' },
  ok:          { text: 'Conciliado',   cls: 'bg-green-100 text-green-700' },
  discrepancy: { text: 'Divergência',  cls: 'bg-red-100 text-red-700' },
}

const EMPTY_FORM = {
  report_date: today(),
  cost_center_id: '',
  sub_area_id: '',
  sys_cash: '',
  sys_debit: '',
  sys_credit: '',
  sys_pix: '',
  sys_cashless: '',
  sys_other: '',
  maq_debit: '',
  maq_credit: '',
  maq_pix: '',
  cash_counted: '',
  notes: '',
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ConciliacaoPage() {
  const { user } = useAuth()

  const [tab, setTab] = useState('form')          // 'form' | 'history'
  const [costCenters, setCostCenters] = useState([])
  const [subAreas, setSubAreas] = useState([])
  const [history, setHistory] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [existingId, setExistingId] = useState(null)   // para upsert

  // ── Busca centros de custo ──
  useEffect(() => {
    supabase
      .from('cost_centers')
      .select('id, name, code')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setCostCenters(data ?? []))
  }, [])

  // ── Busca sub-áreas ao trocar CC ──
  useEffect(() => {
    if (!form.cost_center_id) { setSubAreas([]); return }
    supabase
      .from('sub_areas')
      .select('id, name')
      .eq('cost_center_id', form.cost_center_id)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setSubAreas(data ?? []))
  }, [form.cost_center_id])

  // ── Verifica se já existe registro para data+CC+sub_area ──
  useEffect(() => {
    if (!form.report_date || !form.cost_center_id) { setExistingId(null); return }
    const query = supabase
      .from('daily_reports')
      .select('*')
      .eq('report_date', form.report_date)
      .eq('cost_center_id', form.cost_center_id)

    if (form.sub_area_id) {
      query.eq('sub_area_id', form.sub_area_id)
    } else {
      query.is('sub_area_id', null)
    }

    query.maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id)
        setForm(prev => ({
          ...prev,
          sys_cash:     String(data.sys_cash     ?? ''),
          sys_debit:    String(data.sys_debit    ?? ''),
          sys_credit:   String(data.sys_credit   ?? ''),
          sys_pix:      String(data.sys_pix      ?? ''),
          sys_cashless: String(data.sys_cashless ?? ''),
          sys_other:    String(data.sys_other    ?? ''),
          maq_debit:    String(data.maq_debit    ?? ''),
          maq_credit:   String(data.maq_credit   ?? ''),
          maq_pix:      String(data.maq_pix      ?? ''),
          cash_counted: String(data.cash_counted ?? ''),
          notes:        data.notes ?? '',
        }))
      } else {
        setExistingId(null)
        setForm(prev => ({
          ...prev,
          sys_cash: '', sys_debit: '', sys_credit: '', sys_pix: '',
          sys_cashless: '', sys_other: '', maq_debit: '', maq_credit: '',
          maq_pix: '', cash_counted: '', notes: '',
        }))
      }
    })
  }, [form.report_date, form.cost_center_id, form.sub_area_id])

  // ── Busca histórico ──
  const loadHistory = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_reports')
      .select(`
        id, report_date, status, sys_total, maq_total, cash_counted, notes,
        cost_centers ( name, code ),
        sub_areas ( name )
      `)
      .order('report_date', { ascending: false })
      .limit(30)
    setLoading(false)
    if (!error) setHistory(data ?? [])
  }, [])

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab, loadHistory])

  // ── Handlers ──
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const n = (v) => parseFloat(v || 0)

  const sysTotal = n(form.sys_cash) + n(form.sys_debit) + n(form.sys_credit) +
    n(form.sys_pix) + n(form.sys_cashless) + n(form.sys_other)
  const maqTotal = n(form.maq_debit) + n(form.maq_credit) + n(form.maq_pix)

  const diffDebit  = Math.abs(n(form.sys_debit)  - n(form.maq_debit))
  const diffCredit = Math.abs(n(form.sys_credit) - n(form.maq_credit))
  const diffPix    = Math.abs(n(form.sys_pix)    - n(form.maq_pix))
  const previewStatus =
    form.sys_debit === '' && form.maq_debit === '' ? null
    : (diffDebit < 0.01 && diffCredit < 0.01 && diffPix < 0.01) ? 'ok' : 'discrepancy'

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.report_date || !form.cost_center_id) {
      setError('Selecione a data e o centro de custo.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)

    const payload = {
      report_date:    form.report_date,
      cost_center_id: form.cost_center_id,
      sub_area_id:    form.sub_area_id || null,
      sys_cash:       n(form.sys_cash),
      sys_debit:      n(form.sys_debit),
      sys_credit:     n(form.sys_credit),
      sys_pix:        n(form.sys_pix),
      sys_cashless:   n(form.sys_cashless),
      sys_other:      n(form.sys_other),
      maq_debit:      n(form.maq_debit),
      maq_credit:     n(form.maq_credit),
      maq_pix:        n(form.maq_pix),
      cash_counted:   n(form.cash_counted),
      notes:          form.notes || null,
      created_by:     user?.id,
    }

    let err
    if (existingId) {
      const res = await supabase
        .from('daily_reports')
        .update(payload)
        .eq('id', existingId)
      err = res.error
    } else {
      const res = await supabase
        .from('daily_reports')
        .insert(payload)
      err = res.error
    }

    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-kicks-navy">Conciliação Diária</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sistema vs maquininha vs dinheiro físico
          </p>
        </div>
        <div className="flex gap-2">
          {['form', 'history'].map(t => (
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

          {/* Seleção: data + área */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              Identificação
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Data</label>
                <input
                  type="date"
                  value={form.report_date}
                  onChange={e => set('report_date', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label-field">Centro de Custo</label>
                <select
                  value={form.cost_center_id}
                  onChange={e => { set('cost_center_id', e.target.value); set('sub_area_id', '') }}
                  className="input-field"
                  required
                >
                  <option value="">Selecione...</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {subAreas.length > 0 && (
              <div>
                <label className="label-field">Sub-área (opcional)</label>
                <select
                  value={form.sub_area_id}
                  onChange={e => set('sub_area_id', e.target.value)}
                  className="input-field"
                >
                  <option value="">Geral (sem sub-área)</option>
                  {subAreas.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {existingId && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ Já existe um registro para esta data/área. Salvar irá <strong>atualizar</strong>.
              </p>
            )}
          </div>

          {/* Valores do Sistema */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              Relatório do Sistema (MIP / planilha)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { key: 'sys_cash',     label: 'Dinheiro' },
                { key: 'sys_debit',    label: 'Débito' },
                { key: 'sys_credit',   label: 'Crédito' },
                { key: 'sys_pix',      label: 'PIX' },
                { key: 'sys_cashless', label: 'Cashless' },
                { key: 'sys_other',    label: 'Outros' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <span className="text-sm font-semibold text-kicks-navy">
                Total sistema: {fmt(sysTotal)}
              </span>
            </div>
          </div>

          {/* Valores da Maquininha */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              Fechamento da Maquininha
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'maq_debit',  label: 'Débito' },
                { key: 'maq_credit', label: 'Crédito' },
                { key: 'maq_pix',    label: 'PIX' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <span className="text-sm font-semibold text-kicks-navy">
                Total maquininha: {fmt(maqTotal)}
              </span>
            </div>
          </div>

          {/* Comparativo em tempo real */}
          {previewStatus && (
            <div className={`rounded-xl border p-4 space-y-2 ${
              previewStatus === 'ok'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{previewStatus === 'ok' ? '✅' : '⚠️'}</span>
                <span className={`font-semibold text-sm ${previewStatus === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                  {previewStatus === 'ok' ? 'Valores conferem!' : 'Há divergência nos valores'}
                </span>
              </div>
              {previewStatus === 'discrepancy' && (
                <div className="text-xs space-y-1 text-red-600">
                  {diffDebit  >= 0.01 && <p>Débito:  sistema {fmt(form.sys_debit)}  vs maquininha {fmt(form.maq_debit)}  → Δ {fmt(diffDebit)}</p>}
                  {diffCredit >= 0.01 && <p>Crédito: sistema {fmt(form.sys_credit)} vs maquininha {fmt(form.maq_credit)} → Δ {fmt(diffCredit)}</p>}
                  {diffPix    >= 0.01 && <p>PIX:     sistema {fmt(form.sys_pix)}    vs maquininha {fmt(form.maq_pix)}    → Δ {fmt(diffPix)}</p>}
                </div>
              )}
            </div>
          )}

          {/* Dinheiro físico + notas */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-kicks-navy text-sm uppercase tracking-wide">
              Contagem Física
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Dinheiro contado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.cash_counted}
                  onChange={e => set('cash_counted', e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label-field">Observações</label>
                <input
                  type="text"
                  placeholder="Ex: cliente pagou errado no pix..."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
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
              ✅ Conciliação salva com sucesso!
            </div>
          )}

          {/* Botão salvar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-kicks-navy text-white font-semibold text-sm
                         hover:bg-kicks-navy/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : existingId ? 'Atualizar Conciliação' : 'Salvar Conciliação'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB: HISTÓRICO ── */}
      {tab === 'history' && (
        <div>
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              Carregando...
            </div>
          )}
          {!loading && history.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">Nenhum registro encontrado</p>
              <p className="text-sm">Lance a primeira conciliação pela aba "Lançar".</p>
            </div>
          )}
          {!loading && history.length > 0 && (
            <div className="space-y-3 max-w-2xl">
              {history.map(r => {
                const sl = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm
                               flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-kicks-navy text-sm">
                          {r.cost_centers?.name}
                          {r.sub_areas?.name ? ` — ${r.sub_areas.name}` : ''}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sl.cls}`}>
                          {sl.text}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{fmtDateBR(r.report_date)}</span>
                        <span>Sistema: {fmt(r.sys_total)}</span>
                        <span>Maq: {fmt(r.maq_total)}</span>
                      </div>
                      {r.notes && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{r.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setTab('form')
                        setForm(prev => ({
                          ...prev,
                          report_date:    r.report_date,
                          cost_center_id: r.cost_centers?.id ?? prev.cost_center_id,
                        }))
                      }}
                      className="text-xs text-kicks-navy font-medium hover:underline shrink-0"
                    >
                      Editar
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function fmtDateBR(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
