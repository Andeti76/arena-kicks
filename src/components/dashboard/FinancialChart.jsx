import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useFinancialChart } from '../../hooks/useFinancialChart'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtK(v) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Tooltip customizado ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0B2238',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '12px 16px',
      minWidth: '180px',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
        {label}
      </p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between',
                                       gap: '16px', marginBottom: '4px' }}>
          <span style={{ color: p.color, fontSize: '12px' }}>{p.name}</span>
          <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>
            {fmtBRL(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Legenda customizada ──────────────────────────────────────────────────────
function CustomLegend({ payload }) {
  return (
    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center',
                  flexWrap: 'wrap', marginTop: '8px' }}>
      {payload.map(p => (
        <div key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: p.type === 'line' ? '20px' : '12px',
            height: p.type === 'line' ? '2px'  : '12px',
            borderRadius: p.type === 'line' ? '0' : '3px',
            background: p.color,
          }} />
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function FinancialChart() {
  const { data, loading, error } = useFinancialChart(6)

  if (loading) return (
    <div style={{
      background: 'white', borderRadius: '20px', padding: '24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '260px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
        <p style={{ fontSize: '13px' }}>Carregando dados...</p>
      </div>
    </div>
  )

  if (error) return null

  const hasData = data?.some(d => d.receita > 0 || d.despesa > 0)

  if (!hasData) return (
    <div style={{
      background: 'white', borderRadius: '20px', padding: '24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '200px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📈</div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Sem dados suficientes</p>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>Lance despesas e conciliações para ver a evolução.</p>
      </div>
    </div>
  )

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '20px 20px 12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
    }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af',
                      textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Evolução Financeira
          </p>
          <p style={{ fontSize: '11px', color: '#d1d5db', marginTop: '2px' }}>
            Últimos 6 meses
          </p>
        </div>
        {/* Resultado acumulado */}
        {(() => {
          const total = data.reduce((s, d) => s + d.resultado, 0)
          return (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Resultado acumulado
              </p>
              <p style={{ fontSize: '16px', fontWeight: 800,
                          color: total >= 0 ? '#059669' : '#dc2626', letterSpacing: '-0.5px' }}>
                {fmtBRL(total)}
              </p>
            </div>
          )
        })()}
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                       barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtK}
            tick={{ fontSize: 10, fill: '#d1d5db' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(11,34,56,0.04)' }} />
          <Legend content={<CustomLegend />} />

          <Bar dataKey="receita"    name="Receita Op."  fill="#10b981" radius={[4,4,0,0]} maxBarSize={40} />
          <Bar dataKey="patrocinio" name="Patrocínio"   fill="#C99A2E" radius={[4,4,0,0]} maxBarSize={40} />
          <Bar dataKey="despesa"    name="Despesa"      fill="#f87171" radius={[4,4,0,0]} maxBarSize={40} />
          <Line
            dataKey="resultado"
            name="Resultado"
            type="monotone"
            stroke="#0B2238"
            strokeWidth={2.5}
            dot={{ fill: '#0B2238', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#0B2238' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
