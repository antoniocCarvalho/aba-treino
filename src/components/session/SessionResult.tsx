import { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { supabase } from '../../lib/supabase'
import { normalizeSession } from '../../lib/utils'
import { formatDuration } from '../../lib/aba'
import { TextArea } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function SessionResult({ onNavigate }: { onNavigate: (t: string) => void }) {
  const { active, log, freqCount, durLog, abcLog, resetSession } = useSessionStore()
  const { user, sessions, addSession, showToast } = useAppStore()
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
  } else {
    // abc
    trials = abcLog.length
    ind = abcLog.length
  }

  const duration = Math.round((Date.now() - active.startTs) / 1000)

  // Mastery streak projection
  const prevSess = sessions.filter(s => s.student === active.student && s.program === active.program)
  let prevStreak = 0
  const sorted = [...prevSess].sort((a, b) => a.timestamp - b.timestamp)
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].rate >= active.criterion) prevStreak++; else break
  }
  const projStreak = active.collectionType === 'dtt' && rate >= active.criterion ? prevStreak + 1 : 0

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      // Upsert patient
      const { data: pat, error: pe } = await supabase.from('patients')
        .upsert({ name: active!.student, psychologist_id: user.id }, { onConflict: 'psychologist_id,name' })
        .select('id').single()
      if (pe) throw pe

      // Upsert program
      const { data: prog, error: pre } = await supabase.from('programs')
        .upsert({ patient_id: pat.id, psychologist_id: user.id, name: active!.program, criterion: active!.criterion }, { onConflict: 'patient_id,name' })
        .select('id').single()
      if (pre) throw pre

      // Calc final streak
      let finalStreak = prevStreak
      if (active!.collectionType === 'dtt') finalStreak = rate >= active!.criterion ? prevStreak + 1 : 0

      const now = new Date()
      const { data: saved, error: se } = await supabase.from('sessions').insert({
        psychologist_id: user.id,
        patient_id:     pat.id,
        program_id:     prog.id,
        session_date:   now.toISOString().slice(0, 10),
        session_time:   now.toTimeString().slice(0, 8),
        planned_trials: active!.plannedTrials,
        trials, score: parseFloat(score.toFixed(2)),
        rate: parseFloat(rate.toFixed(2)),
        ind_count: ind, pr_count: pr, err_count: err,
        pdi: pdi !== null ? parseFloat(pdi.toFixed(1)) : null,
        criterion: active!.criterion,
        duration, streak: finalStreak,
        notes,
        phase: active!.phase,
        prompt_mode: active!.promptMode,
        collection_type: active!.collectionType,
        trial_log: active!.collectionType === 'dtt' ? log : active!.collectionType === 'abc' ? abcLog : active!.collectionType === 'duration' ? durLog : [{ count: freqCount }],
      }).select(`id, session_date, session_time, recorded_at, planned_trials, trials, score, rate, ind_count, pr_count, err_count, pdi, criterion, duration, streak, notes, trial_log, phase, prompt_mode, collection_type, patient:patients!patient_id(id,name), program:programs!program_id(id,name)`).single()
      if (se) throw se

      addSession(normalizeSession(saved))
      showToast('Sessão salva com sucesso!', 'success')
      resetSession()
      onNavigate('patients')
    } catch (e: any) {
      console.error(e)
      showToast(e?.message || 'Erro ao salvar sessão', 'error')
    } finally {
      setSaving(false)
    }
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
          <StatBox label="Tentativas" value={String(trials)} color="text-indigo-600" bg="bg-indigo-50" />
          {active.collectionType === 'dtt' ? (
            <>
              <StatBox label="Taxa" value={`${rate.toFixed(1)}%`} color="text-purple-600" bg="bg-purple-50" />
              <StatBox label="Independência" value={pdi !== null ? `${pdi.toFixed(0)}%` : '—'} color="text-emerald-600" bg="bg-emerald-50" />
            </>
          ) : (
            <StatBox label="Total acum." value={active.collectionType === 'duration' ? formatDuration(Math.round(durLog.reduce((a,d)=>a+d.ms,0)/1000)) : '—'} color="text-emerald-600" bg="bg-emerald-50" />
          )}
          <StatBox label="Duração" value={formatDuration(duration)} color="text-amber-600" bg="bg-amber-50" />
        </div>

        {/* Mastery alert */}
        {active.collectionType === 'dtt' && projStreak >= 2 && (
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
