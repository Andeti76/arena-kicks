// ─── Formatadores centralizados ───────────────────────────────────────────────

/**
 * Formata um número como moeda BRL.
 * Ex: fmt(1500) → "R$ 1.500,00"
 */
export function fmt(value) {
  return new Intl.NumberFormat('pt-BR', {
    style:                 'currency',
    currency:              'BRL',
    minimumFractionDigits: 2,
  }).format(value ?? 0)
}

/**
 * Formata uma string de data ISO (YYYY-MM-DD) para DD/MM/YYYY.
 * Ex: fmtDate('2026-06-16') → "16/06/2026"
 */
export function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
