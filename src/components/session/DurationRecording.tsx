import { useSessionStore } from '../../stores/sessionStore'

export function DurationRecording() {
  const { durLog, durRunning, durTimerDisplay, toggleDuration } = useSessionStore()
  const totalMs = durLog.reduce((a, d) => a + d.ms, 0)

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 text-center">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Registro de Duração</p>
      <div className={`text-6xl font-black tabular leading-none mb-1 ${durRunning ? 'text-red-600' : 'text-primary'}`}>{durTimerDisplay}</div>
      <p className="text-sm text-slate-400 mb-5">{durRunning ? '● Gravando comportamento…' : `${durLog.length} registros · ${Math.round(totalMs/1000)}s acumulado`}</p>
      <button onClick={toggleDuration}
        className={`w-full rounded-2xl py-6 text-base font-black border-none shadow-lg active:scale-95 transition-all text-white ${durRunning ? 'bg-red-600 shadow-red-200' : 'bg-primary shadow-primary/25'}`}>
        {durRunning ? '⏹ Parar Comportamento' : '▶ Iniciar Comportamento'}
      </button>
      {durLog.length > 0 && (
        <div className="mt-4 max-h-36 overflow-y-auto space-y-1.5">
          {[...durLog].reverse().map((d, i) => (
            <div key={i} className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg text-xs">
              <span className="text-slate-400">#{durLog.length - i}</span>
              <span className="font-semibold text-slate-700">{Math.round(d.ms / 1000)}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
