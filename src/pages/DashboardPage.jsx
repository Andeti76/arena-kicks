import { useState } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import CCCard from '../components/dashboard/CCCard'

const PERIODS = [
  { value: 'day',   label: 'Hoje' },
  { value: 'month', label: 'Este mês' },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState('month')
  const { data, loading, error, reload } = useDashboard(period)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-kicks-navy">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Visão geral dos centros de custo
          </p>
        </div>

        {/* Filtro de período */}
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-kicks-navy text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-kicks-navy'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={reload}
            className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 hover:border-kicks-navy transition-colors"
            title="Atualizar"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          Carregando...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 text-sm">
          Erro ao carregar dados: {error}
        </div>
      )}

      {!loading && !error && data?.cards && (
        <>
          {/* Cards dos centros de custo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            {data.cards.map(cc => (
              <CCCard key={cc.id} cc={cc} />
            ))}
          </div>

          {/* Card consolidado */}
          <div className="grid grid-cols-1">
            <CCCard cc={data.consolidated} />
          </div>

          {/* Rodapé */}
          <p className="text-xs text-gray-400 mt-4 text-right">
            {period === 'day'
              ? `Hoje — ${fmtDate(data.start)}`
              : `${fmtDate(data.start)} a ${fmtDate(data.end)}`
            }
          </p>
        </>
      )}

      {/* Estado vazio */}
      {!loading && !error && data?.cards?.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">Nenhum dado encontrado</p>
          <p className="text-sm">Comece adicionando lançamentos nos centros de custo.</p>
        </div>
      )}
    </div>
  )
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
