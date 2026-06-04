import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts'
import { Printer, Download, FileSpreadsheet } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { computeStatus, computeStreak, movingAverage, trendArrow, linearRegression, rateColor, PHASE_LABEL, STATUS_LABEL as PROGRAM_STATUS_LABEL } from '../lib/aba'
import { exportSessionsCSV, exportSessionsJSON, dateStamp } from '../lib/export'
import { DOMAIN_LABEL, TERM_LABEL, STATUS_LABEL } from '../lib/goals'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { AiReport, type AiReportPayload } from '../components/AiReport'

export function ReportPage() {
  const { sessions, profile, goals } = useAppStore()
  const [student, setStudent] = useState('')
  const [program, setProgram] = useState('')

  const students = useMemo(() => [...new Set(sessions.map(s => s.student))].sort(), [sessions])
  const programs = useMemo(() => student ? [...new Set(sessions.filter(s => s.student === student).map(s => s.program))].sort() : [], [sessions, student])

  const filtered = useMemo(() =>
    sessions.filter(s => s.student === student && (!program || s.program === program)).sort((a, b) => a.timestamp - b.timestamp),
    [sessions, student, program]
  )

  const uniquePrograms = useMemo(() => {
    return [...new Set(filtered.map(s => s.program))]
  }, [filtered])

  const criterion = filtered[filtered.length - 1]?.criterion ?? 80

  const stats = useMemo(() => {
    if (!filtered.length) return null
    const rates = filtered.map(s => s.rate)
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length
    const best = Math.max(...rates)
    const pdiArr = filtered.filter(s => s.pdi !== null).map(s => s.pdi!)
    const slope = linearRegression(rates.slice(-5))
    return { mean, best, pdiMean: pdiArr.length ? pdiArr.reduce((a, b) => a + b, 0) / pdiArr.length : null, slope, count: filtered.length }
  }, [filtered])

  const chartData = useMemo(() => {
    const rates = filtered.map(s => s.rate)
    const ma = movingAverage(rates, 3)
    return filtered.map((s, i) => ({ date: s.date, rate: s.rate, ma: parseFloat(ma[i].toFixed(1)) }))
  }, [filtered])

  const distData = useMemo(() => {
    const totInd = filtered.reduce((a, s) => a + s.ind, 0)
    const totPr  = filtered.reduce((a, s) => a + s.pr, 0)
    const totErr = filtered.reduce((a, s) => a + s.err, 0)
    const total  = totInd + totPr + totErr || 1
    return [
      { name: 'Independente', value: totInd, pct: totInd/total*100, color: '#059669' },
      { name: 'Com Prompt',   value: totPr,  pct: totPr/total*100,  color: '#D97706' },
      { name: 'Erro',         value: totErr, pct: totErr/total*100, color: '#DC2626' },
    ]
  }, [filtered])

  const fileBase = `aba_${student.replace(/\s+/g, '_')}_${dateStamp()}`

  // Payload para a função de IA (resumo enxuto das sessões + contexto clínico)
  const aiPayload = useMemo<AiReportPayload>(() => ({
    student,
    period: filtered.length ? { from: filtered[0].date, to: filtered[filtered.length - 1].date } : undefined,
    professional: { name: profile?.full_name, crp: profile?.crp },
    programsSummary: uniquePrograms.map(prog => {
      const ps = filtered.filter(s => s.program === prog)
      return {
        name: prog, sessions: ps.length,
        mean: +(ps.reduce((a, s) => a + s.rate, 0) / ps.length).toFixed(1),
        streak: computeStreak(ps, criterion),
        status: PROGRAM_STATUS_LABEL[computeStatus(ps, criterion)],
      }
    }),
    sessions: filtered.map(s => ({
      date: s.date, program: s.program, phase: PHASE_LABEL[s.phase] ?? s.phase,
      collectionType: s.collectionType, trials: s.trials,
      rate: (s.collectionType === 'dtt' || s.collectionType === 'task_analysis' || s.collectionType === 'interval') ? s.rate : null,
      pdi: s.pdi, criterion: s.criterion, notes: s.notes || undefined,
    })),
  }), [student, filtered, uniquePrograms, criterion, profile])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4 no-print">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select value={student} onChange={e => { setStudent(e.target.value); setProgram('') }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Selecionar paciente</option>
            {students.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={program} onChange={e => setProgram(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">Todos os programas</option>
            {programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => window.print()} disabled={!filtered.length} className="flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold py-2.5 rounded-xl text-xs hover:bg-indigo-100 disabled:opacity-50">
            <Printer size={14} /> PDF
          </button>
          <button onClick={() => exportSessionsCSV(filtered, `${fileBase}.csv`)} disabled={!filtered.length} className="flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold py-2.5 rounded-xl text-xs hover:bg-emerald-100 disabled:opacity-50">
            <FileSpreadsheet size={14} /> CSV
          </button>
          <button onClick={() => exportSessionsJSON(filtered, `${fileBase}.json`)} disabled={!filtered.length} className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl text-xs hover:bg-slate-50 disabled:opacity-50">
            <Download size={14} /> JSON
          </button>
        </div>
      </Card>

      {/* Cabeçalho profissional — só no PDF impresso */}
      {filtered.length > 0 && (
        <div className="hidden print:block mb-2">
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-4">
            <div>
              <h1 className="text-xl font-black text-slate-900">Relatório de Progresso — Terapia ABA</h1>
              <p className="text-sm text-slate-600 mt-0.5">Paciente: <strong>{student}</strong>{program ? ` · Programa: ${program}` : ''}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{profile?.full_name || 'Profissional'}</p>
              {profile?.crp && <p>CRP {profile.crp}</p>}
              <p>{profile?.role === 'rbt' ? 'Técnico (RBT)' : 'Supervisor (BCBA)'}</p>
              <p>Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
      )}

      {!student && (
        <Card className="p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-semibold text-slate-700">Selecione um paciente</p>
          <p className="text-sm text-slate-400 mt-1">O relatório completo aparecerá aqui</p>
        </Card>
      )}

      {student && !filtered.length && (
        <Card className="p-10 text-center">
          <p className="text-sm text-slate-500">Nenhuma sessão encontrada para este filtro.</p>
        </Card>
      )}

      {filtered.length > 0 && stats && (
        <>
          {/* KPIs */}
          <Card className="p-5">
            {/* Cabeçalho do paciente — visível na tela e no print */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center no-print">
                <span className="text-xl font-black text-primary">{student.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">{student}</h2>
                <p className="text-xs text-slate-400">
                  Critério: {criterion}% · {filtered.length} sessões · Período: {filtered[0].date} – {filtered[filtered.length - 1].date}
                  {program ? ` · Programa: ${program}` : ''}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Taxa Média" value={`${stats.mean.toFixed(1)}%`} color="text-indigo-600" bg="bg-indigo-50" />
              <Kpi label="Melhor Sessão" value={`${stats.best.toFixed(1)}%`} color="text-emerald-600" bg="bg-emerald-50" />
              <Kpi label="IDI Médio" value={stats.pdiMean !== null ? `${stats.pdiMean.toFixed(0)}%` : '—'} color="text-purple-600" bg="bg-purple-50" />
              <Kpi label={`Tendência ${trendArrow(stats.slope)}`} value={stats.slope > 0 ? 'Crescendo' : stats.slope < 0 ? 'Declinando' : 'Estável'} color={stats.slope > 0 ? 'text-emerald-600' : stats.slope < 0 ? 'text-red-600' : 'text-amber-600'} bg="bg-slate-50" />
            </div>
          </Card>

          {/* Relatório por IA */}
          <AiReport payload={aiPayload} />

          {/* Plano de tratamento */}
          {(() => {
            const patientId = filtered.find(s => s._patientId)?._patientId
            const planGoals = patientId ? goals.filter(g => g.patient_id === patientId) : []
            if (!planGoals.length) return null
            return (
              <Card className="p-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Plano de Tratamento — Objetivos</h3>
                <div className="space-y-2">
                  {planGoals.map(g => (
                    <div key={g.id} className="flex items-start gap-2 text-xs border-b border-slate-50 pb-2 last:border-0">
                      <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${g.status === 'achieved' ? 'bg-emerald-500' : g.status === 'discontinued' ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                      <div className="flex-1">
                        <p className={`font-semibold text-slate-800 ${g.status === 'achieved' ? 'line-through' : ''}`}>{g.title}</p>
                        <p className="text-slate-400">{DOMAIN_LABEL[g.domain]} · {TERM_LABEL[g.term]} · {STATUS_LABEL[g.status]}{g.target_date ? ` · meta ${new Date(g.target_date + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })()}

          {/* Program status table */}
          {uniquePrograms.length > 1 && (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Status por Programa</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-slate-400 border-b border-slate-100">
                    <th className="pb-2 text-left font-semibold">Programa</th>
                    <th className="pb-2 font-semibold">Sessões</th>
                    <th className="pb-2 font-semibold">Média</th>
                    <th className="pb-2 font-semibold">Consec.</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr></thead>
                  <tbody>
                    {uniquePrograms.map(prog => {
                      const ps = filtered.filter(s => s.program === prog)
                      const mean = ps.reduce((a, s) => a + s.rate, 0) / ps.length
                      const streak = computeStreak(ps, criterion)
                      const status = computeStatus(ps, criterion)
                      return (
                        <tr key={prog} className="border-b border-slate-50">
                          <td className="py-2 pr-3 font-medium text-slate-800">{prog}</td>
                          <td className="py-2 pr-3 text-center">{ps.length}</td>
                          <td className="py-2 pr-3 text-center font-bold" style={{ color: rateColor(mean, criterion) }}>{mean.toFixed(1)}%</td>
                          <td className="py-2 pr-3 text-center">{streak}/3</td>
                          <td className="py-2"><StatusBadge status={status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Evolution chart */}
          <Card className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Evolução da Taxa de Resposta</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => v + '%'} />
                <Tooltip formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name === 'rate' ? 'Taxa' : 'Média móvel']} contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <ReferenceLine y={criterion} stroke="rgba(5,150,105,.4)" strokeDasharray="6 4" />
                <Line type="monotone" dataKey="rate" stroke="#5046E4" strokeWidth={2.5} dot={{ fill: '#5046E4', r: 4, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="ma" stroke="#c7d2fe" strokeWidth={2} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Distribution */}
          {distData.some(d => d.value > 0) && (
            <Card className="p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Distribuição de Respostas</h3>
              <div className="flex items-center gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={distData} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={2}>
                    {distData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div className="flex-1 space-y-2.5">
                  {distData.map(d => (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="font-semibold text-slate-700">{d.name}</span>
                        <span className="font-bold" style={{ color: d.color }}>{d.pct.toFixed(1)}%</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${d.pct}%`, background: d.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Session table */}
          <Card className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Sessões Detalhadas{filtered.length > 20 ? ' (últimas 20)' : ''}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-slate-400 border-b border-slate-100">
                  {['Data','Programa','Reg.','Taxa','IDI','Fase'].map(h => <th key={h} className="pb-2 font-semibold text-left pr-2">{h}</th>)}
                </tr></thead>
                <tbody>
                  {[...filtered].reverse().slice(0, 20).map((s, i) => {
                    const hasRate = s.collectionType === 'dtt' || s.collectionType === 'task_analysis' || s.collectionType === 'interval'
                    return (
                    <tr key={s.id} className={i%2===0?'bg-slate-50/50':''}>
                      <td className="py-1.5 pr-2 text-slate-600">{s.date}</td>
                      <td className="py-1.5 pr-2 font-medium text-slate-800 max-w-20 truncate">{s.program}</td>
                      <td className="py-1.5 pr-2 text-center">{s.trials}</td>
                      <td className="py-1.5 pr-2 font-bold text-center" style={{ color: rateColor(s.rate, s.criterion) }}>{hasRate ? `${s.rate.toFixed(1)}%` : '—'}</td>
                      <td className="py-1.5 pr-2 text-center text-purple-600">{s.pdi !== null ? `${s.pdi.toFixed(0)}%` : '—'}</td>
                      <td className="py-1.5 pr-2 text-slate-500">{PHASE_LABEL[s.phase]?.slice(0,4) ?? '—'}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className={`text-2xl font-black tabular ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
