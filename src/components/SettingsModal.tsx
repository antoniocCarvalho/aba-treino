import { useState } from 'react'
import { X, UserCog, GraduationCap, Link2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { profile, user, setRole, linkSupervisor } = useAppStore()
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-2 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900">Configurações de Supervisão</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Papel */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Seu Papel</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={busy}
                onClick={() => handleSetRole('bcba')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'bcba' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <UserCog size={24} className={role === 'bcba' ? 'text-primary' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${role === 'bcba' ? 'text-primary' : 'text-slate-600'}`}>Supervisor</span>
                <span className="text-xs text-slate-400">BCBA</span>
              </button>
              <button
                disabled={busy}
                onClick={() => handleSetRole('rbt')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'rbt' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <GraduationCap size={24} className={role === 'rbt' ? 'text-primary' : 'text-slate-400'} />
                <span className={`text-sm font-bold ${role === 'rbt' ? 'text-primary' : 'text-slate-600'}`}>Técnico</span>
                <span className="text-xs text-slate-400">RBT</span>
              </button>
            </div>
          </div>

          {/* Vínculo de supervisor (somente RBT) */}
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
                  <p className="text-xs text-slate-500 mb-2">Informe o e-mail do BCBA que vai supervisionar suas sessões. Ele poderá visualizá-las e revisá-las.</p>
                  <div className="flex gap-2">
                    <input
                      type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)}
                      placeholder="email.do.supervisor@exemplo.com"
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button onClick={handleLink} disabled={busy || !supEmail.trim()} className="bg-primary text-white text-sm font-bold px-4 rounded-xl disabled:opacity-50">
                      Vincular
                    </button>
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
                <span className="font-bold"> {user?.email}</span>. As sessões deles aparecerão no
                seu Histórico para revisão clínica.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
