import { useState } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import CCCard from '../components/dashboard/CCCard'
import { fmt, fmtDate } from '../lib/format'

const PERIODS = [
  { value: 'day',   label: 'Hoje' },
  { value: 'month', label: 'Este mês' },
]

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      {/* Hero skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: '96px', borderRadius: '20px', background: '#e5e7eb' }} />
        ))}
      </div>
      {/* Cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: '160px', borderRadius: '20px', background: '#e5e7eb' }} />
        ))}
      </div>
    </div>
  )
}

// ── KPI Box ───────────────────────────────────────────────────────────────────
function KpiBox({ label, value, color, icon, sub }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </span>
        <span style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <p style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '11px', color: '#9ca3af' }}>{sub}</p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [period, setPeriod] = useState('month')
  const { data, loading, error, reload } = useDashboard(period)

  const consolidated    = data?.consolidated
  const sponsorIncome   = data?.sponsorIncome ?? 0
  const overdueSponsors = data?.overdueSponsors ?? []
  const cards           = data?.cards ?? []
  const pendingCount  = cards.filter(c => c.statusToday === 'pending').length
  const discCount     = cards.filter(c => c.statusToday === 'discrepancy').length

  const periodLabel = period === 'day'
    ? `Hoje — ${fmtDate(data?.start)}`
    : data ? `${fmtDate(data.start)} a ${fmtDate(data.end)}` : ''

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0B2238', letterSpacing: '-0.5px' }}>
            Arena Kicks — Painel
          </h1>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            {periodLabel || 'Carregando período...'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={period === p.value ? 'tab-btn tab-btn-active' : 'tab-btn tab-btn-inactive'}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={reload}
            title="Atualizar"
            style={{
              width: '36px', height: '36px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              background: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B2238'; e.currentTarget.style.color = '#0B2238' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280' }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && <Skeleton />}

      {/* ── Erro ── */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: '12px', padding: '16px',
          color: '#dc2626', fontSize: '14px',
        }}>
          ⚠️ Erro ao carregar: {error}
        </div>
      )}

      {/* ── Conteúdo ── */}
      {!loading && !error && data && (
        <>
          {/* ── Hero: KPIs ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '12px',
          }}
          className="sm:grid-cols-4"
          >
            <KpiBox
              label="Receita Operacional"
              value={fmt(consolidated?.income)}
              color="#059669"
              icon="💰"
              sub={period === 'month' ? 'no mês' : 'hoje'}
            />
            <KpiBox
              label="Despesa"
              value={fmt(consolidated?.expense)}
              color="#dc2626"
              icon="📤"
              sub={period === 'month' ? 'no mês' : 'hoje'}
            />
            <KpiBox
              label="Resultado"
              value={fmt(consolidated?.result)}
              color={consolidated?.result >= 0 ? '#059669' : '#dc2626'}
              icon={consolidated?.result >= 0 ? '📈' : '📉'}
              sub="op. + patroc. − despesa"
            />
            <KpiBox
              label="Atenção"
              value={discCount > 0 ? `${discCount} área${discCount > 1 ? 's' : ''}` : pendingCount > 0 ? `${pendingCount} pend.` : 'Tudo OK'}
              color={discCount > 0 ? '#ef4444' : pendingCount > 0 ? '#f59e0b' : '#059669'}
              icon={discCount > 0 ? '⚠️' : pendingCount > 0 ? '🕐' : '✅'}
              sub={discCount > 0 ? 'com divergência' : pendingCount > 0 ? 'sem conciliação' : 'conciliado'}
            />
          </div>

          {/* ── Patrocínio (separado) ── */}
          {sponsorIncome > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #0B2238, #0d3050)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🤝</span>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Patrocínio {period === 'month' ? 'no mês' : 'hoje'}
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: '#C99A2E', letterSpacing: '-0.5px' }}>
                    {fmt(sponsorIncome)}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>
                Receita não<br />operacional
              </p>
            </div>
          )}

          {/* ── Alerta patrocinadores em atraso ── */}
          {overdueSponsors.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c' }}>
                  {overdueSponsors.length} patrocinador{overdueSponsors.length > 1 ? 'es' : ''} sem pagamento este mês
                </p>
                <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
                  {overdueSponsors.map(s => s.name).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* ── Divisor ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
              Por área
            </span>
            <div style={{ flex: 1, height: '1px', background: '#f3f4f6' }} />
          </div>

          {/* ── Cards por CC ── */}
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>📊</p>
              <p style={{ fontWeight: 600, color: '#6b7280' }}>Nenhum dado encontrado</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Comece lançando conciliações e despesas.</p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(1, 1fr)',
                gap: '12px',
                marginBottom: '12px',
              }}
              className="sm:grid-cols-2 xl:grid-cols-4"
              >
                {cards.map(cc => (
                  <CCCard key={cc.id} cc={cc} />
                ))}
              </div>

              {/* ── Consolidado ── */}
              <div style={{ marginTop: '4px' }}>
                <CCCard cc={consolidated} highlight />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
