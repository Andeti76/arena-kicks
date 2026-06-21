import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar  from './TopBar'
import { useState } from 'react'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo principal */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-main flex-1 overflow-y-auto">
          <div className="app-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
