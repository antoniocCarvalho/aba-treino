import { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { formatDuration } from '../../lib/aba'
import type { SessionPayload } from '../../lib/offline'
import { TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function SessionResult({ onNavigate }: { onNavigate: (t: string) => void }) {
  const { active, log, freqCount, durLog, abcLog, taScores, intervalMarks, resetSession } = useSessionStore()
  const { user, sessions, commitSession } = useAppStore()
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  if (!active) return null

  // Compute results per collection type
  let trials = 0, score = 0, rate = 0, pdi: number | null = null, ind = 0, pr = 0, err = 0
  if (active.collectionType === 'dtt') {
    ind = log.filter(t => t.type === 'IND' || t.type === 'I').length
    pr  = log.filter(t => t.type !== 'IND' && t.type !== 'I' && t.type !== 'ERR').length
    err = log.filter(t => t.type === 'ERR').length
    score = log.reduce((a, t) => a + t.score, 0)
    trials = log.length
    rate   = trials ? (score / trials) * 100 : 0
    pdi    = (ind + pr) ? (ind / (ind + pr)) * 100 : null
  } else if (active.collectionType === 'frequency') {
    trials = freqCount
    // ind_count carrega a contagem bruta para não violar constraints do banco
    ind = freqCount
  } else if (active.collectionType === 'duration') {
    trials = durLog.length
    ind = durLog.length
  } else if (active.collectionType === 'task_analysis') {
    const vals = Object.values(taScores)
    ind = vals.filter(t => t === 'IND' || t === 'I').length
    pr  = vals.filter(t => t !== 'IND' && t !== 'I' && t !== 'ERR').length
    err = vals.filter(t => t === 'ERR').length
    score = vals.reduce((a, t) => a + (t === 'IND' || t === 'I' ? 1 : t === 'ERR' ? 0 : 0.5), 0)
    trials = vals.length
    rate   = trials ? (score / trials) * 100 : 0
    pdi    = (ind + pr) ? (ind / (ind + pr)) * 100 : null
  } else if (active.collectionType === 'interval') {
    const occurred = intervalMarks.filter(Boolean).length
    trials = intervalMarks.length
    ind = occurred
    rate = trials ? (occurred / trials) * 100 : 0
  } else {
    // abc
    trials = abcLog.length
    ind = abcLog.length
  }

  // Duração só é significativa no tipo "Duração" (soma dos episódios cronometrados).
  // Demais tipos não usam tempo de sessão (registro pode ser feito após o atendimento).
  const duration = active.collectionType === 'duration'
    ? Math.round(durLog.reduce((a, d) => a + d.ms, 0) / 1000)
    : 0

  // Tipos com taxa significativa (contam para maestria)
  const hasRate = active.collectionType === 'dtt' || active.collectionType === 'task_analysis' || active.collectionType === 'interval'

  // Mastery streak projection
  const prevSess = sessions.filter(s => s.student === active.student && s.program === active.program)
  let prevStreak = 0
  const sorted = [...prevSess].sort((a, b) => a.timestamp - b.timestamp)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].rate >= active.criterion) prevStreak++; else break
  }
  const projStreak = hasRate && rate >= active.criterion ? prevStreak + 1 : 0

  function buildLog() {
    switch (active!.collectionType) {
      case 'dtt': return log
      case 'abc': return abcLog
      case 'duration': return durLog
      case 'frequency': return [{ count: freqCount }]
      case 'task_analysis':
        return (active!.taSteps ?? []).map((step, i) => ({
          step, type: taScores[i] ?? 'ERR',
          score: taScores[i] === 'IND' || taScores[i] === 'I' ? 1 : taScores[i] === 'ERR' || !taScores[i] ? 0 : 0.5,
        }))
      case 'interval':
        return intervalMarks.map((occurred, index) => ({ index, occurred }))
      default: return []
    }
  }

  async function handleSave() {
    if (!user || !active) return
    setSaving(true)

    const finalStreak = hasRate ? (rate >= active.criterion ? prevStreak + 1 : 0) : prevStreak

    const payload: SessionPayload = {
      localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      student: active.student, program: active.program,
      plannedTrials: active.plannedTrials, criterion: active.criterion,
      phase: active.phase, promptMode: active.promptMode, collectionType: active.collectionType,
      trials, score: parseFloat(score.toFixed(2)), rate: parseFloat(rate.toFixed(2)),
      pdi: pdi !== null ? parseFloat(pdi.toFixed(1)) : null,
      ind, pr, err, duration, streak: finalStreak, notes,
      log: buildLog() as any,
      createdAt: Date.now(),
    }

    await commitSession(payload)
    resetSession()
    onNavigate('patients')
    setSaving(false)
  }

  const emoji = rate >= active.criterion ? '🏆' : rate >= 70 ? '⭐' : rate >= 50 ? '📈' : '📝'

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="text-center mb-5">
          <div className="text-5xl mb-2">{emoji}</div>
          <h2 className="text-xl font-black text-slate-900">Sessão Encerrada!</h2>
          <p className="text-sm text-slate-500 mt-1">{active.student} — {active.program}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatBox
            label={active.collectionType === 'task_analysis' ? 'Passos' : active.collectionType === 'interval' ? 'Intervalos' : active.collectionType === 'duration' ? 'Episódios' : active.collectionType === 'abc' ? 'Registros' : 'Tentativas'}
            value={String(trials)} color="text-indigo-600" bg="bg-indigo-50"
          />
          {hasRate ? (
            <>
              <StatBox label={active.collectionType === 'interval' ? '% Ocorrência' : 'Taxa'} value={`${rate.toFixed(1)}%`} color="text-purple-600" bg="bg-purple-50" />
              {active.collectionType !== 'interval'
                ? <StatBox label="Independência" value={pdi !== null ? `${pdi.toFixed(0)}%` : '—'} color="text-emerald-600" bg="bg-emerald-50" />
                : <StatBox label="Ocorrências" value={String(ind)} color="text-emerald-600" bg="bg-emerald-50" />}
            </>
          ) : active.collectionType === 'duration' ? (
            <StatBox label="Tempo total" value={formatDuration(duration)} color="text-emerald-600" bg="bg-emerald-50" />
          ) : (
            <StatBox label="Intensidade alta" value={String(abcLog.filter(r => r.intensidade === 'Intensa').length)} color="text-red-600" bg="bg-red-50" />
          )}
        </div>

        {/* Mastery alert */}
        {hasRate && projStreak >= 2 && (
          <div className={`rounded-xl p-3 mb-4 text-center text-sm font-bold ${projStreak >= 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            {projStreak >= 3 ? `🏆 Critério de Maestria Atingido! ${projStreak} sessões consecutivas ≥ ${active.criterion}%` : `⭐ Próximo da maestria! ${projStreak}/3 sessões ≥ ${active.criterion}%`}
          </div>
        )}

        <TextArea label="Observações (opcional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Comportamentos relevantes, intercorrências, ajustes de procedimento…" className="mb-4" />

        <Button variant="primary" size="lg" fullWidth onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar e Continuar'}
        </Button>
      </Card>
    </div>
  )
}

function StatBox({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className={`text-2xl font-black tabular ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
