import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Check, X, Trash2, Clock } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { Card } from '../components/ui/Card'
import type { Appointment, AppointmentStatus } from '../types'

const DAY_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DURATION_OPTS = [30, 45, 60, 90, 120]

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  completed:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled:  'bg-slate-100 text-slate-400 border-slate-200',
  missed:     'bg-red-100 text-red-600 border-red-200',
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:  'Agendado',
  completed:  'Realizado',
  cancelled:  'Cancelado',
  missed:     'Faltou',
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateInput(iso: string): string {
  return iso.slice(0, 10)
}

interface AddForm {
  patient_name: string
  patient_id: string | null
  date: string
  time: string
  duration_min: number
  notes: string
}

const EMPTY_FORM: AddForm = {
  patient_name: '',
  patient_id: null,
  date: new Date().toISOString().slice(0, 10),
  time: '09:00',
  duration_min: 60,
  notes: '',
}

export function CalendarPage() {
  const { sessions, appointments, addAppointment, updateAppointment, deleteAppointment } = useAppStore()
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<AddForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<Appointment | null>(null)

  // Lista de pacientes (do histórico de sessões)
  const patientList = useMemo(() => {
    const map = new Map<string, string>() // name → id
    sessions.forEach(s => { if (s.student && s._patientId) map.set(s.student, s._patientId) })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [sessions])

  // Dias da semana atual (Seg–Dom)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  }), [weekStart])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + 7)
    return d
  }, [weekStart])

  // Agrupa agendamentos por dia (string YYYY-MM-DD)
  const byDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    appointments.forEach(a => {
      const day = a.scheduled_at.slice(0, 10)
      const d = new Date(a.scheduled_at)
      if (d >= weekStart && d < weekEnd) {
        if (!map[day]) map[day] = []
        map[day].push(a)
      }
    })
    return map
  }, [appointments, weekStart, weekEnd])

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }
  function goToday()  { setWeekStart(getMondayOf(new Date())) }

  function openAdd(day?: Date) {
    setForm({
      ...EMPTY_FORM,
      date: (day ?? new Date()).toISOString().slice(0, 10),
    })
    setShowAdd(true)
  }

  function handlePatientChange(name: string) {
    const entry = patientList.find(([n]) => n === name)
    setForm(f => ({ ...f, patient_name: name, patient_id: entry?.[1] ?? null }))
  }

  async function handleSave() {
    if (!form.patient_name.trim()) return
    setSaving(true)
    const scheduled_at = new Date(`${form.date}T${form.time}:00`).toISOString()
    await addAppointment({
      patient_id: form.patient_id,
      patient_name: form.patient_name.trim(),
      title: form.patient_name.trim(),
      scheduled_at,
      duration_min: form.duration_min,
      notes: form.notes.trim(),
      status: 'scheduled',
    })
    setSaving(false)
    setShowAdd(false)
    setForm(EMPTY_FORM)
  }

  async function setStatus(id: string, status: AppointmentStatus) {
    await updateAppointment(id, { status })
    setDetail(d => d?.id === id ? { ...d, status } : d)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este agendamento?')) return
    await deleteAppointment(id)
    setDetail(null)
  }

  const weekLabel = `${days[0].getDate()} ${MONTH_LABEL[days[0].getMonth()]} – ${days[6].getDate()} ${MONTH_LABEL[days[6].getMonth()]} ${days[6].getFullYear()}`
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4">
      {/* Cabeçalho da semana */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"><ChevronLeft size={18} /></button>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800">{weekLabel}</p>
            <button onClick={goToday} className="text-xs text-primary hover:underline mt-0.5">Hoje</button>
          </div>
          <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"><ChevronRight size={18} /></button>
        </div>

        {/* Mini-calendário: dias da semana */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const key = d.toISOString().slice(0, 10)
            const count = byDay[key]?.length ?? 0
            const isToday = key === today
            return (
              <button
                key={key}
                onClick={() => openAdd(d)}
                className={`flex flex-col items-center py-2 rounded-xl text-xs transition-colors ${isToday ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <span className={isToday ? 'text-white/70' : 'text-slate-400'}>{DAY_LABEL[d.getDay()]}</span>
                <span className="font-black text-base mt-0.5">{d.getDate()}</span>
                {count > 0 && <span className={`w-4 h-1 rounded-full mt-0.5 ${isToday ? 'bg-white/60' : 'bg-primary'}`} />}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Lista de dias com agendamentos */}
      {days.map(d => {
        const key = d.toISOString().slice(0, 10)
        const dayAppts = (byDay[key] ?? []).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        const isToday = key === today
        return (
          <div key={key}>
            <div className={`flex items-center gap-2 mb-2 ${isToday ? 'text-primary' : 'text-slate-400'}`}>
              <span className="text-xs font-bold uppercase tracking-wide">
                {DAY_LABEL[d.getDay()]}, {d.getDate()} {MONTH_LABEL[d.getMonth()]}
              </span>
              {isToday && <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold">Hoje</span>}
            </div>

            {dayAppts.length === 0 ? (
              <button onClick={() => openAdd(d)} className="w-full border border-dashed border-slate-200 rounded-xl py-3 text-xs text-slate-300 hover:text-primary hover:border-primary transition-colors">
                + Adicionar agendamento
              </button>
            ) : (
              <div className="space-y-2">
                {dayAppts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setDetail(a)}
                    className={`w-full text-left border rounded-xl p-3 transition-all hover:shadow-sm ${STATUS_COLOR[a.status]}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm truncate">{a.patient_name}</p>
                      <span className="text-xs font-semibold ml-2 flex-shrink-0">{STATUS_LABEL[a.status]}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                      <Clock size={11} />
                      <span>{formatTime(a.scheduled_at)} · {a.duration_min}min</span>
                    </div>
                    {a.notes && <p className="text-xs mt-1 opacity-60 truncate">{a.notes}</p>}
                  </button>
                ))}
                <button onClick={() => openAdd(d)} className="w-full border border-dashed border-slate-200 rounded-xl py-2 text-xs text-slate-300 hover:text-primary hover:border-primary transition-colors">
                  + Adicionar
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* FAB */}
      <button
        onClick={() => openAdd()}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-all z-30 no-print"
      >
        <Plus size={22} className="text-white" strokeWidth={2.5} />
      </button>

      {/* Modal: adicionar agendamento */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-base font-black text-slate-900 mb-4">Novo Agendamento</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Paciente *</label>
                <input
                  list="patient-opts"
                  value={form.patient_name}
                  onChange={e => handlePatientChange(e.target.value)}
                  placeholder="Nome do paciente"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id="patient-opts">
                  {patientList.map(([name]) => <option key={name} value={name} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Data *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Horário *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Duração</label>
                <div className="flex gap-2">
                  {DURATION_OPTS.map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(f => ({ ...f, duration_min: d }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${form.duration_min === d ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 hover:border-primary'}`}
                    >
                      {d}min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Objetivo da sessão, local, etc."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.patient_name.trim() || saving}
                className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: detalhe do agendamento */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setDetail(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">{detail.patient_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(detail.scheduled_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  {' · '}{formatTime(detail.scheduled_at)} · {detail.duration_min}min
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLOR[detail.status]}`}>
                {STATUS_LABEL[detail.status]}
              </span>
            </div>
            {detail.notes && <p className="text-sm text-slate-600 mb-4">{detail.notes}</p>}

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Atualizar status</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['scheduled','completed','missed','cancelled'] as AppointmentStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(detail.id, s)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${detail.status === s ? STATUS_COLOR[s] : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  {s === 'scheduled' && <><Check size={11} className="inline mr-1" />Agendado</>}
                  {s === 'completed' && <><Check size={11} className="inline mr-1" />Realizado</>}
                  {s === 'missed'    && <><X    size={11} className="inline mr-1" />Faltou</>}
                  {s === 'cancelled' && <><X    size={11} className="inline mr-1" />Cancelado</>}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleDelete(detail.id)}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 font-semibold py-2.5 rounded-xl hover:bg-red-50 transition-colors text-sm"
            >
              <Trash2 size={14} /> Remover agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
