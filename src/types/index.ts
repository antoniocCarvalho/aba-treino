export type Phase = 'baseline' | 'acquisition' | 'maintenance' | 'generalization'
export type PromptMode = 'simple' | 'full'
export type CollectionType = 'dtt' | 'frequency' | 'duration' | 'abc' | 'task_analysis' | 'interval'
export type IntervalKind = 'partial' | 'whole' | 'momentary'
export type ProgramStatus = 'mastered' | 'approaching' | 'training' | 'attention' | 'nil'
export type TrialType = 'IND' | 'PR' | 'ERR' | 'I' | 'V' | 'G' | 'M' | 'PP' | 'FP'
export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface TrialEntry { type: TrialType; score: number }
export interface DurEntry { start: number; end: number; ms: number }
export interface AbcEntry { antecedente: string; comportamento: string; consequencia: string; intensidade: 'Leve' | 'Moderada' | 'Intensa'; ts: number }
export interface TaStepEntry { step: string; type: TrialType; score: number }
export interface IntervalEntry { index: number; occurred: boolean }

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
  _pending?: boolean
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
  // Análise de Tarefa
  taSteps?: string[]
  // Registro por Intervalo
  intervalSeconds?: number
  intervalCount?: number
  intervalKind?: IntervalKind
}

export type Role = 'bcba' | 'rbt'

export type GoalDomain = 'comunicacao' | 'linguagem' | 'social' | 'brincar' | 'academico' | 'avd' | 'motor' | 'comportamento'
export type GoalTerm = 'short' | 'long'
export type GoalStatus = 'active' | 'achieved' | 'discontinued'

export interface TreatmentGoal {
  id: string
  patient_id: string
  title: string
  domain: GoalDomain
  description: string
  term: GoalTerm
  target_date: string | null
  status: GoalStatus
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  crp: string
  email?: string
  role?: Role
  supervisor_id?: string | null
  avatar_url?: string
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
