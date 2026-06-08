import { useState } from 'react'
import { useTransactions, useCostCenters } from '../hooks/useTransactions'
import TransactionForm from '../components/transactions/TransactionForm'
import TransactionList from '../components/transactions/TransactionList'
import { supabase } from '../lib/supabase'

const today = new Date()
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

export default function TransactionsPage() {
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [filters,   setFilters]   = useState({ start: firstDay, end: lastDay })

  const costCenters = useCostCenters()
  const { transactions, loading, error, reload } = useTransactions(filters)

  function setFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value || undefined }))
  }

  async function handleDelete(tx) {
    if (!confirm(`Excluir "${tx.description}"?`)) return
    await supabase.from('transactions').delete().eq('id', tx.id)
    reload()
  }

  function handleEdit(tx) {
    setEditing(tx)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditing(null)
  }

  function handleSave() {
    handleClose()
    reload()
  }

  // Totalizadores
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-kicks-navy">Lançamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Receitas e despesas por centro de custo</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-kicks-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-kicks-navy-dark transition-colors"
        >
          + Novo lançamento
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">De</label>
          <input type="date" value={filters.start || ''} onChange={e => setFilter('start', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Até</label>
          <input type="date" value={filters.end || ''} onChange={e => setFilter('end', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Centro de Custo</label>
          <select value={filters.cost_center_id || ''} onChange={e => setFilter('cost_center_id', e.target.value)} className="input">
            <option value="">Todos</option>
            {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tipo</label>
          <select value={filters.type || ''} onChange={e => setFilter('type', e.target.value)} className="input">
            <option value="">Todos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </div>
      </div>

      {/* Totalizadores */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Receitas</p>
            <p className="font-bold text-green-600 text-sm">{fmt(totalIncome)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Despesas</p>
            <p className="font-bold text-red-500 text-sm">{fmt(totalExpense)}</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${totalIncome - totalExpense >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <p className="text-xs text-gray-500 mb-1">Resultado</p>
            <p className={`font-bold text-sm ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
              {fmt(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading && <p className="text-center py-10 text-gray-400">Carregando...</p>}
      {error   && <p className="text-red-500 text-sm p-4">{error}</p>}
      {!loading && !error && (
        <TransactionList transactions={transactions} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      {/* Modal formulário */}
      {showForm && (
        <Modal title={editing ? 'Editar lançamento' : 'Novo lançamento'} onClose={handleClose}>
          <TransactionForm initial={editing} onSave={handleSave} onCancel={handleClose} />
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-kicks-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
