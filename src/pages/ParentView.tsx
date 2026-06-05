import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, Award } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { computeStatus, computeStreak, rateColor, STATUS_LABEL, statusColor } from '../lib/aba'
import type { Session } from '../types'

interface ShareSession { date: string; rate: number; collectionType: string }
interface ShareProgram { name: string; criterion: number; sessions: ShareSession[] }
interface ShareData { patient: string; generatedAt: string; programs: ShareProgram[] }

// Converte as sessões do compartilhamento no formato que os helpers de aba.ts esperam
function toSessions(ss: ShareSession[], criterion: number): Session[] {
  return ss.map((s, i) => ({
    id: String(i), student: '', program: '',
    date: new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR'), time: '',
    timestamp: new Date(s.date + 'T12:00:00').getTime(),
    plannedTrials: 0, trials: 0, score: 0, rate: parseFloat(String(s.rate)),
    pdi: null, ind: 0, pr: 0, err: 0, criterion, duration: 0, streak: 0,
    notes: '', log: [], phase: 'acquisition', promptMode: 'simple',
    collectionType: s.collectionType as any, reviewedAt: null, reviewedBy: null, supervisorNotes: '',
  }))
}

export function ParentView({ token }: { token: string }) {
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    supabase.rpc('get_shared_progress', { p_token: token }).then(({ data, error }) => {
      if (error || !data) setError(true)
      else setData(data as ShareData)
      setLoading(false)
    })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-slate-200 border-t-primary rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid' }} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-lg font-black text-slate-800">Link inválido ou expirado</h1>
          <p className="text-sm text-slate-500 mt-1">Solicite um novo link ao profissional responsável.</p>
        </div>
      </div>
    )
  }

  const programs = data.programs.filter(p => p.sessions.length > 0)

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-black text-primary leading-none tracking-tight">Evolvy</p>
            <p className="text-xs text-slate-400 leading-none mt-0.5">Acompanhamento de Progresso</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Saudação */}
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5 mb-4">
          <h1 className="text-xl font-black text-slate-900">{data.patient}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Este é o acompanhamento do progresso terapêutico. Cada programa representa uma
            habilidade trabalhada nas sessões de ABA.
          </p>
        </div>

        {programs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 text-center">
            <p className="text-sm text-slate-500">Ainda não há sessões registradas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {programs.map((prog) => {
              const sessions = toSessions(prog.sessions, prog.criterion)
              const status = computeStatus(sessions, prog.criterion)
              const streak = computeStreak(sessions, prog.criterion)
              const dtt = sessions.filter(s => s.collectionType === 'dtt' || s.collectionType === 'task_analysis' || s.collectionType === 'interval')
              const mean = dtt.length ? dtt.reduce((a, s) => a + s.rate, 0) / dtt.length : 0
              const chartData = sessions.map(s => ({ date: s.date, taxa: s.rate }))

              return (
                <div key={prog.name} className="bg-white rounded-2xl shadow-card border border-slate-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-900">{prog.name}</p>
                      <p className="text-xs text-slate-400">{prog.sessions.length} sessões</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(status)}`}>{STATUS_LABEL[status]}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp size={13} style={{ color: rateColor(mean, prog.criterion) }} />
                        <p className="text-lg font-black tabular" style={{ color: rateColor(mean, prog.criterion) }}>{mean.toFixed(0)}%</p>
                      </div>
                      <p className="text-xs text-slate-400">aproveitamento médio</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award size={13} className="text-amber-500" />
                        <p className="text-lg font-black text-amber-600">{streak}/3</p>
                      </div>
                      <p className="text-xs text-slate-400">rumo ao domínio</p>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => v + '%'} />
                      <Tooltip formatter={(v: any) => [`${Number(v).toFixed(0)}%`, 'Aproveitamento']} contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid #e2e8f0' }} />
                      <ReferenceLine y={prog.criterion} stroke="rgba(5,150,105,.4)" strokeDasharray="6 4" />
                      <Line type="monotone" dataKey="taxa" stroke="#5046E4" strokeWidth={2.5} dot={{ fill: '#5046E4', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          A linha verde tracejada marca a meta de domínio da habilidade.<br />
          Dúvidas? Fale com o profissional responsável.
        </p>
      </main>
    </div>
  )
}
