import { useState } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import CCCard from '../components/dashboard/CCCard'
import FinancialChart from '../components/dashboard/FinancialChart'
import Icon from '../components/ui/Icon'
import { fmt, fmtDate } from '../lib/format'

const PERIODS = [
  { value: 'day', label: 'Hoje' },
  { value: 'month', label: 'Este mês' },
]

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map(item => <div key={item} className="h-32 rounded-[20px] bg-slate-200/70" />)}
      </div>
      <div className="h-72 rounded-[22px] bg-slate-200/70" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map(item => <div key={item} className="h-44 rounded-[20px] bg-slate-200/70" />)}
      </div>
    </div>
  )
}

function KpiBox({ label, value, tone, icon, sub, delay = 0 }) {
  const tones = {
    green: { color: '#07875e', soft: '#eaf8f2' },
    red: { color: '#cf3f47', soft: '#fff0f1' },
    navy: { color: '#0B2238', soft: '#eef4f8' },
    gold: { color: '#9C7220', soft: '#fbf5e8' },
  }
  const palette = tones[tone] ?? tones.navy

  return (
    <div
      className="reveal-card premium-card-hover group relative overflow-hidden rounded-[20px] border border-[#0f2b43]/[.08] bg-white/95 p-5 shadow-[0_12px_35px_rgba(11,34,56,.055)]"
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: palette.color }} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">{label}</p>
          <p className="mt-3 text-[24px] font-black leading-none tracking-[-.045em]" style={{ color: palette.color }}>
            {value}
          </p>
          {sub && <p className="mt-3 text-[11px] font-medium text-slate-400">{sub}</p>}
        </div>
        <span className="icon-live flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: palette.color, background: palette.soft }}>
          <Icon name={icon} size={19} />
        </span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('month')
  const { data, loading, error, reload } = useDashboard(period)

  const consolidated = data?.consolidated
  const sponsorIncome = data?.sponsorIncome ?? 0
  const overdueSponsors = data?.overdueSponsors ?? []
  const cards = data?.cards ?? []
  const pendingCount = cards.filter(card => card.statusToday === 'pending').length
  const discCount = cards.filter(card => card.statusToday === 'discrepancy').length

  const periodLabel = period === 'day'
    ? `Hoje — ${fmtDate(data?.start)}`
    : data ? `${fmtDate(data.start)} a ${fmtDate(data.end)}` : ''

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Centro de comando</p>
          <h1 className="page-title">Visão geral da operação</h1>
          <p className="page-subtitle">{periodLabel || 'Preparando os indicadores do período...'}</p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[#0f2b43]/[.08] bg-white/70 p-1.5 shadow-sm backdrop-blur-sm">
          {PERIODS.map(option => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={period === option.value ? 'tab-btn tab-btn-active' : 'tab-btn tab-btn-inactive'}
            >
              {option.label}
            </button>
          ))}
          <button onClick={reload} title="Atualizar indicadores" className="icon-button ml-1">
            <Icon name="refresh" size={17} />
          </button>
        </div>
      </div>

      {loading && <Skeleton />}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          <Icon name="alert" size={19} />
          Erro ao carregar: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiBox
              label="Receita operacional"
              value={fmt(consolidated?.income)}
              tone="green"
              icon="income"
              sub={period === 'month' ? 'Movimentação no mês' : 'Movimentação de hoje'}
              delay={40}
            />
            <KpiBox
              label="Despesas"
              value={fmt(consolidated?.expense)}
              tone="red"
              icon="expense"
              sub={period === 'month' ? 'Acumulado no mês' : 'Lançamentos de hoje'}
              delay={110}
            />
            <KpiBox
              label="Resultado"
              value={fmt(consolidated?.result)}
              tone={consolidated?.result >= 0 ? 'navy' : 'red'}
              icon="chart"
              sub="Operação + patrocínio − despesas"
              delay={180}
            />
            <KpiBox
              label="Status da operação"
              value={discCount > 0 ? `${discCount} área${discCount > 1 ? 's' : ''}` : pendingCount > 0 ? `${pendingCount} pend.` : 'Tudo OK'}
              tone={discCount > 0 ? 'red' : pendingCount > 0 ? 'gold' : 'green'}
              icon={discCount > 0 ? 'alert' : 'shield'}
              sub={discCount > 0 ? 'Com divergência' : pendingCount > 0 ? 'Aguardando conciliação' : 'Operação conciliada'}
              delay={250}
            />
          </div>

          {sponsorIncome > 0 && (
            <div className="reveal-card premium-card-hover relative overflow-hidden rounded-[20px] border border-white/[.08] bg-gradient-to-br from-kicks-navy to-kicks-navy-light px-5 py-4 shadow-[0_18px_45px_rgba(11,34,56,.18)]" style={{ '--reveal-delay': '310ms' }}>
              <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border border-kicks-gold/20" />
              <div className="relative flex items-center justify-between gap-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kicks-gold/15 text-kicks-gold-light">
                    <Icon name="sponsors" size={21} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.15em] text-white/45">
                      Patrocínio {period === 'month' ? 'no mês' : 'hoje'}
                    </p>
                    <p className="mt-1 text-xl font-black tracking-[-.04em] text-kicks-gold-light">{fmt(sponsorIncome)}</p>
                  </div>
                </div>
                <p className="hidden text-right text-[10px] font-semibold uppercase tracking-[.13em] text-white/30 sm:block">
                  Receita<br />não operacional
                </p>
              </div>
            </div>
          )}

          <FinancialChart />

          {overdueSponsors.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
              <span className="mt-0.5 text-red-500"><Icon name="alert" size={19} /></span>
              <div>
                <p className="text-sm font-bold text-red-700">
                  {overdueSponsors.length} patrocinador{overdueSponsors.length > 1 ? 'es' : ''} sem pagamento este mês
                </p>
                <p className="mt-1 text-xs text-red-500">{overdueSponsors.map(sponsor => sponsor.name).join(', ')}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-1">
            <div>
              <p className="page-eyebrow mb-0">Detalhamento</p>
              <h2 className="text-lg font-extrabold text-kicks-navy">Desempenho por área</h2>
            </div>
            <span className="h-px flex-1 bg-[#0f2b43]/[.08]" />
          </div>

          {cards.length === 0 ? (
            <div className="panel py-14 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Icon name="chart" size={23} />
              </span>
              <p className="mt-4 font-bold text-slate-600">Nenhum dado encontrado</p>
              <p className="mt-1 text-sm text-slate-400">Comece lançando conciliações e despesas.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(costCenter => <CCCard key={costCenter.id} cc={costCenter} />)}
              </div>
              <CCCard cc={consolidated} highlight />
            </>
          )}
        </>
      )}
    </div>
  )
}
