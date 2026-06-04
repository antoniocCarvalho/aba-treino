export type Phase = 'baseline' | 'acquisition' | 'maintenance' | 'generalization'
export type PromptMode = 'simple' | 'full'
export type CollectionType = 'dtt' | 'frequency' | 'duration' | 'abc'
export type ProgramStatus = 'mastered' | 'approaching' | 'training' | 'attention' | 'nil'
export type TrialType = 'IND' | 'PR' | 'ERR' | 'I' | 'V' | 'G' | 'M' | 'PP' | 'FP'
export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface TrialEntry { type: TrialType; score: number }
export interface DurEntry { start: number; end: number; ms: number }
export interface AbcEntry { antecedente: string; comportamento: string; consequencia: string; intensidade: 'Leve' | 'Moderada' | 'Intensa'; ts: number }

export interface Session {
  id: string
  student: string
  program: string
  date: string
  time: string
  timestamp: number
  plannedTrials: number
  trials: number
  score: number
  rate: number
  pdi: number | null
  ind: number
  pr: number
  err: number
  criterion: number
  duration: number
  streak: number
  notes: string
  log: TrialEntry[]
  phase: Phase
  promptMode: PromptMode
  collectionType: CollectionType
  // supervisão
  reviewedAt: string | null
  reviewedBy: string | null
  supervisorNotes: string
  // raw IDs for DB operations
  _patientId?: string
  _programId?: string
  _psychologistId?: string
}

export interface ActiveSession {
  student: string
  program: string
  plannedTrials: number
  criterion: number
  promptMode: PromptMode
  phase: Phase
  collectionType: CollectionType
  startTs: number
}

export type Role = 'bcba' | 'rbt'

export interface Profile {
  id: string
  full_name: string
  crp: string
  email?: string
  role?: Role
  supervisor_id?: string | null
}

export interface Patient {
  id?: string
  name: string
  sessions: Session[]
  meanRate: number
  lastDate: string
  programs: PatientProgram[]
}

export interface PatientProgram {
  id?: string
  name: string
  sessions: Session[]
  meanRate: number
  streak: number
  status: ProgramStatus
  criterion: number
}
