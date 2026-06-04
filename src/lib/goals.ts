import type { GoalDomain, GoalStatus, GoalTerm } from '../types'

export const DOMAIN_LABEL: Record<GoalDomain, string> = {
  comunicacao: 'Comunicação',
  linguagem: 'Linguagem',
  social: 'Habilidades Sociais',
  brincar: 'Brincar',
  academico: 'Acadêmico',
  avd: 'Atividades de Vida Diária',
  motor: 'Motor',
  comportamento: 'Comportamento',
}

export const DOMAIN_COLOR: Record<GoalDomain, string> = {
  comunicacao: 'bg-indigo-100 text-indigo-700',
  linguagem: 'bg-blue-100 text-blue-700',
  social: 'bg-purple-100 text-purple-700',
  brincar: 'bg-pink-100 text-pink-700',
  academico: 'bg-cyan-100 text-cyan-700',
  avd: 'bg-amber-100 text-amber-700',
  motor: 'bg-teal-100 text-teal-700',
  comportamento: 'bg-rose-100 text-rose-700',
}

export const TERM_LABEL: Record<GoalTerm, string> = {
  short: 'Curto prazo',
  long: 'Longo prazo',
}

export const STATUS_LABEL: Record<GoalStatus, string> = {
  active: 'Em andamento',
  achieved: 'Alcançado',
  discontinued: 'Descontinuado',
}

export const STATUS_COLOR: Record<GoalStatus, string> = {
  active: 'bg-indigo-100 text-indigo-700',
  achieved: 'bg-emerald-100 text-emerald-700',
  discontinued: 'bg-slate-100 text-slate-500',
}
