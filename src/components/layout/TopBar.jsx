import { useAuth } from '../../contexts/AuthContext'

export default function TopBar({ onMenuClick }) {
  const { profile } = useAuth()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <header className="bg-kicks-navy px-4 py-3 flex items-center gap-3 md:hidden shadow-md">
      {/* Botão hamburger */}
      <button
        onClick={onMenuClick}
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Abrir menu"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo centralizado */}
      <div className="flex-1 flex items-center justify-center">
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1.5px solid rgba(201,154,46,0.55)',
          flexShrink: 0,
        }}>
          <img
            src="/logo-nav.png"
            alt="Arena Kicks"
            style={{ width: '38px', height: '38px', objectFit: 'cover' }}
            onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
          />
        </div>
      </div>

      {/* Avatar do usuário */}
      <div className="h-8 w-8 rounded-full bg-kicks-gold flex items-center justify-center
                      text-kicks-navy font-bold text-xs shrink-0">
        {initials}
      </div>
    </header>
  )
}
