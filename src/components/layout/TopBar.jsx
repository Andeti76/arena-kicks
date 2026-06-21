import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../ui/Icon'

const navItems = [
  { to: '/', label: 'Painel', icon: 'dashboard' },
  { to: '/conciliacao', label: 'Conciliação', icon: 'reconcile' },
  { to: '/despesas', label: 'Despesas', icon: 'expense' },
  { to: '/eventos', label: 'Sub-Áreas', icon: 'areas' },
  { to: '/patrocinadores', label: 'Patrocínios', icon: 'sponsors' },
  { to: '/dre', label: 'DRE', icon: 'chart' },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings', partnerOnly: true },
]

const titles = {
  '/': 'Dashboard',
  '/conciliacao': 'Conciliação',
  '/despesas': 'Despesas',
  '/eventos': 'Sub-Áreas',
  '/patrocinadores': 'Patrocinadores',
  '/dre': 'DRE',
  '/configuracoes': 'Configurações',
}

export default function TopBar({ onMenuClick }) {
  const { profile, isPartner } = useAuth()
  const { pathname } = useLocation()
  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map(name => name[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="relative z-10 border-b border-white/10 bg-kicks-navy shadow-lg md:hidden">
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[.06] text-white/80"
          aria-label="Abrir perfil e opções"
        >
          <Icon name="menu" size={20} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <img src="/logo2.png" alt="Arena Kicks" className="h-9 w-9 object-contain drop-shadow-md" />
          <div className="min-w-0">
            <p className="truncate text-[9px] font-bold uppercase tracking-[.16em] text-kicks-gold-light">Arena Kicks</p>
            <p className="truncate text-sm font-bold text-white">{titles[pathname] ?? 'Gestão'}</p>
          </div>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-kicks-gold-light to-kicks-gold text-xs font-extrabold text-kicks-navy">
          {initials}
        </div>
      </header>

      <nav className="mobile-nav-scroll flex gap-1.5 overflow-x-auto px-3 pb-3">
        {navItems.map(item => {
          if (item.partnerOnly && !isPartner) return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
                  isActive
                    ? 'border-kicks-gold/40 bg-kicks-gold text-kicks-navy shadow-lg shadow-black/15'
                    : 'border-white/[.12] bg-white/[.065] text-white/82'
                }`
              }
            >
              <Icon name={item.icon} size={14} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
