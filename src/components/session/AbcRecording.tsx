import { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useAppStore } from '../../stores/appStore'
import { TextArea } from '../ui/Input'
import type { AbcEntry } from '../../types'

export function AbcRecording() {
  const { abcLog, addAbc } = useSessionStore()
  const showToast = useAppStore((s) => s.showToast)
  const [form, setForm] = useState({ antecedente: '', comportamento: '', consequencia: '', intensidade: 'Moderada' as AbcEntry['intensidade'] })

  function handleAdd() {
    if (!form.antecedente && !form.comportamento) { showToast('Preencha ao menos A ou B', 'warning'); return }
    addAbc(form)
    setForm({ antecedente: '', comportamento: '', consequencia: '', intensidade: 'Moderada' })
    if (navigator.vibrate) navigator.vibrate(25)
  }

  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Registro ABC — {abcLog.length} registro(s)</p>
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-4 space-y-3 mb-3">
        <TextArea label="A — Antecedente" rows={2} value={form.antecedente} onChange={e => setForm({ ...form, antecedente: e.target.value })} placeholder="O que aconteceu ANTES do comportamento?" />
        <TextArea label="B — Comportamento" rows={2} value={form.comportamento} onChange={e => setForm({ ...form, comportamento: e.target.value })} placeholder="Descreva o comportamento observado" />
        <TextArea label="C — Consequência" rows={2} value={form.consequencia} onChange={e => setForm({ ...form, consequencia: e.target.value })} placeholder="O que aconteceu DEPOIS do comportamento?" />
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Intensidade</label>
          <div className="grid grid-cols-3 gap-2">
            {(['Leve','Moderada','Intensa'] as const).map(n => (
              <button key={n} type="button" onClick={() => setForm({ ...form, intensidade: n })}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.intensidade === n ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleAdd} className="w-full bg-primary text-white font-bold py-3 rounded-xl border-none hover:bg-primary-600 active:scale-95 transition-all">
          + Adicionar Registro ABC
        </button>
      </div>
      {abcLog.length > 0 && (
        <div className="max-h-52 overflow-y-auto space-y-2">
          {[...abcLog].reverse().map((r, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 text-xs shadow-card">
              <div className="flex justify-between mb-1.5">
                <span className="font-bold text-primary">#{abcLog.length - i}</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${r.intensidade === 'Intensa' ? 'bg-red-100 text-red-700' : r.intensidade === 'Moderada' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{r.intensidade}</span>
              </div>
              <p className="text-slate-600"><strong>A:</strong> {r.antecedente}</p>
              <p className="text-slate-600"><strong>B:</strong> {r.comportamento}</p>
              <p className="text-slate-600"><strong>C:</strong> {r.consequencia}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
