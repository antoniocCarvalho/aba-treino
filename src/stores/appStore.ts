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
  // CRUD
  renamePatient: (patientId: string, newName: string) => Promise<boolean>
  deletePatient: (patientId: string) => Promise<boolean>
  renameProgram: (programId: string, newName: string) => Promise<boolean>
  deleteProgram: (programId: string) => Promise<boolean>
  updateSessionNotes: (id: string, notes: string) => Promise<boolean>
  // supervisão
  markReviewed: (id: string, supervisorNotes: string) => Promise<boolean>
  unmarkReviewed: (id: string) => Promise<boolean>
  setRole: (role: 'bcba' | 'rbt') => Promise<boolean>
  linkSupervisor: (email: string) => Promise<boolean>
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
          id, psychologist_id, session_date, session_time, recorded_at,
          planned_trials, trials, score, rate,
          ind_count, pr_count, err_count,
          pdi, criterion, duration, streak, notes, trial_log,
          phase, prompt_mode, collection_type,
          reviewed_at, reviewed_by, supervisor_notes,
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

  // ── CRUD de paciente / programa / sessão ──────────────────────────────────
  renamePatient: async (patientId, newName) => {
    const name = newName.trim()
    if (!name) { get().showToast('Nome não pode ficar vazio', 'warning'); return false }
    set({ dataLoading: true })
    try {
      const { error } = await supabase.from('patients').update({ name }).eq('id', patientId)
      if (error) throw error
      // Atualiza cache local
      set((st) => ({ sessions: st.sessions.map((s) => s._patientId === patientId ? { ...s, student: name } : s) }))
      get().showToast('Paciente renomeado', 'success')
      return true
    } catch (e: any) {
      get().showToast(e?.code === '23505' ? 'Já existe um paciente com esse nome' : 'Erro ao renomear', 'error')
      return false
    } finally { set({ dataLoading: false }) }
  },

  deletePatient: async (patientId) => {
    set({ dataLoading: true })
    try {
      // FK ON DELETE CASCADE remove programas e sessões automaticamente
      const { error } = await supabase.from('patients').delete().eq('id', patientId)
      if (error) throw error
      set((st) => ({ sessions: st.sessions.filter((s) => s._patientId !== patientId) }))
      get().showToast('Paciente removido', 'success')
      return true
    } catch {
      get().showToast('Erro ao remover paciente', 'error')
      return false
    } finally { set({ dataLoading: false }) }
  },

  renameProgram: async (programId, newName) => {
    const name = newName.trim()
    if (!name) { get().showToast('Nome não pode ficar vazio', 'warning'); return false }
    set({ dataLoading: true })
    try {
      const { error } = await supabase.from('programs').update({ name }).eq('id', programId)
      if (error) throw error
      set((st) => ({ sessions: st.sessions.map((s) => s._programId === programId ? { ...s, program: name } : s) }))
      get().showToast('Programa renomeado', 'success')
      return true
    } catch (e: any) {
      get().showToast(e?.code === '23505' ? 'Já existe um programa com esse nome' : 'Erro ao renomear', 'error')
      return false
    } finally { set({ dataLoading: false }) }
  },

  deleteProgram: async (programId) => {
    set({ dataLoading: true })
    try {
      const { error } = await supabase.from('programs').delete().eq('id', programId)
      if (error) throw error
      set((st) => ({ sessions: st.sessions.filter((s) => s._programId !== programId) }))
      get().showToast('Programa removido', 'success')
      return true
    } catch {
      get().showToast('Erro ao remover programa', 'error')
      return false
    } finally { set({ dataLoading: false }) }
  },

  updateSessionNotes: async (id, notes) => {
    try {
      const { error } = await supabase.from('sessions').update({ notes }).eq('id', id)
      if (error) throw error
      set((st) => ({ sessions: st.sessions.map((s) => s.id === id ? { ...s, notes } : s) }))
      get().showToast('Observação atualizada', 'success')
      return true
    } catch {
      get().showToast('Erro ao atualizar observação', 'error')
      return false
    }
  },

  // ── Supervisão ────────────────────────────────────────────────────────────
  markReviewed: async (id, supervisorNotes) => {
    const uid = get().user?.id
    if (!uid) return false
    const reviewedAt = new Date().toISOString()
    try {
      const { error } = await supabase.from('sessions')
        .update({ reviewed_at: reviewedAt, reviewed_by: uid, supervisor_notes: supervisorNotes })
        .eq('id', id)
      if (error) throw error
      set((st) => ({ sessions: st.sessions.map((s) => s.id === id ? { ...s, reviewedAt, reviewedBy: uid, supervisorNotes } : s) }))
      get().showToast('Sessão revisada', 'success')
      return true
    } catch {
      get().showToast('Erro ao revisar sessão', 'error')
      return false
    }
  },

  unmarkReviewed: async (id) => {
    try {
      const { error } = await supabase.from('sessions')
        .update({ reviewed_at: null, reviewed_by: null, supervisor_notes: '' })
        .eq('id', id)
      if (error) throw error
      set((st) => ({ sessions: st.sessions.map((s) => s.id === id ? { ...s, reviewedAt: null, reviewedBy: null, supervisorNotes: '' } : s) }))
      return true
    } catch {
      get().showToast('Erro ao desfazer revisão', 'error')
      return false
    }
  },

  setRole: async (role) => {
    const uid = get().user?.id
    if (!uid) return false
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', uid)
      if (error) throw error
      set((st) => ({ profile: st.profile ? { ...st.profile, role } : st.profile }))
      get().showToast(role === 'bcba' ? 'Definido como Supervisor (BCBA)' : 'Definido como Técnico (RBT)', 'success')
      return true
    } catch {
      get().showToast('Erro ao alterar papel', 'error')
      return false
    }
  },

  linkSupervisor: async (email) => {
    try {
      const { data, error } = await supabase.rpc('link_supervisor', { supervisor_email: email.trim() })
      if (error) throw error
      if (!data) { get().showToast('Supervisor não encontrado com esse e-mail', 'warning'); return false }
      // refaz fetch do perfil para refletir role=rbt + supervisor_id
      await get().fetchProfile()
      get().showToast(`Vinculado ao supervisor ${data}`, 'success')
      return true
    } catch {
      get().showToast('Erro ao vincular supervisor', 'error')
      return false
    }
  },
}))
