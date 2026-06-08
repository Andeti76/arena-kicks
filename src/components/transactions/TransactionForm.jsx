import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useCostCenters, useCategories, useModalities } from '../../hooks/useTransactions'

const EMPTY = {
  type: 'income',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  cost_center_id: '',
  category_id: '',
  modality_id: '',
  is_general: false,
  notes: '',
  reference_code: '',
  status: 'confirmed',
}

export default function TransactionForm({ onSave, onCancel, initial }) {
  const [form,    setForm]    = useState(initial || EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [allocations, setAllocations] = useState([])

  const costCenters = useCostCenters()
  const categories  = useCategories(form.type)
  const modalities  = useModalities(form.cost_center_id)

  // Escolinha = código ESC
  const escolinhaId = costCenters.find(cc => cc.code === 'ESC')?.id

  // Inicializa rateio quando marcar despesa geral
  useEffect(() => {
    if (form.is_general && costCenters.length > 0 && allocations.length === 0) {
      const equal = (100 / costCenters.length).toFixed(2)
      setAllocations(costCenters.map(cc => ({ cost_center_id: cc.id, name: cc.name, percentage: equal })))
    }
    if (!form.is_general) setAllocations([])
  }, [form.is_general, costCenters])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (field === 'type') setForm(f => ({ ...f, [field]: value, category_id: '' }))
    if (field === 'cost_center_id') setForm(f => ({ ...f, [field]: value, modality_id: '' }))
    if (field === 'is_general' && value) setForm(f => ({ ...f, cost_center_id: '', modality_id: '' }))
  }

  function setAlloc(ccId, pct) {
    setAllocations(a => a.map(x => x.cost_center_id === ccId ? { ...x, percentage: pct } : x))
  }

  const allocTotal = allocations.reduce((s, a) => s + Number(a.percentage || 0), 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.description.trim()) return setError('Descrição obrigatória.')
    if (!form.amount || Number(form.amount) <= 0) return setError('Valor inválido.')
    if (!form.is_general && !form.cost_center_id) return setError('Selecione o centro de custo.')
    if (form.is_general && Math.abs(allocTotal - 100) > 0.1) return setError(`Rateio deve somar 100% (atual: ${allocTotal.toFixed(1)}%).`)

    setSaving(true)
    try {
      const payload = {
        type:            form.type,
        description:     form.description.trim(),
        amount:          Number(form.amount),
        date:            form.date,
        status:          form.status,
        is_general:      form.is_general,
        cost_center_id:  form.is_general ? null : form.cost_center_id || null,
        category_id:     form.category_id || null,
        modality_id:     form.modality_id || null,
        notes:           form.notes || null,
        reference_code:  form.reference_code || null,
      }

      let txId = initial?.id
      if (txId) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', txId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('transactions').insert(payload).select('id').single()
        if (error) throw error
        txId = data.id
      }

      // Salva rateio se despesa geral
      if (form.is_general) {
        await supabase.from('transaction_allocations').delete().eq('transaction_id', txId)
        const rows = allocations.map(a => ({
          transaction_id: txId,
          cost_center_id: a.cost_center_id,
          method:         'manual',
          percentage:     Number(a.percentage),
          amount:         (Number(form.amount) * Number(a.percentage) / 100).toFixed(2),
        }))
        const { error } = await supabase.from('transaction_allocations').insert(rows)
        if (error) throw error
      }

      onSave?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Tipo */}
      <div className="flex gap-2">
        {['income', 'expense'].map(t => (
          <button key={t} type="button"
            onClick={() => set('type', t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              form.type === t
                ? t === 'income' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}>
            {t === 'income' ? '↑ Receita' : '↓ Despesa'}
          </button>
        ))}
      </div>

      {/* Despesa geral */}
      {form.type === 'expense' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_general} onChange={e => set('is_general', e.target.checked)}
            className="rounded border-gray-300 text-kicks-navy" />
          <span className="text-sm text-gray-700">Despesa geral da Arena (rateada entre os CCs)</span>
        </label>
      )}

      {/* Centro de custo — só se não for geral */}
      {!form.is_general && (
        <div>
          <label className="label">Centro de Custo</label>
          <select value={form.cost_center_id} onChange={e => set('cost_center_id', e.target.value)} className="input" required>
            <option value="">Selecione...</option>
            {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
          </select>
        </div>
      )}

      {/* Modalidade — só Escolinha */}
      {form.cost_center_id === escolinhaId && modalities.length > 0 && (
        <div>
          <label className="label">Modalidade <span className="text-gray-400">(opcional)</span></label>
          <select value={form.modality_id} onChange={e => set('modality_id', e.target.value)} className="input">
            <option value="">Todas as modalidades</option>
            {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}

      {/* Descrição */}
      <div>
        <label className="label">Descrição</label>
        <input value={form.description} onChange={e => set('description', e.target.value)}
          className="input" placeholder="Ex: Venda de bebidas, Aluguel mensal..." required />
      </div>

      {/* Valor e Data */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Valor (R$)</label>
          <input type="number" step="0.01" min="0.01" value={form.amount}
            onChange={e => set('amount', e.target.value)} className="input" placeholder="0,00" required />
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input" required />
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className="label">Categoria <span className="text-gray-400">(opcional)</span></label>
        <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className="input">
          <option value="">Sem categoria</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Referência e Observações */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Referência <span className="text-gray-400">(opcional)</span></label>
          <input value={form.reference_code} onChange={e => set('reference_code', e.target.value)}
            className="input" placeholder="Nº nota, boleto..." />
        </div>
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
            <option value="confirmed">Confirmado</option>
            <option value="pending">Pendente</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Observações <span className="text-gray-400">(opcional)</span></label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          className="input resize-none" rows={2} placeholder="Informações adicionais..." />
      </div>

      {/* Rateio de despesa geral */}
      {form.is_general && allocations.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">Rateio entre centros de custo</p>
            <span className={`text-xs font-medium ${Math.abs(allocTotal - 100) < 0.1 ? 'text-green-600' : 'text-red-500'}`}>
              Total: {allocTotal.toFixed(1)}%
            </span>
          </div>
          {allocations.map(a => (
            <div key={a.cost_center_id} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40 truncate">{a.name}</span>
              <input type="number" min="0" max="100" step="0.1"
                value={a.percentage}
                onChange={e => setAlloc(a.cost_center_id, e.target.value)}
                className="input w-24 text-right" />
              <span className="text-sm text-gray-400">%</span>
              {form.amount && (
                <span className="text-xs text-gray-400 ml-auto">
                  {fmt(Number(form.amount) * Number(a.percentage || 0) / 100)}
                </span>
              )}
            </div>
          ))}
          <button type="button" onClick={() => {
            const equal = (100 / allocations.length).toFixed(2)
            setAllocations(a => a.map(x => ({ ...x, percentage: equal })))
          }} className="text-xs text-kicks-navy underline">
            Distribuir igualmente
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-kicks-navy text-white text-sm font-medium hover:bg-kicks-navy-dark transition-colors disabled:opacity-60">
          {saving ? 'Salvando...' : initial ? 'Atualizar' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
