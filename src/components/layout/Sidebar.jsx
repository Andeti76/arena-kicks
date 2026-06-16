import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/',              label: 'Dashboard',    icon: '📊' },
  { to: '/conciliacao',   label: 'Conciliação',  icon: '✅' },
  { to: '/despesas',      label: 'Despesas',     icon: '💸' },
  { to: '/eventos',       label: 'Eventos',      icon: '🏆' },
  { to: '/dre',           label: 'DRE',          icon: '📈' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙️', ownerOnly: true },
]

export default function Sidebar({ open, onClose }) {
  const { isOwner } = useAuth()

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed z-30 inset-y-0 left-0 w-64 bg-kicks-navy text-white flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <img src="/logo.png" alt="Arena Kicks" className="h-10 w-10 object-contain" />
          <div>
            <p className="font-bold text-white leading-tight">Arena Kicks</p>
            <p className="text-xs text-white/60">Jacareí</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => {
            if (item.ownerOnly && !isOwner) return null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-kicks-gold text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'}
                `}
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <SignOutButton />
        </div>
      </aside>
    </>
  )
}

function SignOutButton() {
  const { signOut, profile } = useAuth()
  return (
    <div className="flex items-center gap-3 px-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? 'Usuário'}</p>
      </div>
      <button
        onClick={signOut}
        className="text-white/60 hover:text-white text-xs transition-colors"
        title="Sair"
      >
        Sair
      </button>
    </div>
  )
}
