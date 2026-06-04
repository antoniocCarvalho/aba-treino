import { useState } from 'react'
import { UserCog, GraduationCap, Link2, Vibrate, SlidersHorizontal, ShieldCheck, HelpCircle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Card } from '../components/ui/Card'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-slate-300'}`}
      role="switch" aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export function SettingsPage({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { profile, user, setRole, linkSupervisor } = useAppStore()
  const { supervisionEnabled, setSupervisionEnabled, hapticEnabled, setHapticEnabled, defaultCriterion, setDefaultCriterion } = useSettingsStore()
  const [supEmail, setSupEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const role = profile?.role ?? 'bcba'

  async function handleSetRole(r: 'bcba' | 'rbt') {
    if (r === role) return
    setBusy(true); await setRole(r); setBusy(false)
  }
  async function handleLink() {
    if (!supEmail.trim()) return
    setBusy(true)
    const ok = await linkSupervisor(supEmail)
    setBusy(false)
    if (ok) setSupEmail('')
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 px-1">
        <SlidersHorizontal size={20} className="text-primary" />
        <h1 className="text-lg font-black text-slate-900">Configurações</h1>
      </div>

      {/* Preferências de sessão */}
      <Card className="p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Preferências de Sessão</p>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><Vibrate size={16} /></div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Vibração ao registrar</p>
              <p className="text-xs text-slate-400">Feedback tátil a cada tentativa</p>
            </div>
          </div>
          <Toggle checked={hapticEnabled} onChange={setHapticEnabled} />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-50 mt-1 pt-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-black">%</div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Critério de maestria padrão</p>
              <p className="text-xs text-slate-400">Pré-preenche novas sessões</p>
            </div>
          </div>
          <input
            type="number" min={1} max={100} value={defaultCriterion}
            onChange={e => setDefaultCriterion(Math.min(100, Math.max(1, +e.target.value || 80)))}
            className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </Card>

      {/* Supervisão clínica */}
      <Card className="p-5">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck size={16} /></div>
            <div>
              <p className="text-sm font-bold text-slate-800">Supervisão clínica</p>
              <p className="text-xs text-slate-400">Revisão e aprovação de sessões por um BCBA</p>
            </div>
          </div>
          <Toggle checked={supervisionEnabled} onChange={setSupervisionEnabled} />
        </div>

        {!supervisionEnabled ? (
          <div className="bg-slate-50 rounded-xl p-3 mt-3 text-xs text-slate-500 leading-relaxed">
            Desativada. Ideal para atendimento individual — você não precisa revisar nem aprovar sessões.
            Ative se trabalha em equipe (supervisor BCBA acompanhando técnicos RBT).
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {/* Papel */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Seu Papel</p>
              <div className="grid grid-cols-2 gap-3">
                <button disabled={busy} onClick={() => handleSetRole('bcba')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'bcba' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <UserCog size={22} className={role === 'bcba' ? 'text-primary' : 'text-slate-400'} />
                  <span className={`text-sm font-bold ${role === 'bcba' ? 'text-primary' : 'text-slate-600'}`}>Supervisor</span>
                  <span className="text-xs text-slate-400">BCBA</span>
                </button>
                <button disabled={busy} onClick={() => handleSetRole('rbt')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'rbt' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <GraduationCap size={22} className={role === 'rbt' ? 'text-primary' : 'text-slate-400'} />
                  <span className={`text-sm font-bold ${role === 'rbt' ? 'text-primary' : 'text-slate-600'}`}>Técnico</span>
                  <span className="text-xs text-slate-400">RBT</span>
                </button>
              </div>
            </div>

            {/* Vínculo (RBT) */}
            {role === 'rbt' && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Meu Supervisor</p>
                {profile?.supervisor_id ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                    <Link2 size={16} className="text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">Vinculado a um supervisor</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-2">Informe o e-mail do BCBA que vai supervisionar suas sessões.</p>
                    <div className="flex gap-2">
                      <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} placeholder="email.do.supervisor@exemplo.com"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary" />
                      <button onClick={handleLink} disabled={busy || !supEmail.trim()} className="bg-primary text-white text-sm font-bold px-4 rounded-xl disabled:opacity-50">Vincular</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Info BCBA */}
            {role === 'bcba' && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-indigo-900 mb-1">Como receber sessões para revisar</p>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  Seus técnicos (RBT) devem vincular você como supervisor usando o seu e-mail:
                  <span className="font-bold"> {user?.email}</span>. As sessões deles aparecerão no seu Histórico para revisão.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Conta */}
      <Card className="p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Conta</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Nome</span><span className="font-semibold text-slate-700">{profile?.full_name || '—'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">E-mail</span><span className="font-semibold text-slate-700">{user?.email}</span></div>
          {profile?.crp && <div className="flex justify-between"><span className="text-slate-400">CRP</span><span className="font-semibold text-slate-700">{profile.crp}</span></div>}
        </div>
      </Card>

      {/* Ajuda */}
      <button onClick={() => onNavigate('guide')} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary py-3">
        <HelpCircle size={16} /> Abrir Guia do Profissional
      </button>
    </div>
  )
}
