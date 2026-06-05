import { useState } from 'react'
import { LogOut, ChevronDown, TrendingUp, Settings, HelpCircle } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function Header({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { user, profile, logout } = useAppStore()
  const active = useSessionStore((s) => s.active)
  const supervisionEnabled = useSettingsStore((s) => s.supervisionEnabled)
  const [menuOpen, setMenuOpen] = useState(false)

  const initial = (profile?.full_name || user?.email || '?').charAt(0).toUpperCase()
  const roleLabel = profile?.role === 'rbt' ? 'Técnico (RBT)' : 'Supervisor (BCBA)'

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-100 shadow-sm no-print">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-black text-primary leading-none tracking-tight">Evolvy</p>
            <p className="text-xs text-slate-400 leading-none mt-0.5">Plataforma ABA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate?.('guide')} title="Guia do profissional" className="text-slate-400 hover:text-primary p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            <HelpCircle size={20} />
          </button>
          {active && (
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              {active.student}
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full pl-1 pr-2.5 py-1 hover:bg-slate-100 transition-colors"
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">{initial}</div>}
              <span className="text-xs font-semibold text-slate-700 max-w-20 truncate">{profile?.full_name || user?.email}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-modal z-20 min-w-48 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">{profile?.full_name || 'Psicólogo'}</p>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                    {profile?.crp && <p className="text-xs text-slate-400 mt-0.5">CRP {profile.crp}</p>}
                    {supervisionEnabled && <span className="inline-block mt-1.5 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{roleLabel}</span>}
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); onNavigate?.('settings') }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings size={14} /> Configurações
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onNavigate?.('guide') }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <HelpCircle size={14} /> Guia do profissional
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); logout() }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                  >
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
