import type { Session } from '../types'
import { PHASE_LABEL } from './aba'

const COLLECTION_LABEL: Record<string, string> = {
  dtt: 'DTT', frequency: 'Frequência', duration: 'Duração', abc: 'ABC',
}

function csvCell(value: unknown): string {
  const s = String(value ?? '')
  // Escapa aspas e envolve em aspas se contiver separador, aspas ou quebra de linha
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Gera e baixa um CSV (compatível com Excel pt-BR: separador ; e BOM UTF-8). */
export function exportSessionsCSV(sessions: Session[], filename: string) {
  if (!sessions.length) return

  const headers = [
    'Data', 'Hora', 'Aluno', 'Programa', 'Fase', 'Tipo de Coleta',
    'Tentativas', 'Taxa (%)', 'IDI (%)', 'Independente', 'Com Prompt', 'Erro',
    'Critério (%)', 'Sequência', 'Duração (s)', 'Revisado', 'Observações', 'Nota de Supervisão',
  ]

  const rows = sessions.map((s) => [
    s.date, s.time, s.student, s.program,
    PHASE_LABEL[s.phase] ?? s.phase,
    COLLECTION_LABEL[s.collectionType] ?? s.collectionType,
    s.trials,
    s.collectionType === 'dtt' ? s.rate.toFixed(1).replace('.', ',') : '',
    s.pdi !== null ? s.pdi.toFixed(0) : '',
    s.ind, s.pr, s.err,
    s.criterion, s.streak, s.duration,
    s.reviewedAt ? 'Sim' : 'Não',
    s.notes, s.supervisorNotes,
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(';'))
    .join('\r\n')

  // BOM para o Excel reconhecer UTF-8 (acentos)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/** Baixa as sessões como JSON formatado. */
export function exportSessionsJSON(sessions: Session[], filename: string) {
  if (!sessions.length) return
  const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function dateStamp(): string {
  return new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')
}
