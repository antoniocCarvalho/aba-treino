import { useState, useEffect } from 'react'
import { Search, ChevronRight, Plus, Pencil, Trash2, Check, X, Share2, Star, ChevronDown } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useSessionStore } from '../stores/sessionStore'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { Dashboard } from '../components/Dashboard'
import { TreatmentPlan } from '../components/TreatmentPlan'
import { computeStatus, computeStreak, rateColor } from '../lib/aba'
import { cls } from '../lib/utils'
import type { Patient, PatientProgram, PreferenceItem, PreferenceCategory } from '../types'

const CATEGORY_LABEL: Record<PreferenceCategory, string> = {
  comida: 'Comida', brinquedo: 'Brinquedo', atividade: 'Atividade', social: 'Social', outro: 'Outro',
}
const CATEGORY_COLOR: Record<PreferenceCategory, string> = {
  comida: 'bg-orange-100 text-orange-700', brinquedo: 'bg-blue-100 text-blue-700',
  atividade: 'bg-green-100 text-green-700', social: 'bg-purple-100 text-purple-700', outro: 'bg-slate-100 text-slate-600',
}

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
        id: pss.find(s => s._programId)?._programId,
        name: prog, sessions: pss,
        meanRate: pss.reduce((a, s) => a + s.rate, 0) / pss.length,
        streak: computeStreak(pss, crit),
        status: computeStatus(pss, crit),
        criterion: crit,
      }
    })

    const meanRate = ss.reduce((a, s) => a + s.rate, 0) / ss.length
    const lastDate = ss.reduce((best, s) => s.timestamp > (best?.timestamp ?? 0) ? s : best, ss[0])?.date ?? '—'
    return { id: ss.find(s => s._patientId)?._patientId, name, sessions: ss, meanRate, lastDate, programs: programs.sort((a, b) => b.meanRate - a.meanRate) }
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
      <Dashboard onNavigate={onNavigate} />

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
  const { renamePatient, deletePatient, renameProgram, deleteProgram, createShareLink, showToast, goals, fetchPreferences, addPreference, deletePreference } = useAppStore()

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(patient.name)
  const [editingProg, setEditingProg] = useState<string | null>(null)
  const [progDraft, setProgDraft] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    if (!patient.id) return
    setSharing(true)
    const url = await createShareLink(patient.id)
    setSharing(false)
    if (url) {
      setShareUrl(url)
      try { await navigator.clipboard.writeText(url); showToast('Link copiado!', 'success') } catch { /* sem clipboard */ }
    }
  }

  function startSessionFor(prog?: PatientProgram) {
    updateConfig({ student: patient.name, program: prog?.name ?? '', criterion: prog?.criterion ?? 80 })
    setPanel('config')
    onClose()
    onNavigate('session')
  }

  async function savePatientName() {
    if (!patient.id) return
    const ok = await renamePatient(patient.id, nameDraft)
    if (ok) { setEditingName(false); onClose() }
  }

  async function handleDeletePatient() {
    if (!patient.id) return
    if (!confirm(`Excluir "${patient.name}" e TODAS as suas sessões? Esta ação é irreversível.`)) return
    const ok = await deletePatient(patient.id)
    if (ok) onClose()
  }

  async function saveProgName(progId: string) {
    const ok = await renameProgram(progId, progDraft)
    if (ok) { setEditingProg(null); onClose() }
  }

  async function handleDeleteProgram(prog: PatientProgram) {
    if (!prog.id) return
    if (!confirm(`Excluir o programa "${prog.name}" e suas ${prog.sessions.length} sessões?`)) return
    const ok = await deleteProgram(prog.id)
    if (ok && patient.programs.length === 1) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[88vh] overflow-y-auto pb-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-4" />
        <div className="px-5">
          {/* Header com edição de nome */}
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={patient.name} />
            {editingName ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') savePatientName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="flex-1 border border-primary rounded-lg px-3 py-1.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button onClick={savePatientName} className="text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-lg"><Check size={18} /></button>
                <button onClick={() => { setEditingName(false); setNameDraft(patient.name) }} className="text-slate-400 p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{patient.name}</h2>
                  <p className="text-xs text-slate-400">{patient.sessions.length} sessões · {patient.programs.length} programas · média {patient.meanRate.toFixed(1)}%</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setNameDraft(patient.name); setEditingName(true) }} className="text-slate-400 hover:text-primary p-2 hover:bg-slate-50 rounded-lg"><Pencil size={15} /></button>
                  <button onClick={handleDeletePatient} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                </div>
              </div>
            )}
          </div>

          {/* Plano de Tratamento */}
          {patient.id && (
            <div className="mb-5">
              <TreatmentPlan patientId={patient.id} />
            </div>
          )}

          {/* Barra de progresso do plano de tratamento */}
          {patient.id && (() => {
            const patGoals = goals.filter(g => g.patient_id === patient.id)
            if (!patGoals.length) return null
            const achieved = patGoals.filter(g => g.status === 'achieved').length
            const pct = (achieved / patGoals.length) * 100
            return (
              <div className="bg-slate-50 rounded-xl px-3.5 py-3 mb-5">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600">Objetivos do plano</span>
                  <span className="font-bold" style={{ color: pct === 100 ? '#059669' : '#5046E4' }}>{achieved}/{patGoals.length} alcançados</span>
                </div>
                <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct === 100 ? '#059669' : '#5046E4' }}
                  />
                </div>
              </div>
            )
          })()}

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Programas</p>

          {patient.programs.map(prog => {
            const pdiList = prog.sessions.filter(s => s.pdi !== null).map(s => s.pdi!)
            const pdiMean = pdiList.length ? pdiList.reduce((a, b) => a + b, 0) / pdiList.length : null
            const isEditing = editingProg === prog.id
            return (
              <div key={prog.name} className="border border-slate-100 rounded-2xl p-4 mb-3">
                <div className="flex items-start justify-between mb-3">
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus value={progDraft} onChange={e => setProgDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveProgName(prog.id!); if (e.key === 'Escape') setEditingProg(null) }}
                        className="flex-1 border border-primary rounded-lg px-2.5 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button onClick={() => saveProgName(prog.id!)} className="text-emerald-600 p-1"><Check size={16} /></button>
                      <button onClick={() => setEditingProg(null)} className="text-slate-400 p-1"><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{prog.name}</p>
                        <p className="text-xs text-slate-400">{prog.sessions.length} sessões · última: {prog.sessions.reduce((a, b) => a.timestamp > b.timestamp ? a : b).date}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <StatusBadge status={prog.status} />
                        <button onClick={() => { setProgDraft(prog.name); setEditingProg(prog.id ?? null) }} className="text-slate-300 hover:text-primary p-1"><Pencil size={13} /></button>
                        <button onClick={() => handleDeleteProgram(prog)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                      </div>
                    </>
                  )}
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

          {/* Reforçadores / Preferências */}
          {patient.id && (
            <PreferenceSection
              patientId={patient.id}
              fetchPreferences={fetchPreferences}
              addPreference={addPreference}
              deletePreference={deletePreference}
            />
          )}

          {/* Portal para pais */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <button onClick={handleShare} disabled={sharing} className="w-full flex items-center justify-center gap-2 border border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-indigo-100 disabled:opacity-50">
              <Share2 size={14} /> {sharing ? 'Gerando…' : 'Compartilhar com responsável'}
            </button>
            {shareUrl && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">Link de acompanhamento (válido por 90 dias):</p>
                <div className="flex gap-2">
                  <input readOnly value={shareUrl} className="flex-1 border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-slate-50 truncate" onFocus={e => e.currentTarget.select()} />
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); showToast('Link copiado!', 'success') }} className="px-3 bg-primary text-white text-xs font-bold rounded-lg">Copiar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PreferenceSectionProps {
  patientId: string
  fetchPreferences: (id: string) => Promise<PreferenceItem[]>
  addPreference: (id: string, item: Pick<PreferenceItem, 'name' | 'category' | 'rank' | 'notes'>) => Promise<PreferenceItem | null>
  deletePreference: (id: string) => Promise<boolean>
}

function PreferenceSection({ patientId, fetchPreferences, addPreference, deletePreference }: PreferenceSectionProps) {
  const [items, setItems]       = useState<PreferenceItem[]>([])
  const [open, setOpen]         = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [name, setName]         = useState('')
  const [category, setCategory] = useState<PreferenceCategory>('brinquedo')
  const [rank, setRank]         = useState(3)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    fetchPreferences(patientId).then(setItems)
  }, [patientId])

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    const item = await addPreference(patientId, { name: name.trim(), category, rank, notes: '' })
    if (item) {
      setItems(prev => [...prev, item].sort((a, b) => b.rank - a.rank))
      setName(''); setShowAdd(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const ok = await deletePreference(id)
    if (ok) setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-1 text-xs font-bold text-slate-400 uppercase tracking-wide"
      >
        <span>Reforçadores / Preferências {items.length > 0 && `(${items.length})`}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLOR[item.category]}`}>{CATEGORY_LABEL[item.category]}</span>
                  <span className="text-xs text-amber-500">{'★'.repeat(item.rank)}{'☆'.repeat(5 - item.rank)}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-400 p-1 transition-colors"><Trash2 size={13} /></button>
            </div>
          ))}

          {showAdd ? (
            <div className="border border-primary rounded-xl p-3 space-y-2">
              <input
                autoFocus value={name} onChange={e => setName(e.target.value)}
                placeholder="Nome do reforçador (ex: bolinha, ipad, elogio)"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={category} onChange={e => setCategory(e.target.value as PreferenceCategory)} className="border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary">
                  {(Object.keys(CATEGORY_LABEL) as PreferenceCategory[]).map(c => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 justify-center">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRank(n)} className={`text-lg ${n <= rank ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 border border-slate-200 text-slate-500 text-xs font-semibold py-2 rounded-lg">Cancelar</button>
                <button onClick={handleAdd} disabled={!name.trim() || saving} className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50">
                  {saving ? 'Salvando…' : 'Adicionar'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full border border-dashed border-slate-200 text-slate-400 text-xs font-semibold py-2.5 rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={13} /> Adicionar reforçador
            </button>
          )}
        </div>
      )}
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
