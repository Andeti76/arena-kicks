import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    // Verifica atualização a cada 60 segundos enquanto o app estiver aberto
    setInterval(async () => {
      if (!registration?.installing && navigator.onLine) {
        await registration?.update()
      }
    }, 60_000)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
