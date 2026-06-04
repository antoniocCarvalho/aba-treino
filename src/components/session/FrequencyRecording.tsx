import { useSessionStore } from '../../stores/sessionStore'

export function FrequencyRecording() {
  const freqCount = useSessionStore((s) => s.freqCount)
  const incrementFreq = useSessionStore((s) => s.incrementFreq)

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 text-center">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Registro de Frequência</p>
      <div className="text-7xl font-black text-primary tabular leading-none mb-2">{freqCount}</div>
      <p className="text-sm text-slate-400 mb-6">ocorrências registradas</p>
      <button onClick={incrementFreq}
        className="w-full bg-primary text-white rounded-2xl py-6 text-lg font-black border-none shadow-lg shadow-primary/25 active:scale-95 transition-all">
        + Registrar Ocorrência
      </button>
    </div>
  )
}
