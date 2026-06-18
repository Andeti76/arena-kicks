import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { fmt, fmtDate } from '../lib/format'

const now = new Date()
const DEFAULT_START = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
const DEFAULT_END   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

function prevMonthRange(start) {
  const d = new Date(start)
  const prevEnd   = new Date(d.getFullYear(), d.getMonth(), 0)
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1)
  return {
    prevStart: prevStart.toISOString().split('T')[0],
    prevEnd:   prevEnd.toISOString().split('T')[0],
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DREPage() {
  const [start,   setStart]   = useState(DEFAULT_START)
  const [end,     setEnd]     = useState(DEFAULT_END)
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [start, end])

  async function load() {
    setLoading(true)

    const { prevStart, prevEnd } = prevMonthRange(start)

    // ── Fase 1: busca paralela sem dependência de IDs ──
    const [
      { data: ccs },
      { data: reports },
      { data: prevReports },
      { data: expenses },
      { data: prevExpenses },
      { data: sponsorPayments },
      { data: prevSponsorPayments },
    ] = await Promise.all([
      // Centros de custo
      supabase.from('cost_centers').select('id, name, code').eq('is_active', true).order('sort_order'),

      // Receita período atual (daily_reports)
      supabase.from('daily_reports')
        .select('cost_center_id, sys_total')
        .gte('report_date', start).lte('report_date', end),

      // Receita período anterior
      supabase.from('daily_reports')
        .select('cost_center_id, sys_total')
        .gte('report_date', prevStart).lte('report_date', prevEnd),

      // Despesas período atual
      supabase.from('expenses')
        .select('id, cost_center_id, amount, is_general, expense_categories(name)')
        .gte('expense_date', start).lte('expense_date', end),

      // Despesas período anterior
      supabase.from('expenses')
        .select('id, cost_center_id, amount, is_general')
        .gte('expense_date', prevStart).lte('expense_date', prevEnd),

      // Patrocínio período atual
      supabase.from('sponsor_payments')
        .select('amount')
        .gte('payment_date', start).lte('payment_date', end),

      // Patrocínio período anterior
      supabase.from('sponsor_payments')
        .select('amount')
        .gte('payment_date', prevStart).lte('payment_date', prevEnd),
    ])

    // ── Fase 2: alocações filtradas por expense_id do período ──
    const generalExpenseIds     = (expenses     ?? []).filter(e => e.is_general).map(e => e.id).filter(Boolean)
    const prevGeneralExpenseIds = (prevExpenses ?? []).filter(e => e.is_general).map(e => e.id).filter(Boolean)

    const [{ data: allocations }, { data: prevAllocations }] = await Promise.all([
      generalExpenseIds.length > 0
        ? supabase.from('expense_allocations')
            .select('cost_center_id, amount, expense_id')
            .in('expense_id', generalExpenseIds)
        : Promise.resolve({ data: [] }),
      prevGeneralExpenseIds.length > 0
        ? supabase.from('expense_allocations')
            .select('cost_center_id, amount, expense_id')
            .in('expense_id', prevGeneralExpenseIds)
        : Promise.resolve({ data: [] }),
    ])

    const generalIds     = new Set(generalExpenseIds)
    const prevGeneralIds = new Set(prevGeneralExpenseIds)

    const currentAllocs = (allocations    ?? []).filter(a => generalIds.has(a.expense_id))
    const prevAllocs    = (prevAllocations ?? []).filter(a => prevGeneralIds.has(a.expense_id))

    const rows = (ccs ?? []).map(cc => {
      // Receita
      const income     = sum(reports,     r => r.cost_center_id === cc.id, r => r.sys_total)
      const prevIncome = sum(prevReports, r => r.cost_center_id === cc.id, r => r.sys_total)

      // Despesas diretas (não gerais)
      const directExp     = sum(expenses,     e => e.cost_center_id === cc.id && !e.is_general, e => e.amount)
      const prevDirectExp = sum(prevExpenses, e => e.cost_center_id === cc.id && !e.is_general, e => e.amount)

      // Rateio de despesas gerais
      const allocated     = sum(currentAllocs, a => a.cost_center_id === cc.id, a => a.amount)
      const prevAllocated = sum(prevAllocs,    a => a.cost_center_id === cc.id, a => a.amount)

      const expense     = directExp + allocated
      const prevExpense = prevDirectExp + prevAllocated
      const result      = income - expense
      const prevResult  = prevIncome - prevExpense

      // Detalhamento de despesas por categoria
      const expenseDetail = groupByCategory(
        (expenses ?? []).filter(e => e.cost_center_id === cc.id && !e.is_general)
      )

      return {
        id: cc.id, name: cc.name, code: cc.code,
        income, prevIncome,
        directExp, allocated, expense, prevExpense,
        result, prevResult,
        expenseDetail,
      }
    })

    const sponsorIncome     = (sponsorPayments     ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
    const prevSponsorIncome = (prevSponsorPayments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)

    const totalIncome  = rows.reduce((s, r) => s + r.income,   0)
    const totalExpense = rows.reduce((s, r) => s + r.expense,  0)

    const consolidated = {
      income:             totalIncome,
      sponsorIncome,
      expense:            totalExpense,
      result:             totalIncome + sponsorIncome - totalExpense,
      prevIncome:         rows.reduce((s, r) => s + r.prevIncome, 0),
      prevSponsorIncome,
      prevResult:         rows.reduce((s, r) => s + r.prevIncome, 0) + prevSponsorIncome - rows.reduce((s, r) => s + r.prevExpense, 0),
    }

    setData({ rows, consolidated, start, end, prevStart, prevEnd })
    setLoading(false)
  }

  function exportExcel() {
    if (!data) return
    const wb = XLSX.utils.book_new()
    const aoa = [
      [`DRE Arena Kicks — ${fmtDate(data.start)} a ${fmtDate(data.end)}`],
      [],
      ['Centro de Custo', 'Receita Op.', 'Desp. Direta', 'Rateio', 'Desp. Total', 'Resultado'],
      ...data.rows.map(r => [r.name, r.income, r.directExp, r.allocated, r.expense, r.result]),
      ...(data.consolidated.sponsorIncome > 0
        ? [['Patrocínio', data.consolidated.sponsorIncome, '', '', '', data.consolidated.sponsorIncome]]
        : []),
      [],
      ['TOTAL', data.consolidated.income + data.consolidated.sponsorIncome, '', '', data.consolidated.expense, data.consolidated.result],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, 'DRE')
    XLSX.writeFile(wb, `DRE_ArenaKicks_${data.start}_${data.end}.xlsx`)
  }

  function exportPDF() {
    if (!data) return
    const w = window.open('', '_blank')
    w.document.write(buildPDF(data))
    w.document.close()
    w.print()
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-kicks-navy">DRE</h1>
          <p className="text-sm text-gray-500 mt-0.5">Demonstrativo de resultado por área</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="btn-secondary text-sm flex items-center gap-1.5">
            📊 Excel
          </button>
          <button onClick={exportPDF} className="btn-secondary text-sm flex items-center gap-1.5">
            📄 PDF
          </button>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex gap-4 flex-wrap items-end">
        <div>
          <label className="label">De</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="input w-40" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input w-40" />
        </div>
        {data && (
          <p className="text-xs text-gray-400 ml-auto self-end">
            Comparativo: {fmtDate(data.prevStart)} a {fmtDate(data.prevEnd)}
          </p>
        )}
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
            <p className="text-sm font-semibold text-white/70 mb-3">🏆 Arena Kicks — Consolidado</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiBox
                label="Receita Operacional"
                value={data.consolidated.income}
                prev={data.consolidated.prevIncome}
                color="text-green-300"
              />
              <KpiBox
                label="Patrocínio"
                value={data.consolidated.sponsorIncome}
                prev={data.consolidated.prevSponsorIncome}
                color="text-yellow-300"
              />
              <KpiBox
                label="Despesa Total"
                value={data.consolidated.expense}
                prev={null}
                color="text-red-300"
              />
              <KpiBox
                label="Resultado"
                value={data.consolidated.result}
                prev={data.consolidated.prevResult}
                color={data.consolidated.result >= 0 ? 'text-white' : 'text-red-300'}
              />
            </div>
          </div>

          {/* Tabela DRE */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Área</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Receita</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Despesa</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resultado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Mês ant.</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => {
                  const isPositive = r.result >= 0
                  const diff = r.result - r.prevResult
                  return (
                    <tr key={r.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(r.income)}</td>
                      <td className="px-4 py-3 text-right text-red-500">{fmt(r.expense)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{fmt(r.result)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs hidden sm:table-cell">
                        {fmt(r.prevResult)}
                        {r.prevResult !== 0 && (
                          <span className={`ml-1 ${diff >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                            {diff >= 0 ? '▲' : '▼'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {/* Linha Patrocínio */}
                {data.consolidated.sponsorIncome > 0 && (
                  <tr className="bg-amber-50/60 border-t border-amber-100">
                    <td className="px-4 py-3 font-medium text-amber-700 flex items-center gap-1.5">
                      🤝 Patrocínio
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 font-semibold">
                      {fmt(data.consolidated.sponsorIncome)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">—</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-semibold">
                      +{fmt(data.consolidated.sponsorIncome)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {data.consolidated.prevSponsorIncome > 0 ? fmt(data.consolidated.prevSponsorIncome) : '—'}
                    </td>
                  </tr>
                )}
                {/* Linha totais */}
                <tr className="bg-kicks-navy/5 border-t-2 border-kicks-navy/20 font-bold">
                  <td className="px-4 py-3 text-kicks-navy">Total</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(data.consolidated.income + data.consolidated.sponsorIncome)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{fmt(data.consolidated.expense)}</td>
                  <td className={`px-4 py-3 text-right ${data.consolidated.result >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {data.consolidated.result >= 0 ? '+' : ''}{fmt(data.consolidated.result)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs hidden sm:table-cell">
                    {fmt(data.consolidated.prevResult)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !data && (
        <p className="text-center py-10 text-gray-400">Nenhum dado encontrado para o período.</p>
      )}
    </div>
  )
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function KpiBox({ label, value, prev, color }) {
  const diff = prev !== null ? value - prev : null
  return (
    <div>
      <p className="text-xs text-white/60">{label}</p>
      <p className={`font-bold text-lg ${color}`}>{fmt(value)}</p>
      {diff !== null && prev !== 0 && (
        <p className={`text-xs mt-0.5 ${diff >= 0 ? 'text-green-300' : 'text-red-300'}`}>
          {diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(diff))} vs mês ant.
        </p>
      )}
    </div>
  )
}

function DRECard({ cc }) {
  const [open, setOpen] = useState(false)
  const isProfit = cc.result >= 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">{cc.name}</p>
        <div className="space-y-1.5">
          <Row label="Receita"          value={cc.income}    color="text-green-600" />
          <Row label="Despesa direta"   value={cc.directExp} color="text-red-500"   />
          {cc.allocated > 0 && (
            <Row label="Rateio geral"   value={cc.allocated} color="text-orange-500" />
          )}
          <div className="border-t pt-1.5 mt-1.5">
            <div className="flex justify-between">
              <span className="text-sm font-bold text-gray-700">Resultado</span>
              <span className={`text-sm font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                {isProfit ? '+' : ''}{fmt(cc.result)}
              </span>
            </div>
          </div>
        </div>
        {cc.prevResult !== 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Mês ant.: <span className={cc.prevResult >= 0 ? 'text-green-500' : 'text-red-400'}>
              {fmt(cc.prevResult)}
            </span>
          </p>
        )}
      </div>

      {cc.expenseDetail.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full px-4 py-2 text-xs text-gray-400 hover:text-gray-600 text-left transition-colors"
          >
            {open ? '▲ Ocultar detalhes' : '▼ Ver despesas por categoria'}
          </button>
          {open && (
            <div className="px-4 pb-4 space-y-0.5">
              {cc.expenseDetail.map(d => (
                <div key={d.label} className="flex justify-between text-xs text-gray-600 py-0.5">
                  <span>{d.label}</span>
                  <span className="text-red-500">{fmt(d.amount)}</span>
                </div>
              ))}
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

// ─── Utilitários ─────────────────────────────────────────────────────────────
function sum(arr, filterFn, valueFn) {
  return (arr ?? []).filter(filterFn).reduce((s, item) => s + Number(valueFn(item) ?? 0), 0)
}

function groupByCategory(expenseList) {
  const map = {}
  expenseList.forEach(e => {
    const key = e.expense_categories?.name ?? 'Sem categoria'
    map[key] = (map[key] || 0) + Number(e.amount)
  })
  return Object.entries(map)
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
}

function buildPDF(data) {
  const rows = data.rows.map(r => `
    <tr>
      <td>${r.name}</td>
      <td class="green">${fmt(r.income)}</td>
      <td class="red">${fmt(r.expense)}</td>
      <td class="${r.result >= 0 ? 'green' : 'red'}">${fmt(r.result)}</td>
      <td class="gray">${fmt(r.prevResult)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>DRE Arena Kicks</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
    h1 { color: #0B2238; margin-bottom: 4px; }
    h2 { color: #666; font-size: 13px; margin-top: 0; font-weight: normal; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #0B2238; color: white; padding: 8px 12px; text-align: right; font-size: 12px; }
    th:first-child { text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; text-align: right; }
    td:first-child { text-align: left; }
    .total td { font-weight: bold; background: #f0f4f8; border-top: 2px solid #0B2238; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .gray { color: #9ca3af; }
    .footer { margin-top: 20px; font-size: 11px; color: #999; }
  </style></head><body>
  <h1>Arena Kicks Jacareí — DRE</h1>
  <h2>Período: ${fmtDate(data.start)} a ${fmtDate(data.end)}</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Centro de Custo</th>
        <th>Receita</th>
        <th>Despesa</th>
        <th>Resultado</th>
        <th>Mês anterior</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td>CONSOLIDADO</td>
        <td class="green">${fmt(data.consolidated.income)}</td>
        <td class="red">${fmt(data.consolidated.expense)}</td>
        <td class="${data.consolidated.result >= 0 ? 'green' : 'red'}">${fmt(data.consolidated.result)}</td>
        <td class="gray">${fmt(data.consolidated.prevResult)}</td>
      </tr>
    </tbody>
  </table>
  <p class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} — Arena Kicks Jacareí</p>
  </body></html>`
}
