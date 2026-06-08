import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTransactions(filters = {}) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  useEffect(() => { load() }, [JSON.stringify(filters)])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('transactions')
        .select(`
          id, type, status, description, amount, date, is_general,
          cost_center_id, modality_id, notes, reference_code,
          cost_centers(name, code),
          modalities(name),
          categories(name, type),
          profiles!created_by(full_name)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.cost_center_id) q = q.eq('cost_center_id', filters.cost_center_id)
      if (filters.type)           q = q.eq('type', filters.type)
      if (filters.status)         q = q.eq('status', filters.status)
      if (filters.is_general !== undefined) q = q.eq('is_general', filters.is_general)
      if (filters.start)          q = q.gte('date', filters.start)
      if (filters.end)            q = q.lte('date', filters.end)

      const { data, error } = await q
      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { transactions, loading, error, reload: load }
}

export function useCostCenters() {
  const [costCenters, setCostCenters] = useState([])
  useEffect(() => {
    supabase.from('cost_centers').select('id, name, code').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCostCenters(data || []))
  }, [])
  return costCenters
}

export function useCategories(type) {
  const [categories, setCategories] = useState([])
  useEffect(() => {
    let q = supabase.from('categories').select('id, name, type').eq('is_active', true).order('name')
    if (type) q = q.eq('type', type)
    q.then(({ data }) => setCategories(data || []))
  }, [type])
  return categories
}

export function useModalities(costCenterId) {
  const [modalities, setModalities] = useState([])
  useEffect(() => {
    if (!costCenterId) { setModalities([]); return }
    supabase.from('modalities').select('id, name').eq('cost_center_id', costCenterId).eq('is_active', true).order('sort_order')
      .then(({ data }) => setModalities(data || []))
  }, [costCenterId])
  return modalities
}
