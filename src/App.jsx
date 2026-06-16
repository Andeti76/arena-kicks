import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Pages
import LoginPage        from './pages/LoginPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import DashboardPage    from './pages/DashboardPage'
import ConciliacaoPage  from './pages/ConciliacaoPage'
import DespesasPage     from './pages/DespesasPage'
import EventosPage      from './pages/EventosPage'
import DREPage          from './pages/DREPage'
import SettingsPage     from './pages/SettingsPage'

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
          <Route path="dre" element={<DREPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
