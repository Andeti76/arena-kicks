export default function TopBar({ onMenuClick }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 md:px-6">
      {/* Menu mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-gray-500 hover:text-gray-700"
        aria-label="Abrir menu"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* Badge ambiente */}
      <span className="text-xs text-gray-400">Arena Kicks Jacareí</span>
    </header>
  )
}
