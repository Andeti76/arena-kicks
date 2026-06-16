import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helper ──────────────────────────────────────────────────────────────────
function fmt(date) { return date.toISOString().split('T')[0] }

function getMonthRange(offset = 0) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + offset
  const start = fmt(new Date(year, month, 1))
  const end   = fmt(new Date(year, month + 1, 0))
  return { start, end }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDashboard(period = 'month') {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const today = fmt(new Date())
      const { start, end } = period === 'day'
        ? { start: today, end: today }
        : getMonthRange(0)

      // ── 1. Centros de custo
      const { data: costCenters, error: ccErr } = await supabase
        .from('cost_centers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('sort_order')
      if (ccErr) throw ccErr

      // ── 2. Relatórios diários do período (receita)
      const { data: reports, error: drErr } = await supabase
        .from('daily_reports')
        .select('cost_center_id, sys_total, maq_total, status, report_date')
        .gte('report_date', start)
        .lte('report_date', end)
      if (drErr) throw drErr

      // ── 3. Despesas do período
      const { data: expenses, error: expErr } = await supabase
        .from('expenses')
        .select('cost_center_id, amount, is_general')
        .gte('expense_date', start)
        .lte('expense_date', end)
      if (expErr) throw expErr

      // ── 4. Rateio de despesas gerais
      const generalExpenseIds = (expenses ?? [])
        .filter(e => e.is_general)
        .map(e => e.id)
        .filter(Boolean)

      let allocations = []
      if (generalExpenseIds.length > 0) {
        const { data: allocs } = await supabase
          .from('expense_allocations')
          .select('cost_center_id, amount, expense_id')
          .in('expense_id', generalExpenseIds)
        allocations = allocs ?? []
      }

      // ── 5. Status de hoje por área
      const todayReports = (reports ?? []).filter(r => r.report_date === today)

      // ── 6. Monta cards
      const cards = (costCenters ?? []).map(cc => {
        const ccReports  = (reports  ?? []).filter(r => r.cost_center_id === cc.id)
        const ccExpenses = (expenses ?? []).filter(e => e.cost_center_id === cc.id && !e.is_general)
        const ccAllocs   = allocations.filter(a => a.cost_center_id === cc.id)

        const income  = ccReports .reduce((s, r) => s + Number(r.sys_total  ?? 0), 0)
        const expense = ccExpenses.reduce((s, e) => s + Number(e.amount     ?? 0), 0)
                      + ccAllocs  .reduce((s, a) => s + Number(a.amount     ?? 0), 0)

        const todayReport = todayReports.find(r => r.cost_center_id === cc.id)
        const statusToday = todayReport?.status ?? 'pending'

        return {
          id:         cc.id,
          name:       cc.name,
          code:       cc.code,
          income,
          expense,
          result:     income - expense,
          statusToday,
          okCount:    ccReports.filter(r => r.status === 'ok').length,
          discCount:  ccReports.filter(r => r.status === 'discrepancy').length,
          totalDays:  ccReports.length,
        }
      })

      const totalIncome  = cards.reduce((s, c) => s + c.income,  0)
      const totalExpense = cards.reduce((s, c) => s + c.expense, 0)

      const consolidated = {
        id:         'consolidated',
        name:       'Arena Kicks (Consolidado)',
        code:       'ALL',
        income:     totalIncome,
        expense:    totalExpense,
        result:     totalIncome - totalExpense,
        statusToday: null,
      }

      setData({ cards, consolidated, period, start, end })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}
