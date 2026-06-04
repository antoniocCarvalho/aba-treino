import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { normalizeSession } from '../lib/utils'
import type { Session, Profile } from '../types'
import type { User } from '@supabase/supabase-js'

interface AppState {
  user: User | null
  profile: Profile | null
  sessions: Session[]
  loading: boolean
  dataLoading: boolean
  toast: { show: boolean; msg: string; type: 'success' | 'warning' | 'error' | 'info' }
  setUser: (u: User | null) => void
  setProfile: (p: Profile | null) => void
  setSessions: (s: Session[]) => void
  addSession: (s: Session) => void
  removeSession: (id: string) => void
  setLoading: (v: boolean) => void
  setDataLoading: (v: boolean) => void
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void
  hideToast: () => void
  fetchSessions: () => Promise<void>
  fetchProfile: () => Promise<void>
  logout: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  sessions: [],
  loading: true,
  dataLoading: false,
  toast: { show: false, msg: '', type: 'success' },

  setUser: (u) => set({ user: u }),
  setProfile: (p) => set({ profile: p }),
  setSessions: (s) => set({ sessions: s }),
  addSession: (s) => set((st) => ({ sessions: [...st.sessions, s] })),
  removeSession: (id) => set((st) => ({ sessions: st.sessions.filter((s) => s.id !== id) })),
  setLoading: (v) => set({ loading: v }),
  setDataLoading: (v) => set({ dataLoading: v }),

  showToast: (msg, type = 'success') => {
    set({ toast: { show: true, msg, type } })
    setTimeout(() => set({ toast: { show: false, msg: '', type: 'success' } }), 2800)
  },
  hideToast: () => set({ toast: { show: false, msg: '', type: 'success' } }),

  fetchSessions: async () => {
    set({ dataLoading: true })
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, session_date, session_time, recorded_at,
          planned_trials, trials, score, rate,
          ind_count, pr_count, err_count,
          pdi, criterion, duration, streak, notes, trial_log,
          phase, prompt_mode, collection_type,
          patient:patients!patient_id(id, name),
          program:programs!program_id(id, name)
        `)
        .order('recorded_at', { ascending: true })
      if (error) throw error
      set({ sessions: (data ?? []).map(normalizeSession) })
    } catch (e) {
      console.error(e)
      get().showToast('Erro ao carregar dados', 'error')
    } finally {
      set({ dataLoading: false })
    }
  },

  fetchProfile: async () => {
    const { data } = await supabase.from('profiles').select('*').single()
    if (data) set({ profile: data })
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, sessions: [] })
  },
}))
