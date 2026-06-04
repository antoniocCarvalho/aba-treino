import { useState } from 'react'
import { Sparkles, Pencil, Check, RefreshCw } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { Card } from './ui/Card'

export interface AiReportPayload {
  student: string
  period?: { from: string; to: string }
  professional?: { name?: string; crp?: string }
  programsSummary?: { name: string; sessions: number; mean: number; streak: number; status: string }[]
  sessions: {
    date: string; program: string; phase: string; collectionType: string
    trials: number; rate: number | null; pdi: number | null; criterion: number; notes?: string
  }[]
}

// Renderizador mínimo de markdown (títulos ##, listas, negrito) — sem dependências.
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split('\n')
  const out: React.ReactNode[] = []
  let list: string[] = []

  const flushList = (key: number) => {
    if (!list.length) return
    out.push(
      <ul key={`ul${key}`} className="list-disc pl-5 space-y-0.5 my-2">
        {list.map((li, i) => <li key={i}>{inline(li)}</li>)}
      </ul>
    )
    list = []
  }

  const inline = (t: string): React.ReactNode => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    )
  }

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    if (/^##\s+/.test(line)) {
      flushList(idx)
      out.push(<h3 key={idx} className="text-sm font-black text-slate-800 mt-4 mb-1.5 first:mt-0">{line.replace(/^##\s+/, '')}</h3>)
    } else if (/^#\s+/.test(line)) {
      flushList(idx)
      out.push(<h2 key={idx} className="text-base font-black text-slate-900 mt-4 mb-2">{line.replace(/^#\s+/, '')}</h2>)
    } else if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ''))
    } else if (line === '') {
      flushList(idx)
    } else {
      flushList(idx)
      out.push(<p key={idx} className="text-sm text-slate-600 leading-relaxed mb-1.5">{inline(line)}</p>)
    }
  })
  flushList(lines.length)
  return out
}

export function AiReport({ payload }: { payload: AiReportPayload }) {
  const showToast = useAppStore((s) => s.showToast)
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha na geração')
      setReport(data.report || '')
      setEditing(false)
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar relatório por IA', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Relatório de Progresso por IA</h3>
            <p className="text-xs text-slate-400">Gera um texto clínico a partir dos dados das sessões</p>
          </div>
        </div>
        {report && !loading && (
          <div className="flex gap-1 no-print">
            <button onClick={() => setEditing(!editing)} title="Editar" className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-slate-50">
              {editing ? <Check size={15} /> : <Pencil size={15} />}
            </button>
            <button onClick={generate} title="Gerar novamente" className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-slate-50">
              <RefreshCw size={15} />
            </button>
          </div>
        )}
      </div>

      {!report && !loading && (
        <button onClick={generate} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[.99] transition-all no-print">
          <Sparkles size={16} /> Gerar relatório com IA
        </button>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-9 h-9 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-3" style={{ borderWidth: 3 }} />
          <p className="text-sm font-semibold text-slate-600">Gerando relatório…</p>
          <p className="text-xs text-slate-400 mt-0.5">Isso pode levar alguns segundos</p>
        </div>
      )}

      {report && !loading && (
        editing ? (
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={18}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary resize-y no-print"
          />
        ) : (
          <div className="prose-sm">{renderMarkdown(report)}</div>
        )
      )}

      {report && !loading && (
        <p className="text-xs text-slate-300 mt-3 no-print">⚠️ Revise o conteúdo gerado antes de usar. A IA pode cometer erros.</p>
      )}
    </Card>
  )
}
