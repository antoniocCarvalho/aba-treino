import type { Session, ProgramStatus, Phase, TrialType } from '../types'

export const PHASE_LABEL: Record<Phase, string> = {
  baseline: 'Baseline', acquisition: 'Aquisição',
  maintenance: 'Manutenção', generalization: 'Generalização',
}

export const STATUS_LABEL: Record<ProgramStatus, string> = {
  mastered: 'Masterizado ✓', approaching: 'Próx. Maestria ⭐',
  training: 'Em Aquisição', attention: 'Regressão ⚠', nil: 'Sem Dados',
}

export const SCORE: Record<TrialType, number> = {
  IND: 1.0, PR: 0.5, ERR: 0.0,
  I: 1.0, V: 0.83, G: 0.67, M: 0.50, PP: 0.33, FP: 0.17,
}

export const TRIAL_LABEL: Record<TrialType, string> = {
  IND: 'Independente (I)', PR: 'Com Prompt (P)', ERR: 'Erro (E)',
  I: 'Independente (I)', V: 'Verbal (V)', G: 'Gestual (G)',
  M: 'Modelo (M)', PP: 'Fís. Parcial (PP)', FP: 'Fís. Total (FP)',
}

export function computeStreak(sessions: Session[], criterion: number): number {
  const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp)
  let streak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].rate >= criterion) streak++
    else break
  }
  return streak
}

export function computeStatus(sessions: Session[], criterion: number): ProgramStatus {
  if (!sessions.length) return 'nil'
  const streak = computeStreak(sessions, criterion)
  if (streak >= 3) return 'mastered'
  if (streak >= 2) return 'approaching'
  const last5 = [...sessions].sort((a, b) => a.timestamp - b.timestamp).slice(-5).map(s => s.rate)
  const slope = linearRegression(last5)
  const lastRate = sessions[sessions.length - 1]?.rate ?? 0
  if (lastRate < 35 || slope < -8) return 'attention'
  return 'training'
}

export function linearRegression(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  values.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2 })
  return den === 0 ? 0 : num / den
}

export function movingAverage(arr: number[], window: number): number[] {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

export function trendArrow(slope: number): string {
  if (slope > 4) return '↑↑'
  if (slope > 1) return '↑'
  if (slope > -1) return '→'
  if (slope > -4) return '↓'
  return '↓↓'
}

export function formatDuration(secs: number): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m ? `${m}m${s ? s + 's' : ''}` : `${s}s`
}

export function rateColor(rate: number, criterion = 80): string {
  if (rate >= criterion) return '#059669'
  if (rate >= 50) return '#D97706'
  return '#DC2626'
}

export function statusColor(status: ProgramStatus): string {
  switch (status) {
    case 'mastered':   return 'bg-green-100 text-green-800'
    case 'approaching': return 'bg-yellow-100 text-yellow-800'
    case 'training':   return 'bg-indigo-100 text-indigo-700'
    case 'attention':  return 'bg-red-100 text-red-800'
    default:           return 'bg-gray-100 text-gray-600'
  }
}
