import { useEffect, useState } from 'react'
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

export default function TopBar() {
  const { profile, isPartner, isPlatformAdmin, signOut } = useAuth()
  const { pathname } = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map(name => name[0]).join('').toUpperCase()
    : '?'
  const firstName = profile?.full_name?.trim().split(' ')[0] || 'Usuário'

  useEffect(() => {
    setProfileOpen(false)
  }, [pathname])

  return (
    <div className="relative z-10 border-b border-white/10 bg-kicks-navy shadow-lg md:hidden">
      {profileOpen && (
        <button
          aria-label="Fechar menu do usuário"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setProfileOpen(false)}
        />
      )}

      <header className="flex items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <img src="/logo2.png" alt="Arena Kicks" className="h-9 w-9 object-contain drop-shadow-md" />
          <div className="min-w-0">
            <p className="truncate text-[9px] font-bold uppercase tracking-[.16em] text-kicks-gold-light">Arena Kicks</p>
            <p className="truncate text-sm font-bold text-white">{titles[pathname] ?? 'Gestão'}</p>
          </div>
        </div>

        <button
          aria-expanded={profileOpen}
          aria-label="Abrir opções do usuário"
          onClick={() => setProfileOpen(open => !open)}
          className={`relative z-20 flex shrink-0 items-center gap-2 rounded-xl border py-1.5 pl-3 pr-1.5 transition-all ${
            profileOpen
              ? 'border-kicks-gold/35 bg-white/[.11]'
              : 'border-white/10 bg-white/[.055]'
          }`}
        >
          <div className="max-w-[92px] text-right">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[.12em] text-white/35">Olá</p>
            <p className="truncate text-xs font-bold text-white">{firstName}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-kicks-gold-light to-kicks-gold text-[11px] font-extrabold text-kicks-navy">
            {initials}
          </div>
          <Icon
            name="chevronDown"
            size={13}
            className={`mr-1 text-white/45 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </header>

      {profileOpen && (
        <div className="absolute right-3 top-[60px] z-30 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0a2034]/95 p-2 shadow-[0_24px_55px_rgba(0,0,0,.38)] backdrop-blur-xl">
          <div className="border-b border-white/[.08] px-3 py-2.5">
            <p className="truncate text-sm font-bold text-white">{profile?.full_name || firstName}</p>
            <p className="mt-0.5 text-[10px] font-medium text-white/40">
              {isPlatformAdmin ? 'Administrador Andeti' : 'Conta Arena Kicks'}
            </p>
          </div>

          {isPartner && (
            <NavLink
              to="/configuracoes"
              className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/[.07] hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.06] text-kicks-gold-light">
                <Icon name="settings" size={16} />
              </span>
              Configurações
            </NavLink>
          )}

          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/[.08] hover:text-red-200"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/[.08]">
              <Icon name="logout" size={16} />
            </span>
            Sair do sistema
          </button>
        </div>
      )}

      <nav className="mobile-nav-scroll flex gap-1.5 overflow-x-auto px-3 pb-3">
        {navItems.map(item => {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold transition-all ${
                  isActive
                    ? 'border-kicks-gold/40 bg-kicks-gold text-kicks-navy shadow-lg shadow-black/15'
                    : 'border-white/[.16] bg-white/[.07] text-white/[.88] hover:bg-white/[.11] hover:text-white'
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
