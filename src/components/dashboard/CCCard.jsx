import Icon from '../ui/Icon'

const CC_META = {
  BAR: { color: '#D28C20', icon: 'bar' },
  ESC: { color: '#07875E', icon: 'soccerBall' },
  SOC: { color: '#2D6FA7', icon: 'soccerField' },
  EST: { color: '#7658A5', icon: 'parking' },
  ALL: { color: '#C99A2E', icon: 'dashboard' },
}

const STATUS_CONFIG = {
  ok: { label: 'OK hoje', cls: 'badge-ok' },
  discrepancy: { label: 'Divergência', cls: 'badge-disc' },
  pending: { label: 'Pendente', cls: 'badge-pending' },
}

export default function CCCard({ cc, highlight = false }) {
  const meta = CC_META[cc.code] || CC_META.ALL
  const isProfit = cc.result >= 0
  const status = cc.statusToday ? STATUS_CONFIG[cc.statusToday] : null

  return (
    <div
      className={`premium-card-hover group relative overflow-hidden rounded-[20px] border bg-white/95 p-5 ${
        highlight
          ? 'border-kicks-gold/25 shadow-[0_18px_48px_rgba(11,34,56,.10)]'
          : 'border-[#0f2b43]/[.08] shadow-[0_12px_35px_rgba(11,34,56,.055)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(11,34,56,.10)]'
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: meta.color }} />
      {highlight && <span className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-kicks-gold/[.06]" />}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="icon-live flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${meta.color}14`, color: meta.color }}
          >
            <Icon name={meta.icon} size={19} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-kicks-navy">{cc.name}</p>
            {cc.totalDays > 0 && (
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                {cc.okCount}/{cc.totalDays} dias conciliados
                {cc.discCount > 0 && <span className="ml-2 text-red-500">· {cc.discCount} diverg.</span>}
              </p>
            )}
          </div>
        </div>
        {status && <span className={`badge ${status.cls} shrink-0 whitespace-nowrap`}>{status.label}</span>}
      </div>

      <div className="relative mt-5 space-y-2.5">
        <Row label="Receita" value={cc.income} color="#07875E" />
        <Row label="Despesa" value={cc.expense} color="#CF3F47" />
        <div className="my-1 h-px bg-[#0f2b43]/[.07]" />
        <div className="flex items-end justify-between gap-3 pt-1">
          <span className="text-xs font-bold text-slate-600">Resultado</span>
          <span className={`text-lg font-black tracking-[-.04em] ${isProfit ? 'text-emerald-700' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}{fmt(cc.result)}
          </span>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-[13px] font-bold" style={{ color }}>{fmt(value)}</span>
    </div>
  )
}

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value ?? 0)
}
