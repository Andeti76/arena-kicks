import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/',                label: 'Dashboard',      icon: '📊' },
  { to: '/conciliacao',     label: 'Conciliação',    icon: '✅' },
  { to: '/despesas',        label: 'Despesas',       icon: '💸' },
  { to: '/eventos',         label: 'Sub-Áreas',      icon: '🏆' },
  { to: '/patrocinadores',  label: 'Patrocinadores', icon: '🤝' },
  { to: '/dre',             label: 'DRE',            icon: '📈' },
  { to: '/configuracoes',   label: 'Configurações',  icon: '⚙️', ownerOnly: true },
]

export default function Sidebar({ open, onClose }) {
  const { isOwner } = useAuth()

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed z-30 inset-y-0 left-0 w-64 flex flex-col
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
        `}
        style={{
          background: 'linear-gradient(180deg, #0B2238 0%, #0d2940 60%, #0a1e30 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Logo ── */}
        <div className="flex flex-col items-center px-6 pt-7 pb-6">
          {/* Logo circle */}
          <div style={{ marginBottom: '12px' }}>
            <img
              src="/logo2.png"
              alt="Arena Kicks"
              style={{ width: '80px', height: '80px', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
            />
          </div>

          {/* Nome */}
          <p className="text-white font-bold text-base leading-tight tracking-tight">
            Arena Kicks
          </p>
          <p
            style={{
              color: '#C99A2E',
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: '3px',
            }}
          >
            Jacareí
          </p>
        </div>

        {/* ── Divisor ── */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 20px 16px' }} />

        {/* ── Nav ── */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            if (item.ownerOnly && !isOwner) return null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative
                  ${isActive
                    ? 'text-white'
                    : 'text-white/55 hover:text-white/90 hover:bg-white/06'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, rgba(201,154,46,0.22), rgba(201,154,46,0.10))',
                  border: '1px solid rgba(201,154,46,0.25)',
                  boxShadow: '0 2px 8px rgba(201,154,46,0.10)',
                } : {}}
              >
                {({ isActive }) => (
                  <>
                    {/* Indicator bar */}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '6px',
                          bottom: '6px',
                          width: '3px',
                          background: '#C99A2E',
                          borderRadius: '0 3px 3px 0',
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: '16px',
                        filter: isActive ? 'none' : 'grayscale(0.3)',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* ── Footer / usuário ── */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '16px 16px',
          }}
        >
          <UserFooter />
        </div>
      </aside>
    </>
  )
}

function UserFooter() {
  const { signOut, profile } = useAuth()
  const name = profile?.full_name ?? 'Usuário'
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #C99A2E, #a87d22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 700,
          color: 'white',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate leading-tight">{name}</p>
        <p className="text-white/40 text-xs">Online</p>
      </div>
      <button
        onClick={signOut}
        title="Sair"
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: 1,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
      >
        ↪
      </button>
    </div>
  )
}
