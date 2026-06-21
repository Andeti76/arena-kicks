// MÓDULO FUTURO — aguardando ativação por Marcus (dono da arena)
// Código completo e funcional. Para ativar:
//   1. Adicionar rota em App.jsx:  <Route path="escolinha" element={<EscolinhaPage />} />
//   2. Adicionar item em Sidebar.jsx: { to: '/escolinha', label: 'Escolinha', icon: '⚽' }
//   3. Garantir que as RPCs generate_monthly_fees e update_overdue_fees existam no Supabase
import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useStudents, useMonthlyFees } from '../hooks/useEscolinha'
import StudentForm    from '../components/escolinha/StudentForm'
import EnrollmentForm from '../components/escolinha/EnrollmentForm'
import { supabase }   from '../lib/supabase'
import { fmt, fmtDate } from '../lib/format'
import Icon from '../components/ui/Icon'

export default function EscolinhaPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-kicks-navy mb-2">Escolinha</h1>

      {/* Sub-navegação */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { to: '/escolinha',            label: 'Alunos',       end: true },
          { to: '/escolinha/mensalidades', label: 'Mensalidades', end: false },
        ].map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive ? 'border-kicks-navy text-kicks-navy' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {item.label}
          </NavLink>
        ))}
      </div>

      <Routes>
        <Route index element={<AlunosTab />} />
        <Route path="mensalidades" element={<MensalidadesTab />} />
      </Routes>
    </div>
  )
}

/* ────────────────────────────────────────── ALUNOS ── */
function AlunosTab() {
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [enrolling, setEnrolling] = useState(null) // studentId
  const { students, loading, reload } = useStudents(search)

  async function handleDelete(s) {
    if (!confirm(`Excluir aluno "${s.full_name}"?`)) return
    await supabase.from('students').delete().eq('id', s.id)
    reload()
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input flex-1" placeholder="Buscar aluno..." />
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary whitespace-nowrap">
          + Novo aluno
        </button>
      </div>

      {loading && <p className="text-center py-10 text-gray-400">Carregando...</p>}

      {!loading && students.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Icon name="soccerBall" size={36} className="mx-auto mb-3" />
          <p className="font-medium">Nenhum aluno cadastrado</p>
        </div>
      )}

      <div className="space-y-2">
        {students.map(s => (
          <StudentCard key={s.id} student={s}
            onEdit={() => { setEditing(s); setShowForm(true) }}
            onDelete={() => handleDelete(s)}
            onEnroll={() => setEnrolling(s.id)}
          />
        ))}
      </div>

      {showForm && (
        <Modal title={editing ? 'Editar aluno' : 'Novo aluno'} onClose={() => { setShowForm(false); setEditing(null) }}>
          <StudentForm initial={editing} onSave={() => { setShowForm(false); setEditing(null); reload() }}
            onCancel={() => { setShowForm(false); setEditing(null) }} />
        </Modal>
      )}

      {enrolling && (
        <Modal title="Nova matrícula" onClose={() => setEnrolling(null)}>
          <EnrollmentForm studentId={enrolling}
            onSave={() => { setEnrolling(null); reload() }}
            onCancel={() => setEnrolling(null)} />
        </Modal>
      )}
    </>
  )
}

function StudentCard({ student, onEdit, onDelete, onEnroll }) {
  const activeEnrollments = student.enrollments?.filter(e => e.status === 'active') || []

  return (
    <div className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-kicks-navy text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
        {student.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-800">{student.full_name}</p>
          {!student.is_active && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inativo</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap mt-0.5">
          {activeEnrollments.length > 0
            ? activeEnrollments.map(e => (
                <span key={e.id} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  {e.modalities?.name} — {fmt(e.monthly_amount)}/mês
                </span>
              ))
            : <span className="text-xs text-gray-400">Sem matrícula ativa</span>
          }
          {student.phone && <span className="text-xs text-gray-400">• {student.phone}</span>}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEnroll} title="Matricular" className="p-1.5 text-gray-400 hover:text-green-600 rounded transition-colors"><Icon name="check" size={16} /></button>
        <button onClick={onEdit} title="Editar" className="p-1.5 text-gray-400 hover:text-kicks-navy rounded transition-colors"><Icon name="edit" size={16} /></button>
        <button onClick={onDelete} title="Excluir" className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"><Icon name="trash" size={16} /></button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────── MENSALIDADES ── */
const PAYMENT_METHODS = [
  { value: 'pix',      label: 'PIX' },
  { value: 'cash',     label: 'Dinheiro' },
  { value: 'card',     label: 'Cartão' },
  { value: 'transfer', label: 'Transferência' },
]

function MensalidadesTab() {
  const now = new Date()
  const [month,      setMonth]      = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [generating, setGenerating] = useState(false)
  const [toast,      setToast]      = useState(null)   // { type: 'success'|'error', msg: string }
  const [payingFee,  setPayingFee]  = useState(null)   // fee object sendo pago
  const [payMethod,  setPayMethod]  = useState('pix')
  const { fees, loading, summary, reload } = useMonthlyFees(month)

  function showToast(type, msg) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  async function generateFees() {
    setGenerating(true)
    const { data, error } = await supabase.rpc('generate_monthly_fees', { p_month: month + '-01' })
    setGenerating(false)
    if (error) showToast('error', 'Erro ao gerar: ' + error.message)
    else { showToast('success', `${data} mensalidade(s) gerada(s).`); reload() }
  }

  async function confirmMarkPaid() {
    if (!payingFee) return
    await supabase.from('monthly_fees').update({
      status: 'paid', paid_at: new Date().toISOString(), payment_method: payMethod,
    }).eq('id', payingFee.id)
    setPayingFee(null)
    setPayMethod('pix')
    reload()
  }

  const STATUS_LABEL = { paid: 'Pago', pending: 'Pendente', overdue: 'Inadimplente' }
  const STATUS_COLOR = {
    paid:    'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-600',
  }

  return (
    <>
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input w-40" />
        <button onClick={generateFees} disabled={generating}
          className="btn-primary whitespace-nowrap">
          {generating ? 'Gerando...' : 'Gerar mensalidades'}
        </button>
      </div>

      {/* Toast inline */}
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          <span className="inline-flex items-center gap-2"><Icon name={toast.type === 'success' ? 'check' : 'alert'} size={15} /> {toast.msg}</span>
        </div>
      )}

      {/* Modal de forma de pagamento */}
      {payingFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-xl">
            <h3 className="font-semibold text-kicks-navy mb-1">Registrar Recebimento</h3>
            <p className="text-sm text-gray-500 mb-4">
              {payingFee.enrollments?.students?.full_name} — {fmt(payingFee.amount)}
            </p>
            <p className="text-xs font-medium text-gray-600 mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setPayMethod(m.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    payMethod === m.value
                      ? 'bg-kicks-navy text-white border-kicks-navy'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-kicks-navy'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPayingFee(null); setPayMethod('pix') }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmMarkPaid}
                className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      {!loading && summary.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <SummaryCard label="Total" value={summary.total} sub={fmt(summary.totalAmount)} color="bg-gray-50" />
          <SummaryCard label="Pagos" value={summary.paid} sub={fmt(summary.paidAmount)} color="bg-green-50" />
          <SummaryCard label="Pendentes" value={summary.pending} sub="" color="bg-yellow-50" />
          <SummaryCard label="Inadimplentes" value={summary.overdue} sub={fmt(summary.pendingAmount)} color="bg-red-50" />
        </div>
      )}

      {loading && <p className="text-center py-10 text-gray-400">Carregando...</p>}

      {!loading && fees.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Icon name="clipboard" size={36} className="mx-auto mb-3" />
          <p className="font-medium">Nenhuma mensalidade para este mês</p>
          <p className="text-sm">Clique em "Gerar mensalidades" para criar as cobranças do mês.</p>
        </div>
      )}

      <div className="space-y-2">
        {fees.map(fee => (
          <div key={fee.id} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{fee.enrollments?.students?.full_name}</p>
              <div className="flex gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-gray-400">{fee.enrollments?.modalities?.name}</span>
                <span className="text-xs text-gray-400">• Vence {fmtDate(fee.due_date)}</span>
                {fee.enrollments?.students?.phone && (
                  <span className="text-xs text-gray-400">• {fee.enrollments.students.phone}</span>
                )}
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">{fmt(fee.amount)}</p>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[fee.status]}`}>
              {STATUS_LABEL[fee.status]}
            </span>
            {fee.status !== 'paid' && (
              <button onClick={() => { setPayingFee(fee); setPayMethod('pix') }}
                className="text-xs text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-50 transition-colors">
                Receber
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className={`${color} rounded-lg p-3 text-center`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-800 text-lg">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
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
