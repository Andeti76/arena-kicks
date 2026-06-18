import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Retorna os últimos N meses como array de { year, month, label, start, end }
function getLastMonths(n = 6) {
  const months = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year  = d.getFullYear()
    const month = d.getMonth() + 1
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end   = new Date(year, month, 0).toISOString().split('T')[0]
    const label = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '') +
                  (i === n - 1 || month === 1 ? `/${String(year).slice(2)}` : '')
    months.push({ year, month, start, end, label })
  }
  return months
}

function sumByMonth(rows, dateField, valueField, months) {
  return months.map(m => {
    const total = (rows ?? [])
      .filter(r => r[dateField]?.startsWith(`${m.year}-${String(m.month).padStart(2, '0')}`))
      .reduce((s, r) => s + Number(r[valueField] ?? 0), 0)
    return total
  })
}

export function useFinancialChart(months = 6) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const periods  = getLastMonths(months)
        const earliest = periods[0].start
        const latest   = periods[periods.length - 1].end

        const [
          { data: reports },
          { data: expenses },
          { data: sponsorPmts },
        ] = await Promise.all([
          supabase.from('daily_reports')
            .select('report_date, sys_total')
            .gte('report_date', earliest)
            .lte('report_date', latest),

          supabase.from('expenses')
            .select('expense_date, amount')
            .gte('expense_date', earliest)
            .lte('expense_date', latest),

          supabase.from('sponsor_payments')
            .select('payment_date, amount')
            .gte('payment_date', earliest)
            .lte('payment_date', latest),
        ])

        const receita     = sumByMonth(reports,     'report_date',   'sys_total', periods)
        const despesa     = sumByMonth(expenses,    'expense_date',  'amount',    periods)
        const patrocinio  = sumByMonth(sponsorPmts, 'payment_date',  'amount',    periods)

        const chartData = periods.map((p, i) => ({
          label:      p.label,
          receita:    Math.round(receita[i] * 100) / 100,
          despesa:    Math.round(despesa[i] * 100) / 100,
          patrocinio: Math.round(patrocinio[i] * 100) / 100,
          resultado:  Math.round((receita[i] + patrocinio[i] - despesa[i]) * 100) / 100,
        }))

        setData(chartData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [months])

  return { data, loading, error }
}
