import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { normalizeSession } from '../lib/utils'
import { enqueue, dequeue, getQueue, type SessionPayload } from '../lib/offline'
import type { Session, Profile, TreatmentGoal } from '../types'
import type { User } from '@supabase/supabase-js'

interface AppState {
  user: User | null
  profile: Profile | null
  sessions: Session[]
  goals: TreatmentGoal[]
  loading: boolean
  dataLoading: boolean
  pendingCount: number
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
  // conta / perfil
  updateProfile: (updates: { full_name?: string; crp?: string; avatar_url?: string }) => Promise<boolean>
  changePassword: (newPassword: string) => Promise<boolean>
  changeEmail: (newEmail: string) => Promise<boolean>
  exportMyData: () => Promise<void>
  deleteAccount: () => Promise<boolean>
  createShareLink: (patientId: string) => Promise<string | null>
  // offline / persistência de sessão
  commitSession: (payload: SessionPayload) => Promise<void>
  syncPending: () => Promise<void>
  // plano de tratamento
  fetchGoals: () => Promise<void>
  addGoal: (patientId: string, goal: Omit<TreatmentGoal, 'id' | 'patient_id' | 'created_at'>) => Promise<boolean>
  updateGoal: (id: string, updates: Partial<TreatmentGoal>) => Promise<boolean>
  deleteGoal: (id: string) => Promise<boolean>
}

// Converte um payload em uma Session otimista (exibida enquanto não sincroniza)
function payloadToOptimistic(p: SessionPayload, uid?: string): Session {
  const d = new Date(p.createdAt)
  return {
    id: 'local_' + p.localId,
    student: p.student, program: p.program,
    date: d.toLocaleDateString('pt-BR'),
    time: d.toTimeString().slice(0, 5),
    timestamp: p.createdAt,
    plannedTrials: p.plannedTrials, trials: p.trials,
    score: p.score, rate: p.rate, pdi: p.pdi,
    ind: p.ind, pr: p.pr, err: p.err,
    criterion: p.criterion, duration: p.duration, streak: p.streak,
    notes: p.notes, log: p.log as any,
    phase: p.phase, promptMode: p.promptMode, collectionType: p.collectionType,
    reviewedAt: null, reviewedBy: null, supervisorNotes: '',
    _psychologistId: uid, _pending: true,
  }
}

// Roda a cadeia upsert paciente → upsert programa → insert sessão no Supabase
async function persistToSupabase(p: SessionPayload, uid: string): Promise<Session> {
  const { data: pat, error: pe } = await supabase.from('patients')
    .upsert({ name: p.student, psychologist_id: uid }, { onConflict: 'psychologist_id,name' })
    .select('id').single()
  if (pe) throw pe

  const { data: prog, error: pre } = await supabase.from('programs')
    .upsert({ patient_id: pat.id, psychologist_id: uid, name: p.program, criterion: p.criterion }, { onConflict: 'patient_id,name' })
    .select('id').single()
  if (pre) throw pre

  const d = new Date(p.createdAt)
  const { data: saved, error: se } = await supabase.from('sessions').insert({
    psychologist_id: uid, patient_id: pat.id, program_id: prog.id,
    session_date: d.toISOString().slice(0, 10),
    session_time: d.toTimeString().slice(0, 8),
    planned_trials: p.plannedTrials, trials: p.trials,
    score: p.score, rate: p.rate,
    ind_count: p.ind, pr_count: p.pr, err_count: p.err,
    pdi: p.pdi, criterion: p.criterion, duration: p.duration, streak: p.streak,
    notes: p.notes, phase: p.phase, prompt_mode: p.promptMode, collection_type: p.collectionType,
    trial_log: p.log,
  }).select(`
    id, psychologist_id, session_date, session_time, recorded_at,
    planned_trials, trials, score, rate, ind_count, pr_count, err_count,
    pdi, criterion, duration, streak, notes, trial_log,
    phase, prompt_mode, collection_type, reviewed_at, reviewed_by, supervisor_notes,
    patient:patients!patient_id(id, name), program:programs!program_id(id, name)
  `).single()
  if (se) throw se
  return normalizeSession(saved)
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  sessions: [],
  goals: [],
  loading: true,
  dataLoading: false,
  pendingCount: getQueue().length,
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

  // ── Conta / perfil ────────────────────────────────────────────────────────
  updateProfile: async (updates) => {
    const uid = get().user?.id
    if (!uid) return false
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', uid)
      if (error) throw error
      set((st) => ({ profile: st.profile ? { ...st.profile, ...updates } : st.profile }))
      get().showToast('Perfil atualizado', 'success')
      return true
    } catch {
      get().showToast('Erro ao atualizar perfil', 'error')
      return false
    }
  },

  changePassword: async (newPassword) => {
    if (newPassword.length < 6) { get().showToast('A senha deve ter ao menos 6 caracteres', 'warning'); return false }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      get().showToast('Senha alterada com sucesso', 'success')
      return true
    } catch (e: any) {
      const msg = e?.message?.includes('should be different') ? 'A nova senha deve ser diferente da atual' : 'Erro ao alterar senha'
      get().showToast(msg, 'error')
      return false
    }
  },

  changeEmail: async (newEmail) => {
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      get().showToast('Enviamos um link de confirmação ao novo e-mail', 'success')
      return true
    } catch (e: any) {
      const msg = e?.message?.includes('already') ? 'Este e-mail já está em uso' : 'Erro ao alterar e-mail'
      get().showToast(msg, 'error')
      return false
    }
  },

  // ── Exportação completa (portabilidade LGPD) ──────────────────────────────
  exportMyData: async () => {
    const uid = get().user?.id
    if (!uid) return
    set({ dataLoading: true })
    try {
      const [patientsRes, programsRes, sessionsRes, goalsRes] = await Promise.all([
        supabase.from('patients').select('id, name, birth_date, notes, created_at').eq('psychologist_id', uid),
        supabase.from('programs').select('id, patient_id, name, criterion, status, created_at').eq('psychologist_id', uid),
        supabase.from('sessions').select('*').eq('psychologist_id', uid).order('recorded_at', { ascending: true }),
        supabase.from('treatment_goals').select('*').eq('psychologist_id', uid),
      ])
      const patients = patientsRes.data ?? []
      const programs = programsRes.data ?? []
      const sessions = sessionsRes.data ?? []
      const goals = goalsRes.data ?? []
      const prof = get().profile

      // Monta hierarquia paciente → programa → sessões
      const data = {
        exportadoEm: new Date().toISOString(),
        versao: 1,
        profissional: {
          nome: prof?.full_name ?? '', crp: prof?.crp ?? '',
          email: get().user?.email ?? '', papel: prof?.role ?? 'bcba',
        },
        pacientes: patients.map((p: any) => ({
          nome: p.name,
          nascimento: p.birth_date,
          observacoes: p.notes,
          cadastradoEm: p.created_at,
          objetivos: goals.filter((g: any) => g.patient_id === p.id).map((g: any) => ({
            titulo: g.title, dominio: g.domain, prazo: g.term, status: g.status,
            metaConclusao: g.target_date, descricao: g.description,
          })),
          programas: programs.filter((pr: any) => pr.patient_id === p.id).map((pr: any) => ({
            nome: pr.name, criterio: pr.criterion, status: pr.status,
            sessoes: sessions.filter((s: any) => s.program_id === pr.id).map((s: any) => ({
              data: s.session_date, hora: s.session_time, tipoColeta: s.collection_type,
              fase: s.phase, tentativas: s.trials, taxa: s.rate, idi: s.pdi,
              independente: s.ind_count, comPrompt: s.pr_count, erro: s.err_count,
              criterio: s.criterion, observacoes: s.notes, registros: s.trial_log,
            })),
          })),
        })),
        totais: { pacientes: patients.length, programas: programs.length, sessoes: sessions.length, objetivos: goals.length },
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aba_meus_dados_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      get().showToast('Dados exportados com sucesso', 'success')
    } catch (e) {
      console.error(e)
      get().showToast('Erro ao exportar dados', 'error')
    } finally {
      set({ dataLoading: false })
    }
  },

  // ── Portal para pais: gera link de progresso ──────────────────────────────
  createShareLink: async (patientId) => {
    const uid = get().user?.id
    if (!uid) return null
    try {
      const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '')
      const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 dias
      const { error } = await supabase.from('share_links')
        .insert({ token, patient_id: patientId, psychologist_id: uid, expires_at: expires })
      if (error) throw error
      return `${window.location.origin}/?share=${token}`
    } catch {
      get().showToast('Erro ao gerar link de compartilhamento', 'error')
      return null
    }
  },

  // ── Exclusão de conta (irreversível) ──────────────────────────────────────
  deleteAccount: async () => {
    set({ dataLoading: true })
    try {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error
      await supabase.auth.signOut()
      set({ user: null, profile: null, sessions: [], goals: [], dataLoading: false })
      return true
    } catch (e) {
      console.error(e)
      get().showToast('Erro ao excluir conta. Tente novamente.', 'error')
      set({ dataLoading: false })
      return false
    }
  },

  // ── Persistência de sessão (online/offline) ───────────────────────────────
  commitSession: async (payload) => {
    const uid = get().user?.id
    if (!uid) return

    // Offline → enfileira + sessão otimista local
    if (!navigator.onLine) {
      enqueue(payload)
      set((st) => ({
        sessions: [...st.sessions, payloadToOptimistic(payload, uid)],
        pendingCount: getQueue().length,
      }))
      get().showToast('Sem internet — salvo no dispositivo, sincroniza ao reconectar', 'warning')
      return
    }

    // Online → persiste direto
    set({ dataLoading: true })
    try {
      const saved = await persistToSupabase(payload, uid)
      set((st) => ({ sessions: [...st.sessions, saved] }))
      get().showToast('Sessão salva com sucesso!', 'success')
    } catch (e) {
      // Falha de rede → cai pra fila offline
      console.error(e)
      enqueue(payload)
      set((st) => ({
        sessions: [...st.sessions, payloadToOptimistic(payload, uid)],
        pendingCount: getQueue().length,
      }))
      get().showToast('Falha de conexão — salvo localmente para sincronizar', 'warning')
    } finally {
      set({ dataLoading: false })
    }
  },

  syncPending: async () => {
    const uid = get().user?.id
    const queue = getQueue()
    if (!uid || !queue.length || !navigator.onLine) return

    let synced = 0
    for (const payload of queue) {
      try {
        const saved = await persistToSupabase(payload, uid)
        dequeue(payload.localId)
        // Substitui a sessão otimista pela definitiva
        set((st) => ({
          sessions: st.sessions.map((s) => s.id === 'local_' + payload.localId ? saved : s),
          pendingCount: getQueue().length,
        }))
        synced++
      } catch (e) {
        console.error('Falha ao sincronizar sessão', e)
        // mantém na fila para a próxima tentativa
      }
    }
    if (synced > 0) get().showToast(`${synced} sessão(ões) sincronizada(s)`, 'success')
  },

  // ── Plano de tratamento ───────────────────────────────────────────────────
  fetchGoals: async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_goals')
        .select('id, patient_id, title, domain, description, term, target_date, status, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      set({ goals: (data ?? []) as TreatmentGoal[] })
    } catch (e) {
      // tabela ainda não criada → ignora silenciosamente
      console.warn('Plano de tratamento indisponível (rode a migration):', e)
    }
  },

  addGoal: async (patientId, goal) => {
    const uid = get().user?.id
    if (!uid) return false
    try {
      const { data, error } = await supabase.from('treatment_goals')
        .insert({ ...goal, patient_id: patientId, psychologist_id: uid })
        .select('id, patient_id, title, domain, description, term, target_date, status, created_at')
        .single()
      if (error) throw error
      set((st) => ({ goals: [data as TreatmentGoal, ...st.goals] }))
      get().showToast('Objetivo adicionado', 'success')
      return true
    } catch {
      get().showToast('Erro ao adicionar objetivo', 'error')
      return false
    }
  },

  updateGoal: async (id, updates) => {
    try {
      const { error } = await supabase.from('treatment_goals').update(updates).eq('id', id)
      if (error) throw error
      set((st) => ({ goals: st.goals.map((g) => g.id === id ? { ...g, ...updates } : g) }))
      return true
    } catch {
      get().showToast('Erro ao atualizar objetivo', 'error')
      return false
    }
  },

  deleteGoal: async (id) => {
    try {
      const { error } = await supabase.from('treatment_goals').delete().eq('id', id)
      if (error) throw error
      set((st) => ({ goals: st.goals.filter((g) => g.id !== id) }))
      get().showToast('Objetivo removido', 'success')
      return true
    } catch {
      get().showToast('Erro ao remover objetivo', 'error')
      return false
    }
  },
}))
