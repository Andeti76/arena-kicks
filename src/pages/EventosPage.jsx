import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fmt, fmtDate } from '../lib/format'
import Icon from '../components/ui/Icon'

const SUB_COLORS = {
  'Areia':          { bg: 'bg-yellow-50',  border: 'border-yellow-400',  icon: 'sandCourt'   },
  'Society':        { bg: 'bg-blue-50',    border: 'border-blue-400',    icon: 'soccerField' },
  'Churrasqueira':  { bg: 'bg-red-50',     border: 'border-red-400',     icon: 'grill'       },
  'Estacionamento': { bg: 'bg-gray-50',    border: 'border-gray-400',    icon: 'areas'       },
  'Eventos':        { bg: 'bg-purple-50',  border: 'border-purple-400',  icon: 'areas'       },
}

function getMonthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last  = new Date(year, month, 0).getDate()
  const end   = `${year}-${String(month).padStart(2, '0')}-${last}`
  return { start, end }
}

export default function EventosPage() {
  const now   = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => { load() }, [year, month]) // eslint-disable-line

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getMonthRange(year, month)

      const { data: subAreas, error: saErr } = await supabase
        .from('sub_areas')
        .select('id, name, cost_center_id, cost_centers(name, sort_order)')
        .order('name')
      if (saErr) throw saErr

      const { data: reports, error: drErr } = await supabase
        .from('daily_reports')
        .select('sub_area_id, sys_total, status, report_date')
        .gte('report_date', start)
        .lte('report_date', end)
        .not('sub_area_id', 'is', null)
      if (drErr) throw drErr

      const { data: expenses, error: expErr } = await supabase
        .from('expenses')
        .select('sub_area_id, amount, description, expense_date')
        .gte('expense_date', start)
        .lte('expense_date', end)
        .not('sub_area_id', 'is', null)
        .eq('is_general', false)
      if (expErr) throw expErr

      // Monta cards por sub-área
      const cards = (subAreas ?? []).map(sa => {
        const saReports  = (reports  ?? []).filter(r => r.sub_area_id === sa.id)
        const saExpenses = (expenses ?? []).filter(e => e.sub_area_id === sa.id)
        const income  = saReports .reduce((s, r) => s + Number(r.sys_total ?? 0), 0)
        const expense = saExpenses.reduce((s, e) => s + Number(e.amount    ?? 0), 0)
        return {
          id:             sa.id,
          name:           sa.name,
          cost_center_id: sa.cost_center_id,
          ccName:         sa.cost_centers?.name ?? '',
          ccOrder:        sa.cost_centers?.sort_order ?? 99,
          income,
          expense,
          result:   income - expense,
          okCount:  saReports.filter(r => r.status === 'ok').length,
          days:     saReports.length,
          expenses: saExpenses.sort((a, b) => b.expense_date.localeCompare(a.expense_date)),
        }
      })

      // Agrupa por centro de custo
      const groupMap = {}
      for (const card of cards) {
        if (!groupMap[card.cost_center_id]) {
          groupMap[card.cost_center_id] = {
            ccName: card.ccName,
            ccOrder: card.ccOrder,
            cards: [],
          }
        }
        groupMap[card.cost_center_id].cards.push(card)
      }

      const grouped = Object.values(groupMap).sort((a, b) => a.ccOrder - b.ccOrder)
      setGroups(grouped)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const allCards     = groups.flatMap(g => g.cards)
  const totalIncome  = allCards.reduce((s, c) => s + c.income,  0)
  const totalExpense = allCards.reduce((s, c) => s + c.expense, 0)
  const totalResult  = totalIncome - totalExpense

  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Performance operacional</p>
          <h1 className="page-title">Sub-Áreas</h1>
          <p className="page-subtitle">Desempenho por área — Quadras e Serviços & Eventos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (month === 1) { setMonth(12); setYear(y => y - 1) }
              else setMonth(m => m - 1)
            }}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:border-kicks-navy hover:text-kicks-navy transition-colors flex items-center justify-center text-sm"
          >‹</button>
          <span className="text-sm font-semibold text-kicks-navy min-w-[90px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={() => {
              if (month === 12) { setMonth(1); setYear(y => y + 1) }
              else setMonth(m => m + 1)
            }}
            className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:border-kicks-navy hover:text-kicks-navy transition-colors flex items-center justify-center text-sm"
          >›</button>
        </div>
      </div>

      {/* Totalizador geral */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Receita Total</p>
          <p className="text-lg font-bold text-green-600">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Despesa Total</p>
          <p className="text-lg font-bold text-red-500">{fmt(totalExpense)}</p>
        </div>
        <div className={`rounded-xl border shadow-sm p-4 text-center ${totalResult >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500 mb-1">Resultado</p>
          <p className={`text-lg font-bold ${totalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalResult >= 0 ? '+' : ''}{fmt(totalResult)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">{error}</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Icon name="areas" size={32} className="mx-auto mb-3" />
          <p>Nenhuma sub-área cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.ccName}>
              {/* Cabeçalho do grupo */}
              <h2 className="text-sm font-bold text-kicks-navy uppercase tracking-widest mb-3 px-1">
                {group.ccName}
              </h2>
              <div className="space-y-4">
                {group.cards.map(sa => {
                  const colors   = SUB_COLORS[sa.name] ?? { bg: 'bg-gray-50', border: 'border-gray-300', icon: 'areas' }
                  const isProfit = sa.result >= 0
                  return (
                    <div key={sa.id} className={`rounded-xl border-l-4 ${colors.border} ${colors.bg} shadow-sm`}>
                      <div className="flex items-center justify-between p-5 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="icon-live flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-kicks-navy">
                            <Icon name={colors.icon} size={19} />
                          </span>
                          <div>
                            <h3 className="font-semibold text-gray-800">{sa.name}</h3>
                            {sa.days > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                <span className="inline-flex items-center gap-1">
                                  <Icon name="check" size={12} /> {sa.okCount}/{sa.days} dias conciliados
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                            {isProfit ? '+' : ''}{fmt(sa.result)}
                          </p>
                          <p className="text-xs text-gray-400">resultado</p>
                        </div>
                      </div>

                      <div className="px-5 pb-4 grid grid-cols-2 gap-3">
                        <div className="bg-white/70 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-0.5">Receita</p>
                          <p className="text-sm font-semibold text-green-600">{fmt(sa.income)}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-0.5">Despesas</p>
                          <p className="text-sm font-semibold text-red-500">{fmt(sa.expense)}</p>
                        </div>
                      </div>

                      {sa.expenses.length > 0 && (
                        <div className="px-5 pb-5">
                          <p className="text-xs font-medium text-gray-500 mb-2">Despesas do mês</p>
                          <div className="space-y-1">
                            {sa.expenses.slice(0, 4).map((exp, i) => (
                              <div key={i} className="flex justify-between items-center bg-white/60 rounded-lg px-3 py-2">
                                <div>
                                  <p className="text-xs font-medium text-gray-700">{exp.description}</p>
                                  <p className="text-xs text-gray-400">{fmtDate(exp.expense_date)}</p>
                                </div>
                                <p className="text-xs font-semibold text-red-500">{fmt(exp.amount)}</p>
                              </div>
                            ))}
                            {sa.expenses.length > 4 && (
                              <p className="text-xs text-gray-400 text-center pt-1">
                                + {sa.expenses.length - 4} despesa{sa.expenses.length - 4 > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
