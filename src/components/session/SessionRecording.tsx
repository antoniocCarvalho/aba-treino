import { useSessionStore } from '../../stores/sessionStore'
import { Button } from '../ui/Button'
import { DttSimple } from './DttSimple'
import { DttFull } from './DttFull'
import { FrequencyRecording } from './FrequencyRecording'
import { DurationRecording } from './DurationRecording'
import { AbcRecording } from './AbcRecording'
import { TaskAnalysisRecording } from './TaskAnalysisRecording'
import { IntervalRecording } from './IntervalRecording'
import { PHASE_LABEL, rateColor } from '../../lib/aba'

export function SessionRecording() {
  const { active, log, freqCount, durLog, abcLog, taScores, intervalMarks, timerSecs, undoByType, finishSession } = useSessionStore()
  if (!active) return null

  const timerDisplay = `${String(Math.floor(timerSecs / 60)).padStart(2,'0')}:${String(timerSecs % 60).padStart(2,'0')}`
  const currentRate = log.length ? (log.reduce((a, t) => a + t.score, 0) / log.length) * 100 : 0
  const nInd = log.filter(t => t.type === 'IND' || t.type === 'I').length
  const nPr  = log.filter(t => t.type !== 'IND' && t.type !== 'I' && t.type !== 'ERR').length
  const pdi  = (nInd + nPr) ? (nInd / (nInd + nPr)) * 100 : 0

  // Métricas de Análise de Tarefa
  const taSteps = active.taSteps ?? []
  const taScoredVals = Object.values(taScores)
  const taScore = taScoredVals.reduce((a, t) => a + (t === 'IND' || t === 'I' ? 1 : t === 'ERR' ? 0 : 0.5), 0)
  const taRate = taScoredVals.length ? (taScore / taScoredVals.length) * 100 : 0
  const taInd = taScoredVals.filter(t => t === 'IND' || t === 'I').length

  // Métricas de Intervalo
  const intOccurred = intervalMarks.filter(Boolean).length
  const intRate = intervalMarks.length ? (intOccurred / intervalMarks.length) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Session strip */}
      <div className="bg-primary rounded-2xl p-4 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-black text-base">{active.student}</p>
            <p className="text-sm opacity-80">{active.program}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <span className="bg-white/20 text-xs font-semibold px-2 py-0.5 rounded-full">{PHASE_LABEL[active.phase]}</span>
              <span className="bg-white/20 text-xs font-semibold px-2 py-0.5 rounded-full">Critério: {active.criterion}%</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tabular">{timerDisplay}</p>
            <p className="text-xs opacity-70 mt-0.5">tempo</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {active.collectionType === 'dtt' ? (
          <>
            <MetricChip label="Tentativas" value={`${log.length}/${active.plannedTrials}`} />
            <MetricChip label="% Acertos" value={`${currentRate.toFixed(0)}%`} color={rateColor(currentRate, active.criterion)} />
            <MetricChip label="IDI" value={`${pdi.toFixed(0)}%`} color="#7C3AED" />
          </>
        ) : active.collectionType === 'frequency' ? (
          <>
            <MetricChip label="Ocorrências" value={String(freqCount)} color="#5046E4" />
            <MetricChip label="Por minuto" value={timerSecs > 0 ? (freqCount / (timerSecs / 60)).toFixed(1) : '—'} />
            <MetricChip label="Tempo" value={timerDisplay} />
          </>
        ) : active.collectionType === 'duration' ? (
          <>
            <MetricChip label="Episódios" value={String(durLog.length)} color="#5046E4" />
            <MetricChip label="Acumulado" value={`${Math.round(durLog.reduce((a, d) => a + d.ms, 0) / 1000)}s`} />
            <MetricChip label="Sessão" value={timerDisplay} />
          </>
        ) : active.collectionType === 'abc' ? (
          <>
            <MetricChip label="Registros ABC" value={String(abcLog.length)} color="#5046E4" />
            <MetricChip label="Alta intensidade" value={String(abcLog.filter(r => r.intensidade === 'Intensa').length)} color="#DC2626" />
            <MetricChip label="Sessão" value={timerDisplay} />
          </>
        ) : active.collectionType === 'task_analysis' ? (
          <>
            <MetricChip label="Passos" value={`${taScoredVals.length}/${taSteps.length}`} />
            <MetricChip label="% Acertos" value={`${taRate.toFixed(0)}%`} color={rateColor(taRate, active.criterion)} />
            <MetricChip label="Independentes" value={`${taInd}`} color="#059669" />
          </>
        ) : (
          <>
            <MetricChip label="Intervalos" value={`${intOccurred}/${intervalMarks.length}`} color="#5046E4" />
            <MetricChip label="% Ocorrência" value={`${intRate.toFixed(0)}%`} color="#7C3AED" />
            <MetricChip label="Tempo" value={timerDisplay} />
          </>
        )}
      </div>

      {/* Progress bar para DTT e Tarefa */}
      {active.collectionType === 'dtt' && (
        <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className="h-2 bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (log.length / active.plannedTrials) * 100)}%` }} />
        </div>
      )}
      {active.collectionType === 'task_analysis' && taSteps.length > 0 && (
        <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className="h-2 bg-primary rounded-full transition-all duration-300" style={{ width: `${(taScoredVals.length / taSteps.length) * 100}%` }} />
        </div>
      )}

      {/* Recording UI */}
      {active.collectionType === 'dtt' && active.promptMode === 'simple' && <DttSimple />}
      {active.collectionType === 'dtt' && active.promptMode === 'full'   && <DttFull />}
      {active.collectionType === 'frequency'     && <FrequencyRecording />}
      {active.collectionType === 'duration'      && <DurationRecording />}
      {active.collectionType === 'abc'           && <AbcRecording />}
      {active.collectionType === 'task_analysis' && <TaskAnalysisRecording />}
      {active.collectionType === 'interval'      && <IntervalRecording />}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="ghost" onClick={undoByType}>↩ Desfazer</Button>
        <Button variant="primary" onClick={finishSession}>Encerrar Sessão ✓</Button>
      </div>
    </div>
  )
}

function MetricChip({ label, value, color = '#1E293B' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-card border border-slate-100">
      <p className="text-xl font-black tabular leading-none" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  )
}
