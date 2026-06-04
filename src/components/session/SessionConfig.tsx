import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { Phase, PromptMode, CollectionType } from '../../types'

const COLLECTION_TYPES: { id: CollectionType; label: string; icon: string }[] = [
  { id: 'dtt',       label: 'DTT',        icon: '📊' },
  { id: 'frequency', label: 'Frequência', icon: '#' },
  { id: 'duration',  label: 'Duração',    icon: '⏱' },
  { id: 'abc',       label: 'ABC',        icon: '🔍' },
]

export function SessionConfig() {
  const { config, updateConfig, startSession } = useSessionStore()
  const sessions = useAppStore((s) => s.sessions)
  const showToast = useAppStore((s) => s.showToast)

  const studentSuggestions = [...new Set(sessions.map(s => s.student))].sort().slice(0, 6)
  const programSuggestions = config.student
    ? [...new Set(sessions.filter(s => s.student === config.student).map(s => s.program))].sort()
    : [...new Set(sessions.map(s => s.program))].sort().slice(0, 6)

  function handleStart() {
    if (!config.student.trim()) { showToast('Informe o nome do aluno / cliente', 'error'); return }
    if (!config.program.trim()) { showToast('Informe o programa / alvo', 'error'); return }
    if (config.collectionType === 'dtt' && config.plannedTrials < 1) { showToast('Informe as tentativas planejadas', 'error'); return }
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
            <Input label="Programa / Alvo" value={config.program} onChange={e => updateConfig({ program: e.target.value })} placeholder="Ex: Contato Visual, Mandar Estímulo" autoComplete="off" />
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
            <div className="grid grid-cols-4 gap-2">
              {COLLECTION_TYPES.map(({ id, label, icon }) => (
                <button key={id} type="button" onClick={() => updateConfig({ collectionType: id })}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${config.collectionType === id ? 'bg-primary text-white border-primary shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {config.collectionType === 'dtt' && (
              <Input label="Tentativas Planejadas" type="number" min="1" max="50" value={config.plannedTrials} onChange={e => updateConfig({ plannedTrials: +e.target.value })} />
            )}
            <Input
              label="Critério de Maestria (%)"
              type="number" min="1" max="100"
              value={config.criterion}
              onChange={e => updateConfig({ criterion: +e.target.value })}
              className={config.collectionType !== 'dtt' ? 'col-span-2' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {config.collectionType === 'dtt' && (
              <Select label="Hierarquia de Dicas" value={config.promptMode} onChange={e => updateConfig({ promptMode: e.target.value as PromptMode })}>
                <option value="simple">Simplificada (I / P / E)</option>
                <option value="full">Completa (I-V-G-M-PP-FP-E)</option>
              </Select>
            )}
            <Select
              label="Fase do Programa"
              value={config.phase}
              onChange={e => updateConfig({ phase: e.target.value as Phase })}
              className={config.collectionType !== 'dtt' ? 'col-span-2' : ''}
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
    </div>
  )
}
