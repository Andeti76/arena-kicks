import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Icon from '../ui/Icon'

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/conciliacao', label: 'Conciliação', icon: 'reconcile' },
  { to: '/despesas', label: 'Despesas', icon: 'expense' },
  { to: '/eventos', label: 'Sub-Áreas', icon: 'areas' },
  { to: '/patrocinadores', label: 'Patrocinadores', icon: 'sponsors' },
  { to: '/dre', label: 'DRE', icon: 'chart' },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings', partnerOnly: true },
]

export default function Sidebar() {
  const { isOwner, isPartner } = useAuth()

  return (
    <>
      <aside
        className="relative z-30 hidden w-[272px] flex-col overflow-hidden md:flex"
        style={{
          background:
            'radial-gradient(circle at 50% -5%, rgba(201,154,46,.20), transparent 25%), linear-gradient(180deg, #0B2238 0%, #081D30 64%, #071827 100%)',
          borderRight: '1px solid rgba(255,255,255,.06)',
          boxShadow: '16px 0 50px rgba(7,24,39,.12)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative px-5 pb-5 pt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.045] p-3.5">
            <div className="relative shrink-0">
              <div className="absolute inset-2 rounded-full bg-kicks-gold/25 blur-xl" />
              <img
                src="/logo2.png"
                alt="Arena Kicks"
                className="relative h-[68px] w-[68px] object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,.4)]"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-kicks-gold-light">
                Andeti apresenta
              </p>
              <p className="mt-1 text-[17px] font-extrabold leading-tight text-white">Arena Kicks</p>
              <p className="mt-0.5 text-[11px] font-medium tracking-wide text-white/45">Gestão Jacareí</p>
            </div>
          </div>
        </div>

        <div className="relative mx-5 mb-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-white/[.08]" />
          <span className="text-[9px] font-bold uppercase tracking-[.18em] text-white/25">Central de gestão</span>
          <span className="h-px flex-1 bg-white/[.08]" />
        </div>

        <nav className="relative flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map(item => {
            if (item.ownerOnly && !isOwner) return null
            if (item.partnerOnly && !isPartner) return null

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-white/80 hover:bg-white/[.065] hover:text-white'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(110deg, rgba(201,154,46,.22), rgba(201,154,46,.08))',
                  border: '1px solid rgba(226,184,90,.19)',
                  boxShadow: 'inset 0 1px rgba(255,255,255,.045), 0 10px 28px rgba(0,0,0,.11)',
                } : { border: '1px solid transparent' }}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute -left-[1px] top-2.5 h-7 w-[3px] rounded-r-full bg-kicks-gold-light shadow-[0_0_12px_rgba(226,184,90,.65)]" />
                    )}
                    <span className={`icon-live flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      isActive ? 'bg-kicks-gold/15 text-kicks-gold-light' : 'bg-white/[.07] text-white/70 group-hover:bg-white/[.10] group-hover:text-white'
                    }`}>
                      <Icon name={item.icon} size={17} />
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="relative border-t border-white/[.07] p-4">
          <UserFooter />
        </div>
      </aside>
    </>
  )
}

function UserFooter() {
  const { signOut, profile } = useAuth()
  const name = profile?.full_name ?? 'Usuário'
  const initials = name.split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.035] p-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-kicks-gold-light to-kicks-gold text-xs font-extrabold text-kicks-navy shadow-lg shadow-black/20">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-white">{name}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[10px] text-white/38">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]" />
          Sessão segura
        </p>
      </div>
      <button
        onClick={signOut}
        title="Sair"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[.06] hover:text-white"
      >
        <Icon name="logout" size={16} />
      </button>
    </div>
  )
}
