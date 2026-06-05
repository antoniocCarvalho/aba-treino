import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts'
import { Trash2, Pencil, Check, X, CheckCircle2, Users, CloudOff } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { supabase } from '../lib/supabase'
import { dequeue } from '../lib/offline'
import { movingAverage, rateColor, PHASE_LABEL, formatDuration } from '../lib/aba'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import type { AbcEntry } from '../types'

export function HistoryPage() {
  const { sessions, removeSession, showToast, updateSessionNotes, markReviewed, unmarkReviewed, user, profile } = useAppStore()
  const [fStudent, setFStudent] = useState('')
  const [fProgram, setFProgram] = useState('')
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewDraft, setReviewDraft] = useState('')
  const [onlyPending, setOnlyPending] = useState(false)
  const [view, setView] = useState<'sessions' | 'abc'>('sessions')
  const supervisionEnabled = useSettingsStore((s) => s.supervisionEnabled)
  const isSupervisor = supervisionEnabled && profile?.role === 'bcba'

  const students = useMemo(() => [...new Set(sessions.map(s => s.student))].sort(), [sessions])
  const programs = useMemo(() => {
    const base = fStudent ? sessions.filter(s => s.student === fStudent) : sessions
    return [...new Set(base.map(s => s.program))].sort()
  }, [sessions, fStudent])

  const filtered = useMemo(() =>
    sessions.filter(s =>
      (!fStudent || s.student === fStudent) &&
      (!fProgram || s.program === fProgram) &&
      (!onlyPending || !s.reviewedAt)
    ).sort((a, b) => a.timestamp - b.timestamp),
    [sessions, fStudent, fProgram, onlyPending]
  )

  const pendingCount = useMemo(() => sessions.filter(s => !s.reviewedAt).length, [sessions])

  // ── Análise Funcional ABC ────────────────────────────────────────────────
  const abcData = useMemo(() => {
    const abcSessions = sessions.filter(s =>
      s.collectionType === 'abc' &&
      (!fStudent || s.student === fStudent) &&
      (!fProgram || s.program === fProgram)
    )
    const entries: AbcEntry[] = abcSessions.flatMap(s => s.log as unknown as AbcEntry[])

    const antCount: Record<string, number> = {}
    const consCount: Record<string, number> = {}
    const intCount: Record<string, number> = { Leve: 0, Moderada: 0, Intensa: 0 }

    entries.forEach(e => {
      if (e.antecedente)  antCount[e.antecedente]   = (antCount[e.antecedente]   || 0) + 1
      if (e.consequencia) consCount[e.consequencia]  = (consCount[e.consequencia] || 0) + 1
      if (e.intensidade)  intCount[e.intensidade]    = (intCount[e.intensidade]   || 0) + 1
    })

    const topAnt  = Object.entries(antCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, total]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, total }))
    const topCons = Object.entries(consCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, total]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, total }))

    return { entries, topAnt, topCons, intCount, sessionCount: abcSessions.length }
  }, [sessions, fStudent, fProgram])

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
    // Sessão ainda na fila offline: remove da fila e do estado local
    if (id.startsWith('local_')) {
      dequeue(id.replace('local_', ''))
      removeSession(id)
      showToast('Sessão pendente removida', 'success')
      return
    }
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) { showToast('Erro ao remover sessão', 'error'); return }
    removeSession(id)
    showToast('Sessão removida', 'success')
  }

  async function saveNotes(id: string) {
    const ok = await updateSessionNotes(id, notesDraft.trim())
    if (ok) setEditingNotes(null)
  }

  async function saveReview(id: string) {
    const ok = await markReviewed(id, reviewDraft.trim())
    if (ok) setReviewing(null)
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

        {/* Toggle de visualização */}
        <div className="flex gap-2 mt-3">
          {[
            { key: 'sessions', label: 'Sessões' },
            { key: 'abc',      label: `Análise ABC${abcData.sessionCount > 0 ? ` (${abcData.sessionCount})` : ''}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key as typeof view)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${view === key ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-500 hover:border-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isSupervisor && pendingCount > 0 && view === 'sessions' && (
          <button
            onClick={() => setOnlyPending(v => !v)}
            className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${onlyPending ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
          >
            <CheckCircle2 size={14} />
            {onlyPending ? `Mostrando ${filtered.length} pendentes — ver todas` : `${pendingCount} sessões pendentes de revisão`}
          </button>
        )}
      </Card>

      {/* ── Vista: Análise Funcional ABC ─────────────────────────────── */}
      {view === 'abc' && (
        abcData.sessionCount === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-slate-700">Nenhum registro ABC encontrado</p>
            <p className="text-sm text-slate-400 mt-1">Registre sessões com tipo de coleta "ABC" para ver a análise funcional aqui.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-3 text-center">
                <p className="text-2xl font-black text-indigo-600">{abcData.sessionCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">Sessões ABC</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-black text-amber-500">{abcData.entries.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">Ocorrências</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-black text-red-500">{abcData.intCount['Intensa'] ?? 0}</p>
                <p className="text-xs text-slate-400 mt-0.5">Intensas</p>
              </Card>
            </div>

            {abcData.topAnt.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Antecedentes mais frequentes</h3>
                <ResponsiveContainer width="100%" height={abcData.topAnt.length * 36 + 20}>
                  <BarChart data={abcData.topAnt} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={110} />
                    <Tooltip formatter={(v: any) => [v, 'ocorrências']} contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="total" fill="#5046E4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {abcData.topCons.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-1">Consequências mais frequentes</h3>
                <p className="text-xs text-slate-400 mb-3">Use este dado para inferir a função do comportamento (fuga, atenção, tangível, automático).</p>
                <ResponsiveContainer width="100%" height={abcData.topCons.length * 36 + 20}>
                  <BarChart data={abcData.topCons} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={110} />
                    <Tooltip formatter={(v: any) => [v, 'ocorrências']} contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="total" fill="#D97706" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Distribuição por intensidade</h3>
              <div className="space-y-2">
                {(['Leve','Moderada','Intensa'] as const).map(level => {
                  const count = abcData.intCount[level] ?? 0
                  const pct = abcData.entries.length ? (count / abcData.entries.length) * 100 : 0
                  const color = level === 'Leve' ? '#059669' : level === 'Moderada' ? '#D97706' : '#DC2626'
                  return (
                    <div key={level}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600">{level}</span>
                        <span className="font-bold" style={{ color }}>{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </>
        )
      )}

      {/* ── Vista: Sessões ───────────────────────────────────────────── */}
      {view === 'sessions' && <>

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
                      {supervisionEnabled && s._psychologistId && user && s._psychologistId !== user.id && (
                        <Badge color="gray"><Users size={10} className="inline mr-0.5" />Equipe</Badge>
                      )}
                      {supervisionEnabled && s.reviewedAt && (
                        <Badge color="green"><CheckCircle2 size={10} className="inline mr-0.5" />Revisado</Badge>
                      )}
                      {s._pending && (
                        <Badge color="amber"><CloudOff size={10} className="inline mr-0.5" />Pendente</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{s.program}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.date} {s.time} · {s.trials} reg.{s.collectionType === 'duration' && s.duration ? ` · ${formatDuration(s.duration)}` : ''}</p>
                    {editingNotes !== s.id && s.notes && <p className="text-xs text-slate-400 italic mt-0.5 truncate">💬 {s.notes}</p>}
                    {s.supervisorNotes && reviewing !== s.id && <p className="text-xs text-emerald-600 italic mt-0.5 truncate">👨‍⚕️ {s.supervisorNotes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {s.collectionType === 'dtt' && (
                      <span className="text-sm font-black px-2.5 py-1 rounded-lg tabular" style={{ background: rateColor(s.rate, s.criterion) + '18', color: rateColor(s.rate, s.criterion) }}>
                        {s.rate.toFixed(1)}%
                      </span>
                    )}
                    {isSupervisor && (
                      s.reviewedAt ? (
                        <button onClick={() => unmarkReviewed(s.id)} title="Desfazer revisão" className="text-emerald-500 hover:text-emerald-700 transition-colors p-1">
                          <CheckCircle2 size={15} />
                        </button>
                      ) : (
                        <button onClick={() => { setReviewing(s.id); setReviewDraft(s.supervisorNotes) }} title="Revisar sessão" className="text-slate-300 hover:text-emerald-500 transition-colors p-1">
                          <CheckCircle2 size={15} />
                        </button>
                      )
                    )}
                    <button onClick={() => { setEditingNotes(s.id); setNotesDraft(s.notes) }} className="text-slate-300 hover:text-primary transition-colors p-1">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-slate-300 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {reviewing === s.id && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                    <p className="text-xs font-semibold text-emerald-800 mb-1.5">Nota de supervisão clínica</p>
                    <div className="flex items-start gap-2">
                      <textarea
                        autoFocus value={reviewDraft} onChange={e => setReviewDraft(e.target.value)} rows={2}
                        placeholder="Feedback clínico, ajustes de procedimento, orientações ao técnico…"
                        className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      />
                      <div className="flex flex-col gap-1">
                        <button onClick={() => saveReview(s.id)} title="Marcar revisado" className="text-white bg-emerald-600 p-1.5 rounded-lg hover:bg-emerald-700"><Check size={16} /></button>
                        <button onClick={() => setReviewing(null)} className="text-slate-400 p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                      </div>
                    </div>
                  </div>
                )}
                {editingNotes === s.id && (
                  <div className="mt-2 flex items-start gap-2">
                    <textarea
                      autoFocus value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={2}
                      placeholder="Observações da sessão…"
                      className="flex-1 border border-primary rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <div className="flex flex-col gap-1">
                      <button onClick={() => saveNotes(s.id)} className="text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-lg"><Check size={16} /></button>
                      <button onClick={() => setEditingNotes(null)} className="text-slate-400 p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      </>}
    </div>
  )
}
