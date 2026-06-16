const CC_COLORS = {
  BAR: { bg: 'bg-amber-50',  border: 'border-amber-400',  icon: '🍺' },
  ESC: { bg: 'bg-green-50',  border: 'border-green-400',  icon: '⚽' },
  SOC: { bg: 'bg-blue-50',   border: 'border-blue-400',   icon: '🏟️' },
  EST: { bg: 'bg-purple-50', border: 'border-purple-400', icon: '🅿️' },
  ALL: { bg: 'bg-gray-50',   border: 'border-kicks-navy', icon: '🏆' },
}

const STATUS_CONFIG = {
  ok:          { icon: '✅', label: 'Hoje OK',       cls: 'bg-green-100 text-green-700' },
  discrepancy: { icon: '⚠️', label: 'Divergência',   cls: 'bg-red-100 text-red-600' },
  pending:     { icon: '🕐', label: 'Pendente',      cls: 'bg-yellow-100 text-yellow-700' },
}

export default function CCCard({ cc }) {
  const colors   = CC_COLORS[cc.code] || CC_COLORS.ALL
  const isProfit = cc.result >= 0
  const status   = cc.statusToday ? STATUS_CONFIG[cc.statusToday] : null

  return (
    <div className={`rounded-xl border-l-4 ${colors.border} ${colors.bg} p-5 shadow-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{colors.icon}</span>
          <h3 className="font-semibold text-gray-800 text-sm">{cc.name}</h3>
        </div>
        {status && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
            {status.icon} {status.label}
          </span>
        )}
      </div>

      {/* Valores */}
      <div className="space-y-2">
        <Row label="Receita" value={cc.income}  color="text-green-600" />
        <Row label="Despesa" value={cc.expense} color="text-red-500"   />
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Resultado</span>
            <span className={`text-base font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
              {isProfit ? '+' : ''}{fmt(cc.result)}
            </span>
          </div>
        </div>
      </div>

      {/* Status de conciliações do mês */}
      {cc.totalDays > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex gap-3">
          <span className="text-xs text-gray-400">
            ✅ {cc.okCount}/{cc.totalDays} dias
          </span>
          {cc.discCount > 0 && (
            <span className="text-xs text-red-400">
              ⚠️ {cc.discCount} divergência{cc.discCount > 1 ? 's' : ''}
            </span>
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

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value ?? 0)
}
