export default function TransactionList({ transactions, onEdit, onDelete }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">💰</p>
        <p className="font-medium">Nenhum lançamento encontrado</p>
        <p className="text-sm">Ajuste os filtros ou adicione um novo lançamento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map(tx => (
        <TransactionRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}

function TransactionRow({ tx, onEdit, onDelete }) {
  const isIncome = tx.type === 'income'

  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-3 hover:border-gray-200 transition-colors">
      {/* Indicador tipo */}
      <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${isIncome ? 'bg-green-400' : 'bg-red-400'}`} />

      {/* Dados principais */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
          {tx.is_general && (
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">Geral</span>
          )}
          {tx.status === 'pending' && (
            <span className="text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded">Pendente</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">{fmtDate(tx.date)}</span>
          {tx.cost_centers && (
            <span className="text-xs text-gray-400">• {tx.cost_centers.name}</span>
          )}
          {tx.categories && (
            <span className="text-xs text-gray-400">• {tx.categories.name}</span>
          )}
          {tx.modalities && (
            <span className="text-xs text-gray-400">• {tx.modalities.name}</span>
          )}
        </div>
      </div>

      {/* Valor */}
      <div className="text-right flex-shrink-0">
        <p className={`font-semibold text-sm ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
          {isIncome ? '+' : '-'}{fmt(tx.amount)}
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => onEdit?.(tx)}
          className="p-1.5 text-gray-400 hover:text-kicks-navy rounded transition-colors"
          title="Editar">
          ✏️
        </button>
        <button onClick={() => onDelete?.(tx)}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
          title="Excluir">
          🗑️
        </button>
      </div>
    </div>
  )
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
