import { useState, useEffect } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { loadDraft, useSessionStore } from '../../stores/sessionStore'
import { PHASE_LABEL } from '../../lib/aba'

interface Props { onRestore: () => void }

export function DraftRecoveryBanner({ onRestore }: Props) {
  const [draft, setDraft] = useState(() => loadDraft())
  const { restoreDraft, discardDraft, active } = useSessionStore()

  // Re-check on mount; hide if a session is already active in memory
  useEffect(() => { setDraft(loadDraft()) }, [])

  if (!draft || active) return null

  const count =
    draft.active.collectionType === 'dtt' ? draft.log.length
    : draft.active.collectionType === 'frequency' ? draft.freqCount
    : draft.active.collectionType === 'duration' ? draft.durLog.length
    : draft.abcLog.length

  const minutesAgo = Math.max(1, Math.round((Date.now() - draft.savedAt) / 60000))

  function handleRestore() {
    restoreDraft()
    setDraft(null)
    onRestore()
  }
  function handleDiscard() {
    discardDraft()
    setDraft(null)
  }

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 no-print">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <RotateCcw size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">Sessão não finalizada</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {draft.active.student} — {draft.active.program} · {count} registro(s) · {PHASE_LABEL[draft.active.phase]} · há {minutesAgo} min
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRestore}
              className="bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 active:scale-95 transition-all"
            >
              Continuar sessão
            </button>
            <button
              onClick={handleDiscard}
              className="bg-white border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
            >
              <X size={12} /> Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
