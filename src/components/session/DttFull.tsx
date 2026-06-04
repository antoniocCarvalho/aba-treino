import { useSessionStore } from '../../stores/sessionStore'

const LEVELS = [
  { type: 'I',   label: 'Independente (I)',     pts: '1,0',  bg: 'bg-emerald-700', size: 'py-5 text-sm' },
  { type: 'V',   label: 'V — Verbal',           pts: '0,83', bg: 'bg-emerald-500', size: 'py-3.5 text-xs' },
  { type: 'G',   label: 'G — Gestual',          pts: '0,67', bg: 'bg-lime-600',    size: 'py-3.5 text-xs' },
  { type: 'M',   label: 'M — Modelo',           pts: '0,50', bg: 'bg-amber-500',   size: 'py-3.5 text-xs' },
  { type: 'PP',  label: 'PP — Físico Parcial',  pts: '0,33', bg: 'bg-orange-500',  size: 'py-3.5 text-xs' },
  { type: 'FP',  label: 'FP — Físico Total',    pts: '0,17', bg: 'bg-red-500',     size: 'py-3.5 text-xs' },
  { type: 'ERR', label: '✕ Erro / Sem Resposta', pts: '0,0', bg: 'bg-red-800',    size: 'py-3.5 text-xs font-black' },
]

export function DttFull() {
  const recordTrial = useSessionStore((s) => s.recordTrial)
  return (
    <div className="space-y-2">
      {LEVELS.map(({ type, label, pts, bg, size }) => (
        <button key={type} onClick={() => recordTrial(type)}
          className={`w-full ${bg} text-white rounded-xl ${size} font-bold flex justify-between items-center px-4 active:scale-95 transition-all border-none`}>
          <span>{label}</span>
          <span className="opacity-75 text-xs">{pts} pt</span>
        </button>
      ))}
    </div>
  )
}
