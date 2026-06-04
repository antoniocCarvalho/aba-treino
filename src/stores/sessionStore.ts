import { create } from 'zustand'
import type { ActiveSession, TrialEntry, DurEntry, AbcEntry, Phase, PromptMode, CollectionType } from '../types'

const DRAFT_KEY = 'aba_draft_v1'
const DRAFT_MAX_AGE = 2 * 60 * 60 * 1000 // 2h

interface DraftPayload {
  active: ActiveSession
  log: TrialEntry[]
  freqCount: number
  durLog: DurEntry[]
  abcLog: AbcEntry[]
  timerSecs: number
  savedAt: number
}

interface SessionState {
  active: ActiveSession | null
  panel: 'config' | 'recording' | 'result'
  log: TrialEntry[]
  freqCount: number
  durLog: DurEntry[]
  durRunning: boolean
  durStart: number | null
  abcLog: AbcEntry[]
  timerSecs: number
  durTimerDisplay: string
  // config form (pre-session)
  config: {
    student: string
    program: string
    plannedTrials: number
    criterion: number
    promptMode: PromptMode
    phase: Phase
    collectionType: CollectionType
  }
  setPanel: (p: 'config' | 'recording' | 'result') => void
  updateConfig: (updates: Partial<SessionState['config']>) => void
  startSession: () => void
  recordTrial: (type: string) => void
  undoByType: () => void
  incrementFreq: () => void
  toggleDuration: () => void
  addAbc: (entry: Omit<AbcEntry, 'ts'>) => void
  finishSession: () => void
  resetSession: () => void
  tickTimer: () => void
  tickDurTimer: () => void
  // draft recovery
  restoreDraft: () => void
  discardDraft: () => void
}

const DEFAULT_CONFIG = {
  student: '', program: '', plannedTrials: 10, criterion: 80,
  promptMode: 'simple' as PromptMode, phase: 'acquisition' as Phase, collectionType: 'dtt' as CollectionType,
}

// ── Draft persistence helpers ────────────────────────────────────────────────
function persistDraft(s: Pick<SessionState, 'active' | 'log' | 'freqCount' | 'durLog' | 'abcLog' | 'timerSecs'>) {
  if (!s.active) return
  const payload: DraftPayload = {
    active: s.active, log: s.log, freqCount: s.freqCount,
    durLog: s.durLog, abcLog: s.abcLog, timerSecs: s.timerSecs, savedAt: Date.now(),
  }
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)) } catch { /* quota */ }
}

export function loadDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as DraftPayload
    if (Date.now() - d.savedAt > DRAFT_MAX_AGE) { localStorage.removeItem(DRAFT_KEY); return null }
    return d
  } catch { return null }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  active: null,
  panel: 'config',
  log: [],
  freqCount: 0,
  durLog: [],
  durRunning: false,
  durStart: null,
  abcLog: [],
  timerSecs: 0,
  durTimerDisplay: '00:00',
  config: { ...DEFAULT_CONFIG },

  setPanel: (p) => set({ panel: p }),

  updateConfig: (updates) => set((s) => ({ config: { ...s.config, ...updates } })),

  startSession: () => {
    const { config } = get()
    clearDraft()
    set({
      active: { ...config, startTs: Date.now() },
      panel: 'recording',
      log: [], freqCount: 0, durLog: [],
      durRunning: false, durStart: null,
      abcLog: [], timerSecs: 0, durTimerDisplay: '00:00',
    })
  },

  recordTrial: (type) => {
    const SCORE: Record<string, number> = {
      IND: 1.0, PR: 0.5, ERR: 0.0,
      I: 1.0, V: 0.83, G: 0.67, M: 0.50, PP: 0.33, FP: 0.17,
    }
    const { active, log } = get()
    if (!active) return
    if (log.length >= active.plannedTrials) return
    const newLog = [...log, { type: type as any, score: SCORE[type] ?? 0 }]
    set({ log: newLog })
    persistDraft(get())
    if (newLog.length >= active.plannedTrials) {
      setTimeout(() => get().finishSession(), 350)
    }
  },

  undoByType: () => {
    const { active, log, freqCount, durLog, abcLog } = get()
    if (!active) return
    switch (active.collectionType) {
      case 'dtt':       if (log.length)       set({ log: log.slice(0, -1) }); break
      case 'frequency': if (freqCount > 0)    set({ freqCount: freqCount - 1 }); break
      case 'duration':  if (durLog.length)    set({ durLog: durLog.slice(0, -1) }); break
      case 'abc':       if (abcLog.length)    set({ abcLog: abcLog.slice(0, -1) }); break
    }
    persistDraft(get())
  },

  incrementFreq: () => { set((s) => ({ freqCount: s.freqCount + 1 })); persistDraft(get()) },

  toggleDuration: () => {
    const { durRunning, durStart, durLog } = get()
    if (durRunning) {
      const ms = Date.now() - (durStart ?? Date.now())
      set({
        durRunning: false, durStart: null, durTimerDisplay: '00:00',
        durLog: [...durLog, { start: durStart!, end: Date.now(), ms }],
      })
      persistDraft(get())
    } else {
      set({ durRunning: true, durStart: Date.now() })
    }
  },

  addAbc: (entry) => {
    set((s) => ({ abcLog: [...s.abcLog, { ...entry, ts: Date.now() }] }))
    persistDraft(get())
  },

  finishSession: () => {
    const { durRunning, durStart, durLog } = get()
    if (durRunning) {
      const ms = Date.now() - (durStart ?? Date.now())
      set({
        durRunning: false, durStart: null,
        durLog: [...durLog, { start: durStart!, end: Date.now(), ms }],
      })
    }
    set({ panel: 'result' })
    persistDraft(get())
  },

  resetSession: () => {
    clearDraft()
    set({
      active: null, panel: 'config',
      log: [], freqCount: 0, durLog: [], durRunning: false, durStart: null, abcLog: [],
      timerSecs: 0, durTimerDisplay: '00:00',
      config: { ...DEFAULT_CONFIG },
    })
  },

  tickTimer: () => set((s) => ({ timerSecs: s.timerSecs + 1 })),

  tickDurTimer: () => {
    const { durRunning, durStart } = get()
    if (!durRunning || !durStart) return
    const elapsed = Math.floor((Date.now() - durStart) / 1000)
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
    const s = String(elapsed % 60).padStart(2, '0')
    set({ durTimerDisplay: `${m}:${s}` })
  },

  restoreDraft: () => {
    const d = loadDraft()
    if (!d) return
    set({
      active: d.active,
      panel: d.active.collectionType === 'dtt' && d.log.length >= d.active.plannedTrials ? 'result' : 'recording',
      log: d.log, freqCount: d.freqCount, durLog: d.durLog, abcLog: d.abcLog,
      durRunning: false, durStart: null, durTimerDisplay: '00:00',
      timerSecs: d.timerSecs,
    })
  },

  discardDraft: () => { clearDraft() },
}))
