import { useMemo } from 'react'
import { Users, TrendingUp, Award, AlertTriangle, CheckCircle2, CalendarDays, RefreshCw, Globe } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { computeStatus, computeStreak, rateColor } from '../lib/aba'
import type { Session } from '../types'

const DAY = 24 * 60 * 60 * 1000

interface Props { onNavigate: (tab: string) => void }

export function Dashboard({ onNavigate }: Props) {
  const { sessions, profile } = useAppStore()
  const supervisionEnabled = useSettingsStore((s) => s.supervisionEnabled)
  const isSupervisor = supervisionEnabled && profile?.role === 'bcba'

  const data = useMemo(() => {
    const students = [...new Set(sessions.map(s => s.student))]
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const sessionsWeek = sessions.filter(s => s.timestamp >= weekAgo).length

    const dtt = sessions.filter(s => s.collectionType === 'dtt')
    const overallMean = dtt.length ? dtt.reduce((a, s) => a + s.rate, 0) / dtt.length : 0

    // Agrupa por paciente+programa para calcular status
    const groups: Record<string, { student: string; program: string; ss: Session[] }> = {}
    sessions.forEach(s => {
      const k = s.student + '|||' + s.program
      if (!groups[k]) groups[k] = { student: s.student, program: s.program, ss: [] }
      groups[k].ss.push(s)
    })

    let mastered = 0
    const regressions: { student: string; program: string; rate: number }[] = []
    const approaching: { student: string; program: string; streak: number }[] = []
    const maintenanceProbes: { student: string; program: string; days: number }[] = []
    const generalizationProbes: { student: string; program: string }[] = []
    const now = Date.now()

    Object.values(groups).forEach(({ student, program, ss }) => {
      const sorted = [...ss].sort((a, b) => a.timestamp - b.timestamp)
      const crit = sorted[sorted.length - 1]?.criterion ?? 80
      const status = computeStatus(ss, crit)
      const last = sorted[sorted.length - 1]
      if (status === 'mastered') {
        mastered++
        // Sonda de manutenção: dominado mas sem sessão há +14 dias e sem manutenção recente
        const days = Math.floor((now - last.timestamp) / DAY)
        const recentMaintenance = ss.some(s => s.phase === 'maintenance' && (now - s.timestamp) < 30 * DAY)
        if (days >= 14 && !recentMaintenance) maintenanceProbes.push({ student, program, days })
        // Sonda de generalização: nunca testado em generalização
        if (!ss.some(s => s.phase === 'generalization')) generalizationProbes.push({ student, program })
      }
      if (status === 'attention') regressions.push({ student, program, rate: last?.rate ?? 0 })
      if (status === 'approaching') approaching.push({ student, program, streak: computeStreak(ss, crit) })
    })

    const pendingReviews = isSupervisor ? sessions.filter(s => !s.reviewedAt && !s._pending).length : 0

    return {
      totalPatients: students.length, sessionsWeek, overallMean, mastered,
      regressions: regressions.sort((a, b) => a.rate - b.rate).slice(0, 4),
      approaching: approaching.slice(0, 3),
      maintenanceProbes: maintenanceProbes.sort((a, b) => b.days - a.days).slice(0, 3),
      generalizationProbes: generalizationProbes.slice(0, 3),
      pendingReviews,
    }
  }, [sessions, isSupervisor])

  if (!sessions.length) return null

  return (
    <div className="mb-5 space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users size={16} />} value={String(data.totalPatients)} label="Pacientes" tone="indigo" />
        <StatCard icon={<CalendarDays size={16} />} value={String(data.sessionsWeek)} label="Sessões (7 dias)" tone="emerald" />
        <StatCard icon={<TrendingUp size={16} />} value={`${data.overallMean.toFixed(0)}%`} label="Média geral" tone="purple" valueColor={rateColor(data.overallMean)} />
        <StatCard icon={<Award size={16} />} value={String(data.mastered)} label="Masterizados" tone="amber" />
      </div>

      {/* Alertas */}
      {(data.regressions.length > 0 || data.approaching.length > 0 || data.pendingReviews > 0 || data.maintenanceProbes.length > 0 || data.generalizationProbes.length > 0) && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Alertas</p>
          <div className="space-y-2">
            {data.pendingReviews > 0 && (
              <AlertRow
                onClick={() => onNavigate('history')}
                icon={<CheckCircle2 size={15} className="text-indigo-500" />}
                bg="bg-indigo-50"
                text={<><strong>{data.pendingReviews}</strong> sessões pendentes de revisão clínica</>}
              />
            )}
            {data.regressions.map((r, i) => (
              <AlertRow
                key={'reg' + i}
                onClick={() => onNavigate('history')}
                icon={<AlertTriangle size={15} className="text-red-500" />}
                bg="bg-red-50"
                text={<><strong>{r.student}</strong> · {r.program} em regressão ({r.rate.toFixed(0)}%)</>}
              />
            ))}
            {data.maintenanceProbes.map((m, i) => (
              <AlertRow
                key={'mnt' + i}
                onClick={() => onNavigate('session')}
                icon={<RefreshCw size={15} className="text-teal-500" />}
                bg="bg-teal-50"
                text={<><strong>{m.student}</strong> · {m.program} — sonda de manutenção devida (há {m.days} dias)</>}
              />
            ))}
            {data.generalizationProbes.map((g, i) => (
              <AlertRow
                key={'gen' + i}
                onClick={() => onNavigate('session')}
                icon={<Globe size={15} className="text-cyan-500" />}
                bg="bg-cyan-50"
                text={<><strong>{g.student}</strong> · {g.program} — sugerida sonda de generalização</>}
              />
            ))}
            {data.approaching.map((a, i) => (
              <AlertRow
                key={'app' + i}
                onClick={() => onNavigate('history')}
                icon={<Award size={15} className="text-amber-500" />}
                bg="bg-amber-50"
                text={<><strong>{a.student}</strong> · {a.program} perto da maestria ({a.streak}/3)</>}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, tone, valueColor }: { icon: React.ReactNode; value: string; label: string; tone: 'indigo' | 'emerald' | 'purple' | 'amber'; valueColor?: string }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
      <div>
        <p className="text-xl font-black tabular leading-none" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function AlertRow({ icon, text, bg, onClick }: { icon: React.ReactNode; text: React.ReactNode; bg: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 ${bg} rounded-xl px-3 py-2.5 text-left hover:brightness-95 transition-all`}>
      {icon}
      <span className="text-xs text-slate-700 flex-1">{text}</span>
    </button>
  )
}
