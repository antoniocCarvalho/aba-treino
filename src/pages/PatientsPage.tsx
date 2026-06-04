import { useState } from 'react'
import { Search, ChevronRight, Plus } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useSessionStore } from '../stores/sessionStore'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { computeStatus, computeStreak, rateColor } from '../lib/aba'
import { cls } from '../lib/utils'
import type { Patient, PatientProgram } from '../types'

interface PatientsPageProps { onNavigate: (tab: string) => void }

export function PatientsPage({ onNavigate }: PatientsPageProps) {
  const sessions = useAppStore((s) => s.sessions)
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<Patient | null>(null)

  // Build patient list
  const patients: Patient[] = Object.values(
    sessions.reduce((acc, s) => {
      if (!acc[s.student]) acc[s.student] = { name: s.student, sessions: [] }
      acc[s.student].sessions.push(s)
      return acc
    }, {} as Record<string, { name: string; sessions: typeof sessions }>)
  ).map(({ name, sessions: ss }) => {
    const progMap = ss.reduce((acc, s) => {
      if (!acc[s.program]) acc[s.program] = []
      acc[s.program].push(s)
      return acc
    }, {} as Record<string, typeof ss>)

    const programs: PatientProgram[] = Object.entries(progMap).map(([prog, pss]) => {
      const sorted = [...pss].sort((a, b) => a.timestamp - b.timestamp)
      const crit = sorted[sorted.length - 1]?.criterion ?? 80
      return {
        name: prog, sessions: pss,
        meanRate: pss.reduce((a, s) => a + s.rate, 0) / pss.length,
        streak: computeStreak(pss, crit),
        status: computeStatus(pss, crit),
        criterion: crit,
      }
    })

    const meanRate = ss.reduce((a, s) => a + s.rate, 0) / ss.length
    const lastDate = ss.reduce((best, s) => s.timestamp > (best?.timestamp ?? 0) ? s : best, ss[0])?.date ?? '—'
    return { name, sessions: ss, meanRate, lastDate, programs: programs.sort((a, b) => b.meanRate - a.meanRate) }
  }).filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()))

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="font-bold text-slate-700 text-lg">Nenhum paciente ainda</h3>
        <p className="text-slate-400 text-sm mt-1 mb-6">Inicie uma sessão para registrar o primeiro paciente</p>
        <button onClick={() => onNavigate('session')} className="bg-primary text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-600 transition-colors">
          <Plus size={16} className="inline mr-1.5" />Iniciar Sessão
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar paciente…" className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div className="space-y-3">
        {patients.map(p => (
          <Card key={p.name} onClick={() => setSheet(p)} className="p-4 flex items-center gap-3">
            <Avatar name={p.name} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">{p.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.programs.length} programa{p.programs.length !== 1 ? 's' : ''} · última sessão {p.lastDate}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {p.programs.slice(0, 3).map(prog => <StatusBadge key={prog.name} status={prog.status} />)}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-black tabular" style={{ color: rateColor(p.meanRate) }}>{p.meanRate.toFixed(0)}%</p>
              <p className="text-xs text-slate-400">média</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </Card>
        ))}
      </div>

      {/* Patient Bottom Sheet */}
      {sheet && <PatientSheet patient={sheet} onClose={() => setSheet(null)} onNavigate={onNavigate} />}
    </>
  )
}

function Avatar({ name }: { name: string }) {
  const colors = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-red-500','bg-purple-500','bg-teal-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  return <div className={cls('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg', color)}>{name.charAt(0).toUpperCase()}</div>
}

function PatientSheet({ patient, onClose, onNavigate }: { patient: Patient; onClose: () => void; onNavigate: (t: string) => void }) {
  const { updateConfig, setPanel } = useSessionStore()

  function startSessionFor(prog?: PatientProgram) {
    updateConfig({ student: patient.name, program: prog?.name ?? '', criterion: prog?.criterion ?? 80 })
    setPanel('config')
    onClose()
    onNavigate('session')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[88vh] overflow-y-auto pb-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-5">
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={patient.name} />
            <div>
              <h2 className="text-lg font-black text-slate-900">{patient.name}</h2>
              <p className="text-xs text-slate-400">{patient.sessions.length} sessões · {patient.programs.length} programas · média {patient.meanRate.toFixed(1)}%</p>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Programas</p>

          {patient.programs.map(prog => {
            const pdiList = prog.sessions.filter(s => s.pdi !== null).map(s => s.pdi!)
            const pdiMean = pdiList.length ? pdiList.reduce((a, b) => a + b, 0) / pdiList.length : null
            return (
              <div key={prog.name} className="border border-slate-100 rounded-2xl p-4 mb-3">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{prog.name}</p>
                    <p className="text-xs text-slate-400">{prog.sessions.length} sessões · última: {prog.sessions.reduce((a, b) => a.timestamp > b.timestamp ? a : b).date}</p>
                  </div>
                  <StatusBadge status={prog.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Metric label="Média" value={`${prog.meanRate.toFixed(1)}%`} color={rateColor(prog.meanRate, prog.criterion)} />
                  <Metric label="IDI" value={pdiMean !== null ? `${pdiMean.toFixed(0)}%` : '—'} color="#7C3AED" />
                  <Metric label="Consec." value={`${prog.streak}/3`} color="#D97706" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { onClose(); onNavigate('history') }} className="border border-slate-200 text-slate-700 text-xs font-semibold py-2 rounded-xl hover:bg-slate-50">Ver Histórico</button>
                  <button onClick={() => startSessionFor(prog)} className="bg-primary text-white text-xs font-semibold py-2 rounded-xl hover:bg-primary-600">+ Nova Sessão</button>
                </div>
              </div>
            )
          })}

          <button onClick={() => startSessionFor()} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl mt-2 hover:bg-slate-800 transition-colors">
            + Novo Programa para {patient.name}
          </button>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-2 text-center">
      <p className="text-base font-black tabular" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
