import { useSessionStore } from '../../stores/sessionStore'

const KIND_LABEL: Record<string, string> = {
  partial: 'Parcial', whole: 'Total', momentary: 'Momentâneo',
}

export function IntervalRecording() {
  const { active, intervalMarks, intervalCurrent, intervalRunning, intervalRemaining, startIntervalTimer, toggleCurrentInterval } = useSessionStore()
  if (!active) return null

  const total = active.intervalCount ?? intervalMarks.length
  const occurred = intervalMarks.filter(Boolean).length
  const done = intervalCurrent >= total
  const currentOccurred = intervalMarks[intervalCurrent]

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Registro por Intervalo</p>
        <span className="text-xs font-semibold text-indigo-500">{KIND_LABEL[active.intervalKind ?? 'partial']}</span>
      </div>

      {/* Grade de intervalos */}
      <div className="flex flex-wrap justify-center gap-1.5 my-4">
        {intervalMarks.map((m, i) => (
          <div key={i}
            className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center
              ${i === intervalCurrent && intervalRunning ? 'ring-2 ring-primary ring-offset-1' : ''}
              ${i < intervalCurrent || (i === intervalCurrent && done) ? (m ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400')
                : i === intervalCurrent ? (m ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400')
                : 'bg-slate-50 text-slate-300'}`}>
            {i + 1}
          </div>
        ))}
      </div>

      {!intervalRunning && !done && (
        <>
          <p className="text-sm text-slate-500 mb-4">{total} intervalos de {active.intervalSeconds}s</p>
          <button onClick={startIntervalTimer} className="w-full bg-primary text-white rounded-2xl py-5 text-base font-black border-none shadow-lg shadow-primary/25 active:scale-95 transition-all">
            ▶ Iniciar Observação
          </button>
        </>
      )}

      {intervalRunning && !done && (
        <>
          <p className="text-5xl font-black tabular leading-none mb-1" style={{ color: currentOccurred ? '#059669' : '#5046E4' }}>{intervalRemaining}s</p>
          <p className="text-xs text-slate-400 mb-4">Intervalo {intervalCurrent + 1} de {total}</p>
          <button onClick={toggleCurrentInterval}
            className={`w-full rounded-2xl py-6 text-lg font-black border-none shadow-lg active:scale-95 transition-all text-white ${currentOccurred ? 'bg-emerald-600 shadow-emerald-200' : 'bg-slate-400 shadow-slate-200'}`}>
            {currentOccurred ? '✓ Comportamento OCORREU' : 'Marcar ocorrência'}
          </button>
          <p className="text-xs text-slate-400 mt-3">{occurred} de {intervalCurrent + 1} intervalos com ocorrência</p>
        </>
      )}

      {done && (
        <>
          <p className="text-3xl font-black text-primary mb-1">{total > 0 ? Math.round(occurred / total * 100) : 0}%</p>
          <p className="text-sm text-slate-500">dos intervalos com ocorrência</p>
          <p className="text-xs text-slate-400 mt-2">Observação concluída — encerre a sessão para salvar</p>
        </>
      )}
    </div>
  )
}
