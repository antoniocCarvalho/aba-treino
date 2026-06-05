import { useState } from 'react'
import { Sparkles, AlertTriangle, CheckCircle2, Lightbulb, Loader2, RefreshCw } from 'lucide-react'

interface Insight {
  tipo: 'alerta' | 'positivo' | 'sugestao'
  mensagem: string
}

interface Props {
  student: string
  programsSummary: { name: string; sessions: number; mean: number; streak: number; status: string }[]
  recentSessions: { date: string; program: string; rate: number | null; collectionType: string }[]
}

const CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  alerta:   { icon: <AlertTriangle  size={14} className="text-amber-500  flex-shrink-0 mt-0.5" />, bg: 'bg-amber-50   border-amber-200',   text: 'text-amber-800'   },
  positivo: { icon: <CheckCircle2   size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
  sugestao: { icon: <Lightbulb      size={14} className="text-indigo-500  flex-shrink-0 mt-0.5" />, bg: 'bg-indigo-50  border-indigo-200',  text: 'text-indigo-800'  },
}

const FALLBACK = { icon: <Lightbulb size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />, bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' }

export function ClinicalInsights({ student, programsSummary, recentSessions }: Props) {
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function analyze() {
    setLoading(true)
    setError('')
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student, programsSummary, recentSessions }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || 'Erro ao gerar insights')
        return
      }
      setInsights(data.insights)
    } catch {
      setError('Falha de conexão. Verifique a internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Análise por IA</p>
        {insights && !loading && (
          <button onClick={analyze} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
            <RefreshCw size={11} /> Reanalisar
          </button>
        )}
      </div>

      {!insights && !loading && (
        <button
          onClick={analyze}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-3 rounded-xl text-sm hover:opacity-90 active:scale-[.98] transition-all"
        >
          <Sparkles size={15} />
          Gerar insights clínicos com IA
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-5 text-slate-400 text-sm">
          <Loader2 size={15} className="animate-spin" />
          Analisando dados clínicos…
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={analyze} className="text-xs text-red-600 font-semibold underline mt-1">Tentar novamente</button>
        </div>
      )}

      {insights && !loading && (
        <div className="space-y-2">
          {insights.map((ins, i) => {
            const cfg = CONFIG[ins.tipo] ?? FALLBACK
            return (
              <div key={i} className={`flex gap-2.5 border rounded-xl px-3 py-2.5 ${cfg.bg}`}>
                {cfg.icon}
                <p className={`text-xs leading-relaxed ${cfg.text}`}>{ins.mensagem}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
