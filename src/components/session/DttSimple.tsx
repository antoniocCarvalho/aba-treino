import { useSessionStore } from '../../stores/sessionStore'

export function DttSimple() {
  const recordTrial = useSessionStore((s) => s.recordTrial)
  return (
    <div className="space-y-3">
      <button onClick={() => recordTrial('IND')}
        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl py-7 flex flex-col items-center gap-1.5 transition-all shadow-lg shadow-emerald-200 border-none">
        <span className="text-2xl">✓</span>
        <span className="text-sm font-black tracking-wide">INDEPENDENTE (I)</span>
        <span className="text-xs opacity-75">1,0 pt</span>
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => recordTrial('PR')}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-2xl py-6 flex flex-col items-center gap-1.5 transition-all shadow-lg shadow-amber-100 border-none">
          <span className="text-xl">↗</span>
          <span className="text-xs font-black">COM PROMPT (P)</span>
          <span className="text-xs opacity-75">0,5 pt</span>
        </button>
        <button onClick={() => recordTrial('ERR')}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl py-6 flex flex-col items-center gap-1.5 transition-all shadow-lg shadow-red-100 border-none">
          <span className="text-xl">✕</span>
          <span className="text-xs font-black">ERRO (E)</span>
          <span className="text-xs opacity-75">0,0 pt</span>
        </button>
      </div>
    </div>
  )
}
