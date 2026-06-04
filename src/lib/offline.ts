import type { Phase, PromptMode, CollectionType, TrialEntry, AbcEntry, DurEntry } from '../types'

const QUEUE_KEY = 'aba_pending_v1'

// Payload completo de uma sessão pronta para persistir (online ou na fila offline)
export interface SessionPayload {
  localId: string
  student: string
  program: string
  plannedTrials: number
  criterion: number
  phase: Phase
  promptMode: PromptMode
  collectionType: CollectionType
  trials: number
  score: number
  rate: number
  pdi: number | null
  ind: number
  pr: number
  err: number
  duration: number
  streak: number
  notes: string
  log: TrialEntry[] | AbcEntry[] | DurEntry[] | { count: number }[]
  createdAt: number
}

export function getQueue(): SessionPayload[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

function setQueue(q: SessionPayload[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)) } catch { /* quota */ }
}

export function enqueue(payload: SessionPayload) {
  setQueue([...getQueue(), payload])
}

export function dequeue(localId: string) {
  setQueue(getQueue().filter((p) => p.localId !== localId))
}

export function queueSize(): number {
  return getQueue().length
}
