import { useSessionStore } from '../../stores/sessionStore'
import type { TrialType } from '../../types'

const OPTS: { type: TrialType; label: string; cls: string; clsOn: string }[] = [
  { type: 'IND', label: 'I', cls: 'border-emerald-200 text-emerald-700', clsOn: 'bg-emerald-600 text-white border-emerald-600' },
  { type: 'PR',  label: 'P', cls: 'border-amber-200 text-amber-700',    clsOn: 'bg-amber-500 text-white border-amber-500' },
  { type: 'ERR', label: 'E', cls: 'border-red-200 text-red-700',        clsOn: 'bg-red-600 text-white border-red-600' },
]

export function TaskAnalysisRecording() {
  const { active, taScores, scoreTaStep } = useSessionStore()
  const steps = active?.taSteps ?? []
  const scored = Object.keys(taScores).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Análise de Tarefa — Encadeamento</p>
        <span className="text-xs font-semibold text-slate-500">{scored}/{steps.length} passos</span>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const current = taScores[i]
          return (
            <div key={i} className={`bg-white border rounded-xl p-3 ${current ? 'border-slate-200' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <p className="text-sm font-semibold text-slate-800 flex-1">{step}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {OPTS.map(o => (
                  <button key={o.type} onClick={() => scoreTaStep(i, o.type)}
                    className={`py-2 rounded-lg border-2 text-sm font-black transition-all active:scale-95 ${current === o.type ? o.clsOn : `bg-slate-50 ${o.cls}`}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-400 text-center mt-3">I = Independente · P = Com Prompt · E = Erro</p>
    </div>
  )
}
