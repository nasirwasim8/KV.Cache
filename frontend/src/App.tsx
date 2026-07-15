import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/ThemeContext'
import Header from './components/Header'
import DemoSidebar from './components/DemoSidebar'
import Configuration from './pages/Configuration'
import ChatObservatory from './pages/ChatObservatory'
import PrefixMultiplier from './pages/PrefixMultiplier'
import About from './pages/About'

const TABS = [
  { id: 'configuration', label: 'Configuration', icon: 'settings' },
  { id: 'observatory',   label: 'Chat Observatory',    icon: 'message-sq' },
  { id: 'prefix',        label: 'Prefix Multiplier',   icon: 'bar-chart' },
  { id: 'about',         label: 'Architecture',         icon: 'info' },
]

const HEADER_TABS = [
  { id: 'configuration', label: 'Configuration' },
  { id: 'demo',          label: 'Live Demos' },
  { id: 'about',         label: 'Architecture' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('observatory')

  const handleHeaderTab = (id: string) => {
    if (id === 'demo') setActiveTab('observatory')
    else setActiveTab(id)
  }

  const headerActiveTab = activeTab === 'observatory' || activeTab === 'prefix' ? 'demo' : activeTab

  return (
    <ThemeProvider>
      <div style={{ minHeight: '100vh', background: 'var(--surface-primary)' }}>
        <Header tabs={HEADER_TABS} activeTab={headerActiveTab} onTabChange={handleHeaderTab} />

        <div className="max-w-[1280px] mx-auto px-6" style={{ paddingTop: 'calc(var(--nav-height) + 2rem)' }}>
          <div className="flex gap-8">
            <DemoSidebar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 min-w-0 pb-16">
              {activeTab === 'configuration' && <Configuration />}
              {activeTab === 'observatory'   && <ChatObservatory />}
              {activeTab === 'prefix'        && <PrefixMultiplier />}
              {activeTab === 'about'         && <About />}
            </main>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t mt-8 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              BUILD.DDN:KVC — DDN Infinia KV Cache Observatory · FastAPI 8002 · Vite 5176
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              llama3.2:3b via Ollama · RTX 5090 GPU
            </span>
          </div>
        </footer>

        <Toaster position="bottom-right" toastOptions={{
          style: { background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', fontSize: '13px' },
          success: { iconTheme: { primary: '#00C280', secondary: 'white' } },
          error: { iconTheme: { primary: '#ED2738', secondary: 'white' } },
        }} />
      </div>
    </ThemeProvider>
  )
}
