import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Trash2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import { movingAverage, rateColor, PHASE_LABEL, formatDuration } from '../lib/aba'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

export function HistoryPage() {
  const { sessions, removeSession, showToast } = useAppStore()
  const [fStudent, setFStudent] = useState('')
  const [fProgram, setFProgram] = useState('')

  const students = useMemo(() => [...new Set(sessions.map(s => s.student))].sort(), [sessions])
  const programs = useMemo(() => {
    const base = fStudent ? sessions.filter(s => s.student === fStudent) : sessions
    return [...new Set(base.map(s => s.program))].sort()
  }, [sessions, fStudent])

  const filtered = useMemo(() =>
    sessions.filter(s => (!fStudent || s.student === fStudent) && (!fProgram || s.program === fProgram))
      .sort((a, b) => a.timestamp - b.timestamp),
    [sessions, fStudent, fProgram]
  )

  const criterion = filtered[filtered.length - 1]?.criterion ?? 80
  const rates = filtered.map(s => s.rate)
  const ma = movingAverage(rates, 3)

  const chartData = filtered.map((s, i) => ({
    date: s.date, rate: s.rate, ma: parseFloat(ma[i].toFixed(1)),
    phase: s.phase, name: s.student,
  }))

  const stats = useMemo(() => {
    if (!filtered.length) return null
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length
    const best = Math.max(...rates)
    const pdiArr = filtered.filter(s => s.pdi !== null).map(s => s.pdi!)
    const pdiMean = pdiArr.length ? pdiArr.reduce((a, b) => a + b, 0) / pdiArr.length : null
    return { mean, best, pdiMean, count: filtered.length }
  }, [filtered])

  async function handleDelete(id: string) {
    if (!confirm('Remover esta sessão?')) return
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) { showToast('Erro ao remover sessão', 'error'); return }
    removeSession(id)
    showToast('Sessão removida', 'success')
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <select value={fStudent} onChange={e => { setFStudent(e.target.value); setFProgram('') }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todos os alunos</option>
            {students.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fProgram} onChange={e => setFProgram(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todos os programas</option>
            {programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-700">Evolução da Taxa</h3>
            <div className="flex gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-primary rounded" />Taxa</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-indigo-200 rounded" />Média móvel</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v + '%'} />
              <Tooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name === 'rate' ? 'Taxa' : 'Média móvel']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <ReferenceLine y={criterion} stroke="rgba(5,150,105,.4)" strokeDasharray="6 4" label={{ value: `${criterion}%`, fontSize: 10, fill: '#059669', position: 'right' }} />
              <Line type="monotone" dataKey="rate" stroke="#5046E4" strokeWidth={2.5} dot={{ fill: '#5046E4', r: 4, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="ma" stroke="#c7d2fe" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Média', value: `${stats.mean.toFixed(1)}%`, color: 'text-indigo-600' },
            { label: 'Melhor', value: `${stats.best.toFixed(1)}%`, color: 'text-emerald-600' },
            { label: 'IDI', value: stats.pdiMean !== null ? `${stats.pdiMean.toFixed(0)}%` : '—', color: 'text-purple-600' },
            { label: 'Sessões', value: String(stats.count), color: 'text-slate-700' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-3 text-center">
              <p className={`text-lg font-black tabular ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Session list */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-3">Sessões</h3>
        {!filtered.length ? (
          <p className="text-xs text-slate-400 text-center py-6">Nenhuma sessão registrada</p>
        ) : (
          <div className="space-y-2">
            {[...filtered].reverse().map(s => (
              <div key={s.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.student}</p>
                      <Badge color="indigo">{PHASE_LABEL[s.phase] ?? 'Aquisição'}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{s.program}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.date} {s.time} · {s.trials} tent. · {formatDuration(s.duration)}</p>
                    {s.notes && <p className="text-xs text-slate-400 italic mt-0.5 truncate">💬 {s.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.collectionType === 'dtt' && (
                      <span className="text-sm font-black px-2.5 py-1 rounded-lg tabular" style={{ background: rateColor(s.rate, s.criterion) + '18', color: rateColor(s.rate, s.criterion) }}>
                        {s.rate.toFixed(1)}%
                      </span>
                    )}
                    <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
