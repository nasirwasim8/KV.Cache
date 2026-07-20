import { useEffect, useState } from 'react'
import { Settings, MessageSquare, BarChart3, Info, Zap, Cpu, Database, Calculator } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface Tab { id: string; label: string; icon: string }
interface DemoSidebarProps { tabs: Tab[]; activeTab: string; onTabChange: (id: string) => void }

const iconMap: Record<string, React.ReactNode> = {
  settings:     <Settings      className="w-5 h-5" />,
  'message-sq': <MessageSquare className="w-5 h-5" />,
  'bar-chart':  <BarChart3     className="w-5 h-5" />,
  calculator:   <Calculator    className="w-5 h-5" />,
  info:         <Info          className="w-5 h-5" />,
}

export default function DemoSidebar({ tabs, activeTab, onTabChange }: DemoSidebarProps) {
  const [health, setHealth] = useState<{ infinia_connected: boolean; ollama_available: boolean; model_ready: boolean; gpu_available: boolean; hit_count?: number } | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const [h, s] = await Promise.all([
          fetch('/health').then(r => r.json()),
          fetch('/api/cache/stats').then(r => r.json()).catch(() => ({})),
        ])
        setHealth({ ...h, hit_count: s.hit_count ?? 0 })
      } catch { /* ignore */ }
    }
    fetchHealth()
    const t = setInterval(fetchHealth, 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <aside className="w-56 flex-shrink-0 hidden md:block">
      <div className="sticky top-[calc(var(--nav-height)+2rem)]">
        <nav className="space-y-1 px-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200"
                style={{
                  background: isActive ? 'var(--surface-card)' : 'transparent',
                  border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                }}>
                <span style={{ color: isActive ? 'var(--ddn-red)' : 'var(--text-muted)' }}>
                  {iconMap[tab.icon]}
                </span>
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-ddn-red" />}
              </button>
            )
          })}
        </nav>

        {/* System Status */}
        <div className="mt-8 mx-4 border-t pt-4 space-y-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${health?.gpu_available ? 'bg-[#76B900]/10' : 'bg-neutral-200'}`}>
              {health?.gpu_available ? <Zap className="w-3 h-3 text-[#76B900]" /> : <Cpu className="w-3 h-3 text-neutral-500" />}
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>System Status</span>
          </div>

          <div className="space-y-2">
            {[
              { label: 'DDN INFINIA', ok: health?.infinia_connected, okText: 'Connected', failText: 'Not configured' },
              { label: 'OLLAMA', ok: health?.model_ready, okText: 'Ready', failText: health?.ollama_available ? 'Loading' : 'Offline' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.ok ? 'text-[#76B900] bg-[#76B900]/10' : 'text-neutral-500 bg-neutral-200'}`} style={item.ok ? {} : { background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}>
                  {item.ok ? item.okText : item.failText}
                </span>
              </div>
            ))}

            {health?.hit_count !== undefined && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}><Database className="w-3 h-3 inline mr-1" />CACHE HITS</span>
                <span className="text-xs px-2 py-0.5 rounded-full text-[#1A81AF] font-mono" style={{ background: 'var(--status-info-subtle)' }}>
                  {health.hit_count}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
