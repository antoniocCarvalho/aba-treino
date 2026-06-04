import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAppStore } from './stores/appStore'
import { AuthPage } from './pages/AuthPage'
import { PatientsPage } from './pages/PatientsPage'
import { SessionPage } from './pages/SessionPage'
import { HistoryPage } from './pages/HistoryPage'
import { ReportPage } from './pages/ReportPage'
import { Header } from './components/layout/Header'
import { BottomNav } from './components/layout/BottomNav'
import { Toast } from './components/ui/Toast'
import { DraftRecoveryBanner } from './components/session/DraftRecoveryBanner'

export default function App() {
  const { user, loading, setUser, setLoading, fetchProfile, fetchSessions, dataLoading } = useAppStore()
  const [tab, setTab] = useState('patients')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) { fetchProfile(); fetchSessions() }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_ev, session) => {
      const prev = useAppStore.getState().user
      setUser(session?.user ?? null)
      if (session?.user && !prev) { fetchProfile(); fetchSessions() }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-slate-200 border-t-primary rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid' }} />
    </div>
  )

  if (!user) return <AuthPage />

  const pages: Record<string, React.ReactNode> = {
    patients: <PatientsPage onNavigate={setTab} />,
    session:  <SessionPage onNavigate={setTab} />,
    history:  <HistoryPage />,
    report:   <ReportPage />,
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pt-16 pb-nav">
        <div className="py-4">
          {tab !== 'session' && <DraftRecoveryBanner onRestore={() => setTab('session')} />}
          {pages[tab]}
        </div>
      </main>
      <BottomNav tab={tab} onTab={setTab} />
      <Toast />
      {dataLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-10 h-10 border-slate-200 border-t-primary rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid' }} />
        </div>
      )}
    </div>
  )
}
