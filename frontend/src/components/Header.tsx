import { useState, useEffect } from 'react'
import { Moon, Sun, Zap, Cpu } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface Tab { id: string; label: string }
interface HeaderProps { tabs: Tab[]; activeTab: string; onTabChange: (id: string) => void }

export default function Header({ tabs, activeTab, onTabChange }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [health, setHealth] = useState<{ gpu_available: boolean; gpu_name: string } | null>(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/health').then(r => r.json()).then(d => setHealth({ gpu_available: d.gpu_available, gpu_name: d.gpu_name })).catch(() => {})
    const t = setInterval(() => {
      fetch('/health').then(r => r.json()).then(d => setHealth({ gpu_available: d.gpu_available, gpu_name: d.gpu_name })).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className={`nav-bar fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${scrolled ? 'scrolled' : ''}`}>
      <div className="max-w-[1280px] mx-auto px-6 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/logo-ddn.svg" alt="DDN" className="h-7 w-auto" style={{ filter: theme === 'dark' ? 'invert(1)' : 'none' }} />
            <div className="flex items-baseline ml-2 pl-2" style={{ borderLeft: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`, height: '20px', alignSelf: 'center' }}>
              <span className="text-[13px]" style={{ fontWeight: 300, color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', letterSpacing: '0.05em' }}>BUILD.DDN:</span>
              <span className="text-[13px]" style={{ fontWeight: 700, color: theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'var(--ddn-red)', letterSpacing: '0.05em' }}>KVC</span>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map(tab => {
              const isDemo = tab.id === 'demo'
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-1.5 text-[13px] font-medium tracking-wide transition-all duration-200 rounded-full ${
                    isDemo
                      ? isActive ? 'bg-[#ED2738] text-white shadow-sm' : 'border border-[#ED2738]/40 text-[#ED2738] hover:bg-[#ED2738]/10'
                      : isActive ? 'text-[var(--ddn-red)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}>
                  {isDemo && <span className="mr-1 text-[10px]">◈</span>}
                  {tab.label}
                </button>
              )
            })}
          </nav>

          {/* Right: GPU badge + theme */}
          <div className="flex items-center gap-3">
            {health && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                health.gpu_available
                  ? 'bg-[#76B900]/10 text-[#76B900] border border-[#76B900]/20'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 border border-neutral-300'
              }`} title={health.gpu_name}>
                {health.gpu_available ? <><Zap className="w-3.5 h-3.5" />GPU</> : <><Cpu className="w-3.5 h-3.5" />CPU</>}
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-neutral-100 border border-neutral-200" style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>POWERED BY</span>
              <img src={theme === 'dark' ? '/nvidia-logo-light.png' : '/nvidia-logo-dark.png'} alt="NVIDIA" className="h-4" />
            </div>
            <button onClick={toggleTheme} className="p-2.5 rounded-lg nav-icon-button" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
