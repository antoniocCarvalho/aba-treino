import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PROGRAM_LIBRARY, type ProgramTemplate } from '../../lib/programLibrary'
import { DOMAIN_LABEL, DOMAIN_COLOR } from '../../lib/goals'
import type { Phase, PromptMode, CollectionType, IntervalKind, GoalDomain } from '../../types'

const COLLECTION_TYPES: { id: CollectionType; label: string; icon: string }[] = [
  { id: 'dtt',           label: 'DTT',        icon: '📊' },
  { id: 'frequency',     label: 'Frequência', icon: '#' },
  { id: 'duration',      label: 'Duração',    icon: '⏱' },
  { id: 'abc',           label: 'ABC',        icon: '🔍' },
  { id: 'task_analysis', label: 'Tarefa',     icon: '🪜' },
  { id: 'interval',      label: 'Intervalo',  icon: '⏲️' },
]

export function SessionConfig() {
  const { config, updateConfig, startSession } = useSessionStore()
  const sessions = useAppStore((s) => s.sessions)
  const showToast = useAppStore((s) => s.showToast)
  const [libOpen, setLibOpen] = useState(false)

  const ct = config.collectionType
  const showDtt = ct === 'dtt'

  function applyTemplate(t: ProgramTemplate) {
    updateConfig({
      program: t.name,
      collectionType: t.collectionType,
      criterion: t.criterion,
      taStepsText: t.taSteps ? t.taSteps.join('\n') : config.taStepsText,
    })
    setLibOpen(false)
  }

  const studentSuggestions = [...new Set(sessions.map(s => s.student))].sort().slice(0, 6)
  const programSuggestions = config.student
    ? [...new Set(sessions.filter(s => s.student === config.student).map(s => s.program))].sort()
    : [...new Set(sessions.map(s => s.program))].sort().slice(0, 6)

  function handleStart() {
    if (!config.student.trim()) { showToast('Informe o nome do aluno / cliente', 'error'); return }
    if (!config.program.trim()) { showToast('Informe o programa / alvo', 'error'); return }
    if (ct === 'dtt' && config.plannedTrials < 1) { showToast('Informe as tentativas planejadas', 'error'); return }
    if (ct === 'task_analysis' && config.taStepsText.split('\n').filter(s => s.trim()).length < 2) {
      showToast('Informe ao menos 2 passos da tarefa (um por linha)', 'error'); return
    }
    if (ct === 'interval' && (config.intervalSeconds < 1 || config.intervalCount < 1)) {
      showToast('Configure os intervalos', 'error'); return
    }
    startSession()
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-base font-bold text-slate-800 mb-4">Nova Sessão</h2>
        <div className="space-y-4">
          <div>
            <Input label="Aluno / Cliente" value={config.student} onChange={e => updateConfig({ student: e.target.value })} placeholder="Nome do paciente" autoComplete="off" />
            {studentSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {studentSuggestions.map(s => (
                  <button key={s} onClick={() => updateConfig({ student: s })} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input label="Programa / Alvo" value={config.program} onChange={e => updateConfig({ program: e.target.value })} placeholder="Ex: Contato Visual, Mandar Estímulo" autoComplete="off" />
              </div>
              <button type="button" onClick={() => setLibOpen(true)} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-indigo-100 transition-colors whitespace-nowrap">
                <BookOpen size={14} /> Biblioteca
              </button>
            </div>
            {programSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {programSuggestions.map(p => (
                  <button key={p} onClick={() => updateConfig({ program: p })} className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors">{p}</button>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de Coleta */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tipo de Coleta</label>
            <div className="grid grid-cols-3 gap-2">
              {COLLECTION_TYPES.map(({ id, label, icon }) => (
                <button key={id} type="button" onClick={() => updateConfig({ collectionType: id })}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${ct === id ? 'bg-primary text-white border-primary shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Passos da Análise de Tarefa */}
          {ct === 'task_analysis' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Passos da Tarefa (um por linha)</label>
              <textarea
                value={config.taStepsText}
                onChange={e => updateConfig({ taStepsText: e.target.value })}
                rows={5}
                placeholder={'Ex: Lavar as mãos\n1. Abrir a torneira\n2. Molhar as mãos\n3. Pegar o sabonete\n4. Esfregar as mãos\n5. Enxaguar\n6. Fechar a torneira\n7. Secar as mãos'}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">{config.taStepsText.split('\n').filter(s => s.trim()).length} passos</p>
            </div>
          )}

          {/* Configuração do Registro por Intervalo */}
          {ct === 'interval' && (
            <div className="space-y-3">
              <Select label="Tipo de Intervalo" value={config.intervalKind} onChange={e => updateConfig({ intervalKind: e.target.value as IntervalKind })}>
                <option value="partial">Parcial (ocorreu em qualquer momento)</option>
                <option value="whole">Total (ocorreu o intervalo inteiro)</option>
                <option value="momentary">Momentâneo (ocorreu no fim do intervalo)</option>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Duração do intervalo (s)" type="number" min="3" max="120" value={config.intervalSeconds} onChange={e => updateConfig({ intervalSeconds: +e.target.value })} />
                <Input label="Nº de intervalos" type="number" min="1" max="60" value={config.intervalCount} onChange={e => updateConfig({ intervalCount: +e.target.value })} />
              </div>
              <p className="text-xs text-slate-400">Total: {Math.round(config.intervalSeconds * config.intervalCount / 60 * 10) / 10} min de observação</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {showDtt && (
              <Input label="Tentativas Planejadas" type="number" min="1" max="50" value={config.plannedTrials} onChange={e => updateConfig({ plannedTrials: +e.target.value })} />
            )}
            <Input
              label="Critério de Maestria (%)"
              type="number" min="1" max="100"
              value={config.criterion}
              onChange={e => updateConfig({ criterion: +e.target.value })}
              className={!showDtt ? 'col-span-2' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {showDtt && (
              <Select label="Hierarquia de Dicas" value={config.promptMode} onChange={e => updateConfig({ promptMode: e.target.value as PromptMode })}>
                <option value="simple">Simplificada (I / P / E)</option>
                <option value="full">Completa (I-V-G-M-PP-FP-E)</option>
              </Select>
            )}
            <Select
              label="Fase do Programa"
              value={config.phase}
              onChange={e => updateConfig({ phase: e.target.value as Phase })}
              className={!showDtt ? 'col-span-2' : ''}
            >
              <option value="baseline">Baseline</option>
              <option value="acquisition">Aquisição</option>
              <option value="maintenance">Manutenção</option>
              <option value="generalization">Generalização</option>
            </Select>
          </div>
        </div>
      </Card>

      <Button variant="primary" size="lg" fullWidth onClick={handleStart}>
        Iniciar Sessão →
      </Button>

      {libOpen && <ProgramLibraryModal onClose={() => setLibOpen(false)} onPick={applyTemplate} />}
    </div>
  )
}

function ProgramLibraryModal({ onClose, onPick }: { onClose: () => void; onPick: (t: ProgramTemplate) => void }) {
  const [filter, setFilter] = useState<GoalDomain | 'all'>('all')
  const domains = [...new Set(PROGRAM_LIBRARY.map(t => t.domain))]
  const items = filter === 'all' ? PROGRAM_LIBRARY : PROGRAM_LIBRARY.filter(t => t.domain === filter)

  const CT_ICON: Record<string, string> = { dtt: '📊', frequency: '#', duration: '⏱', abc: '🔍', task_analysis: '🪜', interval: '⏲️' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">Biblioteca de Programas</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>

        {/* Filtros de domínio */}
        <div className="px-4 py-2 border-b border-slate-100 overflow-x-auto">
          <div className="flex gap-1.5 w-max">
            <button onClick={() => setFilter('all')} className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${filter === 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
            {domains.map(d => (
              <button key={d} onClick={() => setFilter(d)} className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ${filter === d ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>{DOMAIN_LABEL[d]}</button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto p-4 space-y-2">
          {items.map((t, i) => (
            <button key={i} onClick={() => onPick(t)} className="w-full text-left border border-slate-100 rounded-xl p-3 hover:border-primary hover:bg-primary/5 transition-all">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{CT_ICON[t.collectionType]} {t.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DOMAIN_COLOR[t.domain]}`}>{DOMAIN_LABEL[t.domain]}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Critério {t.criterion}%{t.taSteps ? ` · ${t.taSteps.length} passos` : ''}{t.note ? ` · ${t.note}` : ''}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
