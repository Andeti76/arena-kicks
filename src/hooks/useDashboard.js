import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDashboard(period = 'month') {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    load()
  }, [period])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { start, end, prevStart, prevEnd } = getDateRange(period)

      // Busca centros de custo
      const { data: costCenters, error: ccError } = await supabase
        .from('cost_centers')
        .select('id, name, code')
        .eq('is_active', true)
        .order('sort_order')

      if (ccError) throw ccError

      // Busca transações do período atual
      const { data: current, error: txError } = await supabase
        .from('transactions')
        .select('cost_center_id, type, amount, is_general')
        .eq('status', 'confirmed')
        .gte('date', start)
        .lte('date', end)

      if (txError) throw txError

      // Busca transações do período anterior (comparativo)
      const { data: previous, error: prevError } = await supabase
        .from('transactions')
        .select('cost_center_id, type, amount, is_general')
        .eq('status', 'confirmed')
        .gte('date', prevStart)
        .lte('date', prevEnd)

      if (prevError) throw prevError

      // Busca rateio das despesas gerais do período atual
      const { data: allocations, error: allocError } = await supabase
        .from('transaction_allocations')
        .select(`
          cost_center_id,
          amount,
          transactions!inner(date, status, is_general)
        `)
        .eq('transactions.status', 'confirmed')
        .eq('transactions.is_general', true)
        .gte('transactions.date', start)
        .lte('transactions.date', end)

      if (allocError) throw allocError

      // Monta os cards por CC
      const cards = costCenters.map(cc => {
        const currIncome  = sumBy(current,  cc.id, 'income')
        const currExpense = sumBy(current,  cc.id, 'expense')
        const prevIncome  = sumBy(previous, cc.id, 'income')
        const prevExpense = sumBy(previous, cc.id, 'expense')

        // Adiciona rateio de despesas gerais
        const allocExpense = (allocations || [])
          .filter(a => a.cost_center_id === cc.id)
          .reduce((sum, a) => sum + Number(a.amount), 0)

        const totalExpense = currExpense + allocExpense
        const prevTotal    = prevExpense

        return {
          id:           cc.id,
          name:         cc.name,
          code:         cc.code,
          income:       currIncome,
          expense:      totalExpense,
          result:       currIncome - totalExpense,
          prevIncome:   prevIncome,
          prevExpense:  prevTotal,
          prevResult:   prevIncome - prevTotal,
        }
      })

      // Consolidado da org (despesas gerais sem rateio + soma dos CCs)
      const generalExpense = (current || [])
        .filter(t => t.is_general)
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const consolidated = {
        id:      'consolidated',
        name:    'Arena Kicks (Consolidado)',
        code:    'ALL',
        income:  cards.reduce((s, c) => s + c.income,  0),
        expense: cards.reduce((s, c) => s + c.expense, 0) + generalExpense,
        result:  0,
        prevIncome:  cards.reduce((s, c) => s + c.prevIncome,  0),
        prevExpense: cards.reduce((s, c) => s + c.prevExpense, 0),
        prevResult:  0,
      }
      consolidated.result     = consolidated.income  - consolidated.expense
      consolidated.prevResult = consolidated.prevIncome - consolidated.prevExpense

      setData({ cards, consolidated, period, start, end })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, reload: load }
}

// Soma transações por CC e tipo
function sumBy(transactions, ccId, type) {
  return (transactions || [])
    .filter(t => t.cost_center_id === ccId && t.type === type && !t.is_general)
    .reduce((sum, t) => sum + Number(t.amount), 0)
}

// Calcula intervalos de datas
function getDateRange(period) {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const day   = now.getDate()

  if (period === 'day') {
    const today = fmt(now)
    const yesterday = fmt(new Date(year, month, day - 1))
    return { start: today, end: today, prevStart: yesterday, prevEnd: yesterday }
  }

  // month (padrão)
  const start    = fmt(new Date(year, month, 1))
  const end      = fmt(new Date(year, month + 1, 0))
  const prevStart = fmt(new Date(year, month - 1, 1))
  const prevEnd   = fmt(new Date(year, month, 0))
  return { start, end, prevStart, prevEnd }
}

function fmt(date) {
  return date.toISOString().split('T')[0]
}
