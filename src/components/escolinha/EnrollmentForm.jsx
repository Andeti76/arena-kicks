import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function EnrollmentForm({ studentId, initial, onSave, onCancel }) {
  const [form,       setForm]       = useState(initial || { modality_id: '', monthly_amount: '', due_day: 10, start_date: new Date().toISOString().split('T')[0], status: 'active' })
  const [modalities, setModalities] = useState([])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    supabase.from('modalities')
      .select('id, name, cost_centers!inner(code)')
      .eq('cost_centers.code', 'ESC')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setModalities(data || []))
  }, [])

  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.modality_id) return setError('Selecione a modalidade.')
    if (!form.monthly_amount || Number(form.monthly_amount) < 0) return setError('Valor inválido.')
    setSaving(true)
    setError('')
    try {
      const payload = {
        student_id:     studentId,
        modality_id:    form.modality_id,
        monthly_amount: Number(form.monthly_amount),
        due_day:        Number(form.due_day),
        start_date:     form.start_date,
        status:         form.status,
      }
      if (initial?.id) {
        const { error } = await supabase.from('enrollments').update(payload).eq('id', initial.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('enrollments').insert(payload)
        if (error) throw error
      }
      onSave?.()
    } catch (err) {
      setError(err.message === 'duplicate key value violates unique constraint "enrollments_student_id_modality_id_key"'
        ? 'Aluno já matriculado nessa modalidade.'
        : err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Modalidade</label>
        <select value={form.modality_id} onChange={e => set('modality_id', e.target.value)} className="input" required>
          <option value="">Selecione...</option>
          {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mensalidade (R$)</label>
          <input type="number" step="0.01" min="0" value={form.monthly_amount}
            onChange={e => set('monthly_amount', e.target.value)} className="input" placeholder="0,00" required />
        </div>
        <div>
          <label className="label">Dia de vencimento</label>
          <input type="number" min="1" max="28" value={form.due_day}
            onChange={e => set('due_day', e.target.value)} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Início</label>
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Salvando...' : initial ? 'Atualizar' : 'Matricular'}
        </button>
      </div>
    </form>
  )
}
