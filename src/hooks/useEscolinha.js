import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useStudents(search = '') {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => load(), 300)
    return () => clearTimeout(timer)
  }, [search])

  async function load() {
    setLoading(true)
    let q = supabase
      .from('students')
      .select(`
        id, full_name, phone, email, birth_date, guardian_name, guardian_phone, is_active, created_at,
        enrollments(
          id, status, monthly_amount, due_day,
          modalities(name)
        )
      `)
      .order('full_name')

    if (search) q = q.ilike('full_name', `%${search}%`)

    const { data } = await q
    setStudents(data || [])
    setLoading(false)
  }

  return { students, loading, reload: load }
}

export function useMonthlyFees(month) {
  const [fees,    setFees]    = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ paid: 0, pending: 0, overdue: 0, total: 0 })

  useEffect(() => { if (month) load() }, [month])

  async function load() {
    setLoading(true)

    // Atualiza inadimplentes antes de buscar
    await supabase.rpc('update_overdue_fees')

    const start = month + '-01'
    const end   = new Date(month.split('-')[0], month.split('-')[1], 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('monthly_fees')
      .select(`
        id, reference_month, amount, due_date, status, paid_at, payment_method, notes,
        enrollments(
          monthly_amount, due_day,
          students(full_name, phone),
          modalities(name)
        )
      `)
      .gte('reference_month', start)
      .lte('reference_month', end)
      .order('status')

    const fees = data || []
    setFees(fees)
    setSummary({
      paid:    fees.filter(f => f.status === 'paid').length,
      pending: fees.filter(f => f.status === 'pending').length,
      overdue: fees.filter(f => f.status === 'overdue').length,
      total:   fees.length,
      totalAmount:  fees.reduce((s, f) => s + Number(f.amount), 0),
      paidAmount:   fees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0),
      pendingAmount: fees.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0),
    })
    setLoading(false)
  }

  return { fees, loading, summary, reload: load }
}
