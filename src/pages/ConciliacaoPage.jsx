import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fmt as fmtBRL, fmtDate as fmtDateBR } from '../lib/format'

const today = () => new Date().toISOString().split('T')[0]

const STATUS_LABEL = {
  pending:     { text: 'Pendente',    cls: 'badge-pending' },
  ok:          { text: 'Conciliado',  cls: 'badge-ok' },
  discrepancy: { text: 'Divergência', cls: 'badge-disc' },
}

const EMPTY_FORM = {
  report_date: today(), cost_center_id: '', sub_area_id: '',
  sys_cash: '', sys_debit: '', sys_credit: '', sys_pix: '', sys_cashless: '', sys_other: '',
  maq_debit: '', maq_credit: '', maq_pix: '',
  cash_counted: '', notes: '',
}

// ─── Live Panel ───────────────────────────────────────────────────────────────
function LivePanel({ sysTotal, maqTotal, cashCounted, previewStatus, diffDebit, diffCredit, diffPix }) {
  const diff = Math.abs(sysTotal - maqTotal)
  const isOk   = previewStatus === 'ok'
  const isDisc = previewStatus === 'discrepancy'

  const panelColor = isOk ? '#059669' : isDisc ? '#dc2626' : '#6b7280'
  const panelBg    = isOk ? '#f0fdf4' : isDisc ? '#fef2f2' : '#f9fafb'
  const panelBorder = isOk ? '#bbf7d0' : isDisc ? '#fecaca' : '#e5e7eb'

  return (
    <div style={{
      background: panelBg,
      border: `1.5px solid ${panelBorder}`,
      borderRadius: '20px',
      padding: '20px',
      position: 'sticky',
      top: '24px',
      transition: 'all 0.3s ease',
    }}>
      {/* Status principal */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px', lineHeight: 1 }}>
          {isOk ? '✅' : isDisc ? '⚠️' : '🕐'}
        </div>
        <p style={{ fontWeight: 800, fontSize: '16px', color: panelColor }}>
          {isOk ? 'Valores conferem!' : isDisc ? 'Divergência detectada' : 'Aguardando dados...'}
        </p>
        {isOk && (
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Sistema e maquininha estão alinhados
          </p>
        )}
      </div>

      {/* Grid de valores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <PanelRow
          label="Total Sistema"
          value={fmtBRL(sysTotal)}
          color="#0B2238"
          icon="💻"
        />
        <PanelRow
          label="Total Maquininha"
          value={fmtBRL(maqTotal)}
          color="#0B2238"
          icon="🖨️"
        />
        {Number(cashCounted) > 0 && (
          <PanelRow
            label="Dinheiro Físico"
            value={fmtBRL(cashCounted)}
            color="#0B2238"
            icon="💵"
          />
        )}
        <div style={{ height: '1px', background: panelBorder, margin: '4px 0' }} />
        <PanelRow
          label="Diferença"
          value={fmtBRL(diff)}
          color={diff < 0.01 ? '#059669' : '#dc2626'}
          icon={diff < 0.01 ? '✔' : '✖'}
          bold
        />
      </div>

      {/* Detalhes de divergência */}
      {isDisc && (
        <div style={{
          marginTop: '16px',
          background: 'rgba(220,38,38,0.06)',
          borderRadius: '12px',
          padding: '12px',
          fontSize: '12px',
          color: '#dc2626',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {diffDebit  >= 0.01 && <p>• Débito: Δ {fmtBRL(diffDebit)}</p>}
          {diffCredit >= 0.01 && <p>• Crédito: Δ {fmtBRL(diffCredit)}</p>}
          {diffPix    >= 0.01 && <p>• PIX: Δ {fmtBRL(diffPix)}</p>}
        </div>
      )}
    </div>
  )
}

function PanelRow({ label, value, color, icon, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{icon}</span> {label}
      </span>
      <span style={{ fontSize: '14px', fontWeight: bold ? 800 : 600, color, letterSpacing: '-0.3px' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ConciliacaoPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('form')
  const [costCenters, setCostCenters] = useState([])
  const [subAreas, setSubAreas] = useState([])
  const [history, setHistory] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [existingId, setExistingId] = useState(null)

  useEffect(() => {
    supabase.from('cost_centers').select('id, name, code').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCostCenters(data ?? []))
  }, [])

  useEffect(() => {
    if (!form.cost_center_id) { setSubAreas([]); return }
    supabase.from('sub_areas').select('id, name').eq('cost_center_id', form.cost_center_id)
      .eq('is_active', true).order('sort_order')
      .then(({ data }) => setSubAreas(data ?? []))
  }, [form.cost_center_id])

  useEffect(() => {
    if (!form.report_date || !form.cost_center_id) { setExistingId(null); return }
    const q = supabase.from('daily_reports').select('*')
      .eq('report_date', form.report_date).eq('cost_center_id', form.cost_center_id)
    if (form.sub_area_id) q.eq('sub_area_id', form.sub_area_id)
    else q.is('sub_area_id', null)
    q.maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id)
        setForm(prev => ({
          ...prev,
          sys_cash: String(data.sys_cash ?? ''), sys_debit: String(data.sys_debit ?? ''),
          sys_credit: String(data.sys_credit ?? ''), sys_pix: String(data.sys_pix ?? ''),
          sys_cashless: String(data.sys_cashless ?? ''), sys_other: String(data.sys_other ?? ''),
          maq_debit: String(data.maq_debit ?? ''), maq_credit: String(data.maq_credit ?? ''),
          maq_pix: String(data.maq_pix ?? ''), cash_counted: String(data.cash_counted ?? ''),
          notes: data.notes ?? '',
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

  const loadHistory = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_reports')
      .select('id, report_date, status, sys_total, maq_total, cash_counted, notes, cost_centers(name,code), sub_areas(name)')
      .order('report_date', { ascending: false }).limit(30)
    setLoading(false)
    if (!error) setHistory(data ?? [])
  }, [])

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab, loadHistory])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const n   = (v) => parseFloat(v || 0)

  const sysTotal   = n(form.sys_cash) + n(form.sys_debit) + n(form.sys_credit) + n(form.sys_pix) + n(form.sys_cashless) + n(form.sys_other)
  const maqTotal   = n(form.maq_debit) + n(form.maq_credit) + n(form.maq_pix)
  const diffDebit  = Math.abs(n(form.sys_debit)  - n(form.maq_debit))
  const diffCredit = Math.abs(n(form.sys_credit) - n(form.maq_credit))
  const diffPix    = Math.abs(n(form.sys_pix)    - n(form.maq_pix))

  const previewStatus =
    form.sys_debit === '' && form.maq_debit === '' ? null
    : (diffDebit < 0.01 && diffCredit < 0.01 && diffPix < 0.01) ? 'ok' : 'discrepancy'

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.report_date || !form.cost_center_id) { setError('Selecione a data e o centro de custo.'); return }
    setSaving(true); setError(null); setSuccess(false)
    const payload = {
      report_date: form.report_date, cost_center_id: form.cost_center_id,
      sub_area_id: form.sub_area_id || null,
      sys_cash: n(form.sys_cash), sys_debit: n(form.sys_debit), sys_credit: n(form.sys_credit),
      sys_pix: n(form.sys_pix), sys_cashless: n(form.sys_cashless), sys_other: n(form.sys_other),
      maq_debit: n(form.maq_debit), maq_credit: n(form.maq_credit), maq_pix: n(form.maq_pix),
      cash_counted: n(form.cash_counted), notes: form.notes || null, created_by: user?.id,
    }
    let err
    if (existingId) {
      const res = await supabase.from('daily_reports').update(payload).eq('id', existingId)
      err = res.error
    } else {
      const res = await supabase.from('daily_reports').insert(payload)
      err = res.error
    }
    setSaving(false)
    if (err) { setError(err.message) }
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0B2238', letterSpacing: '-0.5px' }}>
            Conciliação Diária
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            Sistema vs maquininha vs dinheiro físico
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['form', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={tab === t ? 'tab-btn tab-btn-active' : 'tab-btn tab-btn-inactive'}>
              {t === 'form' ? 'Lançar' : 'Histórico'}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: FORMULÁRIO ── */}
      {tab === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="lg:grid-cols-3">

          {/* ── Coluna form (2/3) ── */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="lg:col-span-2">

            {/* Identificação */}
            <div className="card-section" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
              <p className="section-title">Identificação</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label-field">Data</label>
                  <input type="date" value={form.report_date}
                    onChange={e => set('report_date', e.target.value)} className="input-field" required />
                </div>
                <div>
                  <label className="label-field">Centro de Custo</label>
                  <select value={form.cost_center_id}
                    onChange={e => { set('cost_center_id', e.target.value); set('sub_area_id', '') }}
                    className="input-field" required>
                    <option value="">Selecione...</option>
                    {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>
              </div>
              {subAreas.length > 0 && (
                <div>
                  <label className="label-field">Sub-área</label>
                  <select value={form.sub_area_id} onChange={e => set('sub_area_id', e.target.value)} className="input-field">
                    <option value="">Geral (sem sub-área)</option>
                    {subAreas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {existingId && (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: '10px', padding: '10px 14px',
                  fontSize: '13px', color: '#92400e',
                }}>
                  ⚠️ Registro existente — salvar irá <strong>atualizar</strong>.
                </div>
              )}
            </div>

            {/* Sistema */}
            <div className="card-section" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
              <p className="section-title">Relatório do Sistema</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
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
                    <input type="number" step="0.01" min="0" placeholder="0,00"
                      value={form[key]} onChange={e => set(key, e.target.value)} className="input-field" />
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0B2238' }}>
                  Total: {fmtBRL(sysTotal)}
                </span>
              </div>
            </div>

            {/* Maquininha */}
            <div className="card-section" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
              <p className="section-title">Fechamento da Maquininha</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { key: 'maq_debit',  label: 'Débito' },
                  { key: 'maq_credit', label: 'Crédito' },
                  { key: 'maq_pix',    label: 'PIX' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="label-field">{label}</label>
                    <input type="number" step="0.01" min="0" placeholder="0,00"
                      value={form[key]} onChange={e => set(key, e.target.value)} className="input-field" />
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0B2238' }}>
                  Total: {fmtBRL(maqTotal)}
                </span>
              </div>
            </div>

            {/* Contagem física */}
            <div className="card-section" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
              <p className="section-title">Contagem Física</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="label-field">Dinheiro Contado (R$)</label>
                  <input type="number" step="0.01" min="0" placeholder="0,00"
                    value={form.cash_counted} onChange={e => set('cash_counted', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label-field">Observações</label>
                  <input type="text" placeholder="Ex: cliente pagou errado..."
                    value={form.notes} onChange={e => set('notes', e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px', color: '#059669', fontSize: '13px', fontWeight: 600 }}>
                ✅ Conciliação salva com sucesso!
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ minWidth: '180px', padding: '12px 24px', fontSize: '14px' }}>
                {saving ? 'Salvando...' : existingId ? '↻ Atualizar Conciliação' : '✓ Salvar Conciliação'}
              </button>
            </div>
          </form>

          {/* ── Coluna painel ao vivo (1/3) ── */}
          <div>
            <p className="section-title" style={{ marginBottom: '12px' }}>Painel ao Vivo</p>
            <LivePanel
              sysTotal={sysTotal}
              maqTotal={maqTotal}
              cashCounted={form.cash_counted}
              previewStatus={previewStatus}
              diffDebit={diffDebit}
              diffCredit={diffCredit}
              diffPix={diffPix}
            />
          </div>
        </div>
      )}

      {/* ── TAB: HISTÓRICO ── */}
      {tab === 'history' && (
        <div>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>Carregando...</div>
          )}
          {!loading && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>📋</p>
              <p style={{ fontWeight: 600, color: '#6b7280' }}>Nenhum registro</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Lance a primeira conciliação pela aba "Lançar".</p>
            </div>
          )}
          {!loading && history.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '720px' }}>
              {history.map(r => {
                const sl = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending
                return (
                  <div key={r.id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#0B2238' }}>
                          {r.cost_centers?.name}{r.sub_areas?.name ? ` — ${r.sub_areas.name}` : ''}
                        </span>
                        <span className={`badge ${sl.cls}`}>{sl.text}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                        <span>{fmtDateBR(r.report_date)}</span>
                        <span>Sistema: {fmtBRL(r.sys_total)}</span>
                        <span>Maq: {fmtBRL(r.maq_total)}</span>
                      </div>
                      {r.notes && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{r.notes}</p>}
                    </div>
                    <button
                      onClick={() => {
                        setTab('form')
                        setForm(prev => ({
                          ...prev,
                          report_date: r.report_date,
                          cost_center_id: r.cost_centers?.id ?? prev.cost_center_id,
                        }))
                      }}
                      style={{ fontSize: '12px', color: '#0B2238', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Editar →
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

