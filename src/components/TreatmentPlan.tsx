import { useState } from 'react'
import { Plus, Trash2, Check, Target, RotateCcw } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { DOMAIN_LABEL, DOMAIN_COLOR, TERM_LABEL, STATUS_LABEL, STATUS_COLOR } from '../lib/goals'
import type { GoalDomain, GoalTerm } from '../types'

const DOMAINS = Object.keys(DOMAIN_LABEL) as GoalDomain[]

export function TreatmentPlan({ patientId }: { patientId: string }) {
  const { goals, addGoal, updateGoal, deleteGoal } = useAppStore()
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<{ title: string; domain: GoalDomain; term: GoalTerm; target_date: string; description: string }>({
    title: '', domain: 'comunicacao', term: 'short', target_date: '', description: '',
  })

  const patientGoals = goals
    .filter(g => g.patient_id === patientId)
    .sort((a, b) => {
      const order = { active: 0, achieved: 1, discontinued: 2 }
      return order[a.status] - order[b.status]
    })

  async function handleAdd() {
    if (!form.title.trim()) return
    setBusy(true)
    const ok = await addGoal(patientId, {
      title: form.title.trim(), domain: form.domain, term: form.term,
      target_date: form.target_date || null, description: form.description.trim(), status: 'active',
    })
    setBusy(false)
    if (ok) { setForm({ title: '', domain: 'comunicacao', term: 'short', target_date: '', description: '' }); setAdding(false) }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Target size={13} /> Plano de Tratamento
        </p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
            <Plus size={13} /> Objetivo
          </button>
        )}
      </div>

      {/* Formulário de novo objetivo */}
      {adding && (
        <div className="border border-primary/30 rounded-2xl p-4 mb-3 bg-primary/5 space-y-3">
          <input
            autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Ex: Solicitar itens preferidos com 1 palavra"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição / critério de domínio (opcional)" rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value as GoalDomain })} className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABEL[d]}</option>)}
            </select>
            <select value={form.term} onChange={e => setForm({ ...form, term: e.target.value as GoalTerm })} className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="short">Curto prazo</option>
              <option value="long">Longo prazo</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Meta de conclusão (opcional)</label>
            <input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={busy || !form.title.trim()} className="flex-1 bg-primary text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50">Adicionar</button>
            <button onClick={() => setAdding(false)} className="px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de objetivos */}
      {patientGoals.length === 0 && !adding ? (
        <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Nenhum objetivo definido ainda</p>
      ) : (
        <div className="space-y-2">
          {patientGoals.map(g => (
            <div key={g.id} className={`border border-slate-100 rounded-xl p-3 ${g.status !== 'active' ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DOMAIN_COLOR[g.domain]}`}>{DOMAIN_LABEL[g.domain]}</span>
                    <span className="text-xs text-slate-400">{TERM_LABEL[g.term]}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[g.status]}`}>{STATUS_LABEL[g.status]}</span>
                  </div>
                  <p className={`text-sm font-semibold text-slate-800 ${g.status === 'achieved' ? 'line-through' : ''}`}>{g.title}</p>
                  {g.description && <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>}
                  {g.target_date && <p className="text-xs text-slate-400 mt-0.5">🎯 Meta: {new Date(g.target_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {g.status === 'active' ? (
                    <button onClick={() => updateGoal(g.id, { status: 'achieved' })} title="Marcar como alcançado" className="text-slate-300 hover:text-emerald-500 p-1"><Check size={15} /></button>
                  ) : (
                    <button onClick={() => updateGoal(g.id, { status: 'active' })} title="Reativar" className="text-slate-300 hover:text-indigo-500 p-1"><RotateCcw size={14} /></button>
                  )}
                  <button onClick={() => { if (confirm('Remover este objetivo?')) deleteGoal(g.id) }} title="Remover" className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
