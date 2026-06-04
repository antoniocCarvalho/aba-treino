import { create } from 'zustand'
import { haptic } from '../lib/haptic'
import type { ActiveSession, TrialEntry, DurEntry, AbcEntry, TrialType, Phase, PromptMode, CollectionType, IntervalKind } from '../types'

const DRAFT_KEY = 'aba_draft_v1'
const DRAFT_MAX_AGE = 2 * 60 * 60 * 1000 // 2h

const SCORE: Record<string, number> = {
  IND: 1.0, PR: 0.5, ERR: 0.0,
  I: 1.0, V: 0.83, G: 0.67, M: 0.50, PP: 0.33, FP: 0.17,
}

interface DraftPayload {
  active: ActiveSession
  log: TrialEntry[]
  freqCount: number
  durLog: DurEntry[]
  abcLog: AbcEntry[]
  taScores: Record<number, TrialType>
  intervalMarks: boolean[]
  intervalCurrent: number
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
  // Análise de Tarefa
  taScores: Record<number, TrialType>
  // Registro por Intervalo
  intervalMarks: boolean[]
  intervalCurrent: number
  intervalRunning: boolean
  intervalStart: number | null
  intervalRemaining: number
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
    taStepsText: string
    intervalSeconds: number
    intervalCount: number
    intervalKind: IntervalKind
  }
  setPanel: (p: 'config' | 'recording' | 'result') => void
  updateConfig: (updates: Partial<SessionState['config']>) => void
  startSession: () => void
  recordTrial: (type: string) => void
  scoreTaStep: (index: number, type: TrialType) => void
  startIntervalTimer: () => void
  toggleCurrentInterval: () => void
  tickIntervalTimer: () => void
  undoByType: () => void
  incrementFreq: () => void
  toggleDuration: () => void
  addAbc: (entry: Omit<AbcEntry, 'ts'>) => void
  finishSession: () => void
  resetSession: () => void
  tickTimer: () => void
  tickDurTimer: () => void
  restoreDraft: () => void
  discardDraft: () => void
}

const DEFAULT_CONFIG = {
  student: '', program: '', plannedTrials: 10, criterion: 80,
  promptMode: 'simple' as PromptMode, phase: 'acquisition' as Phase, collectionType: 'dtt' as CollectionType,
  taStepsText: '', intervalSeconds: 10, intervalCount: 12, intervalKind: 'partial' as IntervalKind,
}

// ── Draft persistence helpers ────────────────────────────────────────────────
function persistDraft(s: SessionState) {
  if (!s.active) return
  const payload: DraftPayload = {
    active: s.active, log: s.log, freqCount: s.freqCount,
    durLog: s.durLog, abcLog: s.abcLog,
    taScores: s.taScores, intervalMarks: s.intervalMarks, intervalCurrent: s.intervalCurrent,
    timerSecs: s.timerSecs, savedAt: Date.now(),
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
  taScores: {},
  intervalMarks: [],
  intervalCurrent: 0,
  intervalRunning: false,
  intervalStart: null,
  intervalRemaining: 0,
  timerSecs: 0,
  durTimerDisplay: '00:00',
  config: { ...DEFAULT_CONFIG },

  setPanel: (p) => set({ panel: p }),

  updateConfig: (updates) => set((s) => ({ config: { ...s.config, ...updates } })),

  startSession: () => {
    const { config } = get()
    clearDraft()
    const taSteps = config.taStepsText.split('\n').map(s => s.trim()).filter(Boolean)
    const active: ActiveSession = {
      student: config.student, program: config.program,
      plannedTrials: config.plannedTrials, criterion: config.criterion,
      promptMode: config.promptMode, phase: config.phase, collectionType: config.collectionType,
      startTs: Date.now(),
      ...(config.collectionType === 'task_analysis' ? { taSteps } : {}),
      ...(config.collectionType === 'interval' ? {
        intervalSeconds: config.intervalSeconds, intervalCount: config.intervalCount, intervalKind: config.intervalKind,
      } : {}),
    }
    set({
      active, panel: 'recording',
      log: [], freqCount: 0, durLog: [], durRunning: false, durStart: null, abcLog: [],
      taScores: {},
      intervalMarks: config.collectionType === 'interval' ? Array(config.intervalCount).fill(false) : [],
      intervalCurrent: 0, intervalRunning: false, intervalStart: null,
      intervalRemaining: config.intervalSeconds,
      timerSecs: 0, durTimerDisplay: '00:00',
    })
  },

  recordTrial: (type) => {
    const { active, log } = get()
    if (!active) return
    if (log.length >= active.plannedTrials) return
    const newLog = [...log, { type: type as TrialType, score: SCORE[type] ?? 0 }]
    set({ log: newLog })
    haptic(25)
    persistDraft(get())
    if (newLog.length >= active.plannedTrials) {
      setTimeout(() => get().finishSession(), 350)
    }
  },

  // ── Análise de Tarefa: pontua um passo ──
  scoreTaStep: (index, type) => {
    set((s) => ({ taScores: { ...s.taScores, [index]: type } }))
    persistDraft(get())
  },

  // ── Registro por Intervalo ──
  startIntervalTimer: () => {
    const { active } = get()
    if (!active) return
    set({ intervalRunning: true, intervalStart: Date.now(), intervalRemaining: active.intervalSeconds ?? 10 })
  },

  toggleCurrentInterval: () => {
    set((s) => {
      const marks = [...s.intervalMarks]
      marks[s.intervalCurrent] = !marks[s.intervalCurrent]
      return { intervalMarks: marks }
    })
    persistDraft(get())
  },

  tickIntervalTimer: () => {
    const { active, intervalRunning, intervalStart, intervalCurrent, intervalMarks } = get()
    if (!active || !intervalRunning || intervalStart === null) return
    const len = active.intervalSeconds ?? 10
    const elapsed = Math.floor((Date.now() - intervalStart) / 1000)
    const remaining = len - elapsed
    if (remaining > 0) {
      set({ intervalRemaining: remaining })
      return
    }
    // Intervalo encerrado → avança
    const next = intervalCurrent + 1
    haptic(60)
    if (next >= (active.intervalCount ?? intervalMarks.length)) {
      set({ intervalRunning: false, intervalStart: null, intervalRemaining: 0 })
      persistDraft(get())
      setTimeout(() => get().finishSession(), 300)
    } else {
      set({ intervalCurrent: next, intervalStart: Date.now(), intervalRemaining: len })
      persistDraft(get())
    }
  },

  undoByType: () => {
    const { active, log, freqCount, durLog, abcLog, taScores } = get()
    if (!active) return
    switch (active.collectionType) {
      case 'dtt':       if (log.length)       set({ log: log.slice(0, -1) }); break
      case 'frequency': if (freqCount > 0)    set({ freqCount: freqCount - 1 }); break
      case 'duration':  if (durLog.length)    set({ durLog: durLog.slice(0, -1) }); break
      case 'abc':       if (abcLog.length)    set({ abcLog: abcLog.slice(0, -1) }); break
      case 'task_analysis': {
        const keys = Object.keys(taScores).map(Number)
        if (keys.length) { const last = Math.max(...keys); const c = { ...taScores }; delete c[last]; set({ taScores: c }) }
        break
      }
      case 'interval': get().toggleCurrentInterval(); return
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
      set({ durRunning: false, durStart: null, durLog: [...durLog, { start: durStart!, end: Date.now(), ms }] })
    }
    set({ panel: 'result', intervalRunning: false })
    persistDraft(get())
  },

  resetSession: () => {
    clearDraft()
    set({
      active: null, panel: 'config',
      log: [], freqCount: 0, durLog: [], durRunning: false, durStart: null, abcLog: [],
      taScores: {}, intervalMarks: [], intervalCurrent: 0, intervalRunning: false, intervalStart: null, intervalRemaining: 0,
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
      panel: 'recording',
      log: d.log, freqCount: d.freqCount, durLog: d.durLog, abcLog: d.abcLog,
      taScores: d.taScores ?? {},
      intervalMarks: d.intervalMarks ?? [], intervalCurrent: d.intervalCurrent ?? 0,
      intervalRunning: false, intervalStart: null, intervalRemaining: d.active.intervalSeconds ?? 0,
      durRunning: false, durStart: null, durTimerDisplay: '00:00',
      timerSecs: d.timerSecs,
    })
  },

  discardDraft: () => { clearDraft() },
}))
