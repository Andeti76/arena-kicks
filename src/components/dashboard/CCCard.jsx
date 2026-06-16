const CC_META = {
  BAR: { color: '#F59E0B', icon: '🍺' },
  ESC: { color: '#10B981', icon: '⚽' },
  SOC: { color: '#3B82F6', icon: '🏟️' },
  EST: { color: '#8B5CF6', icon: '🅿️' },
  ALL: { color: '#C99A2E', icon: '🏆' },
}

const STATUS_CONFIG = {
  ok:          { icon: '✅', label: 'OK hoje',     cls: 'badge-ok' },
  discrepancy: { icon: '⚠️', label: 'Divergência', cls: 'badge-disc' },
  pending:     { icon: '🕐', label: 'Pendente',    cls: 'badge-pending' },
}

export default function CCCard({ cc, highlight = false }) {
  const meta     = CC_META[cc.code] || CC_META.ALL
  const isProfit = cc.result >= 0
  const status   = cc.statusToday ? STATUS_CONFIG[cc.statusToday] : null

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '20px',
        borderLeft: `4px solid ${meta.color}`,
        boxShadow: highlight
          ? `0 4px 24px rgba(0,0,0,0.10), 0 0 0 1px ${meta.color}22`
          : '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px', height: '40px',
              borderRadius: '12px',
              background: `${meta.color}18`,
              border: `1.5px solid ${meta.color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#1a2f47', lineHeight: 1.2 }}>
              {cc.name}
            </p>
            {cc.totalDays > 0 && (
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                ✅ {cc.okCount}/{cc.totalDays} dias
                {cc.discCount > 0 && (
                  <span style={{ color: '#ef4444', marginLeft: '8px' }}>⚠️ {cc.discCount}</span>
                )}
              </p>
            )}
          </div>
        </div>
        {status && (
          <span className={`badge ${status.cls}`} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            {status.icon} {status.label}
          </span>
        )}
      </div>

      {/* Valores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Row label="Receita"  value={cc.income}  color="#059669" />
        <Row label="Despesa"  value={cc.expense} color="#dc2626" />
        <div style={{ height: '1px', background: '#f3f4f6', margin: '2px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Resultado</span>
          <span style={{
            fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px',
            color: isProfit ? '#059669' : '#dc2626',
          }}>
            {isProfit ? '+' : ''}{fmt(cc.result)}
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color }}>{fmt(value)}</span>
    </div>
  )
}

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(value ?? 0)
}
