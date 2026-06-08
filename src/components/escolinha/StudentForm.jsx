import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY = {
  full_name: '', phone: '', email: '', birth_date: '',
  guardian_name: '', guardian_phone: '', guardian_email: '',
  address: '', notes: '', is_active: true,
}

export default function StudentForm({ initial, onSave, onCancel }) {
  const [form,   setForm]   = useState(initial || EMPTY)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(f, v) { setForm(x => ({ ...x, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) return setError('Nome obrigatório.')
    setSaving(true)
    setError('')
    try {
      const payload = {
        full_name:      form.full_name.trim(),
        phone:          form.phone || null,
        email:          form.email || null,
        birth_date:     form.birth_date || null,
        guardian_name:  form.guardian_name || null,
        guardian_phone: form.guardian_phone || null,
        guardian_email: form.guardian_email || null,
        address:        form.address || null,
        notes:          form.notes || null,
        is_active:      form.is_active,
      }
      if (initial?.id) {
        const { error } = await supabase.from('students').update(payload).eq('id', initial.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('students').insert(payload)
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
      <Section title="Dados do aluno">
        <div>
          <label className="label">Nome completo</label>
          <input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="input" placeholder="Nome do aluno" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="(12) 99999-9999" />
          </div>
          <div>
            <label className="label">Data de nascimento</label>
            <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" placeholder="aluno@email.com" />
        </div>
        <div>
          <label className="label">Endereço</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} className="input" placeholder="Rua, número, bairro..." />
        </div>
      </Section>

      <Section title="Responsável (para menores)">
        <div>
          <label className="label">Nome do responsável</label>
          <input value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefone do responsável</label>
            <input value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">E-mail do responsável</label>
            <input type="email" value={form.guardian_email} onChange={e => set('guardian_email', e.target.value)} className="input" />
          </div>
        </div>
      </Section>

      <div>
        <label className="label">Observações</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="input resize-none" rows={2} />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded" />
        <span className="text-sm text-gray-700">Aluno ativo</span>
      </label>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Salvando...' : initial ? 'Atualizar' : 'Cadastrar aluno'}
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
