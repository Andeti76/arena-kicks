import { Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B2238',
          padding: '24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</p>
          <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Algo deu errado
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px', maxWidth: '360px' }}>
            {this.state.error?.message ?? 'Erro inesperado no sistema.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#C99A2E',
              color: '#0B2238',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Pages
import LoginPage        from './pages/LoginPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import DashboardPage    from './pages/DashboardPage'
import ConciliacaoPage  from './pages/ConciliacaoPage'
import DespesasPage     from './pages/DespesasPage'
import EventosPage      from './pages/EventosPage'
import DREPage          from './pages/DREPage'
import SettingsPage         from './pages/SettingsPage'
import PatrocinadoresPage  from './pages/PatrocinadoresPage'

// Layout
import AppLayout from './components/layout/AppLayout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-kicks-navy">
      <div className="text-white text-sm opacity-60">Carregando...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />
        <Route path="/convite" element={<AcceptInvitePage />} />

        {/* Privadas — dentro do layout */}
        <Route path="/" element={
          <PrivateRoute><AppLayout /></PrivateRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="conciliacao" element={<ConciliacaoPage />} />
          <Route path="despesas" element={<DespesasPage />} />
          <Route path="eventos" element={<EventosPage />} />
          <Route path="patrocinadores" element={<PatrocinadoresPage />} />
          <Route path="dre" element={<DREPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ErrorBoundary>
  )
}
