import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const now = new Date()
const DEFAULT_START = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`
const DEFAULT_END   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

export default function DREPage() {
  const [start,   setStart]   = useState(DEFAULT_START)
  const [end,     setEnd]     = useState(DEFAULT_END)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [start, end])

  async function load() {
    setLoading(true)
    const [{ data: ccs }, { data: txs }, { data: allocs }] = await Promise.all([
      supabase.from('cost_centers').select('id, name, code').eq('is_active', true).order('sort_order'),
      supabase.from('transactions').select('id, cost_center_id, type, amount, is_general, categories(name)')
        .eq('status', 'confirmed').gte('date', start).lte('date', end),
      supabase.from('transaction_allocations')
        .select('cost_center_id, amount, transactions!inner(date, status, is_general)')
        .eq('transactions.status', 'confirmed').eq('transactions.is_general', true)
        .gte('transactions.date', start).lte('transactions.date', end),
    ])

    const rows = (ccs || []).map(cc => {
      const ccTx      = (txs || []).filter(t => t.cost_center_id === cc.id && !t.is_general)
      const income    = ccTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense   = ccTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const allocated = (allocs || []).filter(a => a.cost_center_id === cc.id).reduce((s, a) => s + Number(a.amount), 0)

      // Detalhe por categoria
      const incomeDetail  = groupByCategory(ccTx.filter(t => t.type === 'income'))
      const expenseDetail = groupByCategory(ccTx.filter(t => t.type === 'expense'))

      return {
        ...cc,
        income,
        expense: expense + allocated,
        allocated,
        result: income - expense - allocated,
        incomeDetail,
        expenseDetail,
      }
    })

    const generalExpense = (txs || [])
      .filter(t => t.is_general && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0)

    const consolidated = {
      name:    'Consolidado',
      code:    'ALL',
      income:  rows.reduce((s, r) => s + r.income, 0),
      expense: rows.reduce((s, r) => s + r.expense, 0),
      result:  rows.reduce((s, r) => s + r.result, 0),
    }

    setData({ rows, consolidated, generalExpense })
    setLoading(false)
  }

  async function exportExcel() {
    if (!data) return
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs')
    const wb = XLSX.utils.book_new()
    const rows = [
      ['Centro de Custo', 'Receita', 'Despesa', 'Resultado'],
      ...data.rows.map(r => [r.name, r.income, r.expense, r.result]),
      [],
      ['Consolidado', data.consolidated.income, data.consolidated.expense, data.consolidated.result],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'DRE')
    XLSX.writeFile(wb, `DRE_ArenaKicks_${start}_${end}.xlsx`)
  }

  function exportPDF() {
    if (!data) return
    const content = buildPDFContent(data, start, end)
    const w = window.open('', '_blank')
    w.document.write(content)
    w.document.close()
    w.print()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-kicks-navy">DRE</h1>
          <p className="text-sm text-gray-500 mt-0.5">Demonstrativo de resultado por centro de custo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="btn-secondary text-sm flex items-center gap-1">📊 Excel</button>
          <button onClick={exportPDF}   className="btn-secondary text-sm flex items-center gap-1">📄 PDF</button>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex gap-3 flex-wrap">
        <div>
          <label className="label">De</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="input w-40" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input w-40" />
        </div>
      </div>

      {loading && <p className="text-center py-10 text-gray-400">Carregando...</p>}

      {!loading && data && (
        <>
          {/* Cards por CC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            {data.rows.map(cc => <DRECard key={cc.id} cc={cc} />)}
          </div>

          {/* Consolidado */}
          <div className="bg-kicks-navy text-white rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-white/70 mb-3">🏆 Consolidado Arena Kicks</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-white/60">Receita Total</p>
                <p className="font-bold text-green-300 text-lg">{fmt(data.consolidated.income)}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Despesa Total</p>
                <p className="font-bold text-red-300 text-lg">{fmt(data.consolidated.expense)}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">Resultado</p>
                <p className={`font-bold text-lg ${data.consolidated.result >= 0 ? 'text-white' : 'text-red-300'}`}>
                  {fmt(data.consolidated.result)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DRECard({ cc }) {
  const [open, setOpen] = useState(false)
  const isProfit = cc.result >= 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">{cc.name}</p>
        <div className="space-y-1.5">
          <Row label="Receita"  value={cc.income}  color="text-green-600" />
          <Row label="Despesa direta" value={cc.expense - cc.allocated} color="text-red-500" />
          {cc.allocated > 0 && <Row label="Rateio despesas gerais" value={cc.allocated} color="text-orange-500" />}
          <div className="border-t pt-1.5 mt-1.5">
            <div className="flex justify-between">
              <span className="text-sm font-bold text-gray-700">Resultado</span>
              <span className={`text-sm font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                {isProfit ? '+' : ''}{fmt(cc.result)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detalhamento */}
      {(cc.incomeDetail.length > 0 || cc.expenseDetail.length > 0) && (
        <div className="border-t border-gray-100">
          <button onClick={() => setOpen(o => !o)}
            className="w-full px-4 py-2 text-xs text-gray-400 hover:text-gray-600 text-left transition-colors">
            {open ? '▲ Ocultar detalhes' : '▼ Ver detalhes'}
          </button>
          {open && (
            <div className="px-4 pb-4 space-y-3">
              {cc.incomeDetail.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">Receitas por categoria</p>
                  {cc.incomeDetail.map(d => (
                    <div key={d.label} className="flex justify-between text-xs text-gray-600 py-0.5">
                      <span>{d.label}</span><span className="text-green-600">{fmt(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {cc.expenseDetail.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">Despesas por categoria</p>
                  {cc.expenseDetail.map(d => (
                    <div key={d.label} className="flex justify-between text-xs text-gray-600 py-0.5">
                      <span>{d.label}</span><span className="text-red-500">{fmt(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${color}`}>{fmt(value)}</span>
    </div>
  )
}

function groupByCategory(txs) {
  const map = {}
  txs.forEach(t => {
    const key = t.categories?.name || 'Sem categoria'
    map[key] = (map[key] || 0) + Number(t.amount)
  })
  return Object.entries(map).map(([label, amount]) => ({ label, amount }))
}

function buildPDFContent(data, start, end) {
  const rows = data.rows.map(cc => `
    <tr>
      <td>${cc.name}</td>
      <td class="green">${fmt(cc.income)}</td>
      <td class="red">${fmt(cc.expense)}</td>
      <td class="${cc.result >= 0 ? 'green' : 'red'}">${fmt(cc.result)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>DRE Arena Kicks</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
    h1 { color: #1a3a5c; } h2 { color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #1a3a5c; color: white; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    tr:last-child td { font-weight: bold; background: #f5f5f5; }
    .green { color: #16a34a; } .red { color: #dc2626; }
    .consolidated { background: #1a3a5c; color: white; padding: 15px 20px; border-radius: 8px; margin-top: 20px; }
    .consolidated span { margin-right: 30px; }
  </style></head><body>
  <h1>Arena Kicks Jacareí — DRE</h1>
  <h2>Período: ${fmtDate(start)} a ${fmtDate(end)}</h2>
  <table>
    <thead><tr><th>Centro de Custo</th><th>Receita</th><th>Despesa</th><th>Resultado</th></tr></thead>
    <tbody>${rows}
    <tr>
      <td><strong>Consolidado</strong></td>
      <td class="green"><strong>${fmt(data.consolidated.income)}</strong></td>
      <td class="red"><strong>${fmt(data.consolidated.expense)}</strong></td>
      <td class="${data.consolidated.result >= 0 ? 'green' : 'red'}"><strong>${fmt(data.consolidated.result)}</strong></td>
    </tr></tbody>
  </table>
  <p style="margin-top:30px;font-size:11px;color:#999">Gerado em ${new Date().toLocaleString('pt-BR')} — Arena Kicks Jacareí</p>
  </body></html>`
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
