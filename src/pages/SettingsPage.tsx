import { useState, useRef } from 'react'
import { UserCog, GraduationCap, Link2, Vibrate, SlidersHorizontal, ShieldCheck, HelpCircle, Pencil, Check, X, KeyRound, Mail, Camera, Trash2, Download, Package, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { fileToAvatar } from '../lib/avatar'
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
  const { profile, user, setRole, linkSupervisor, updateProfile, changePassword, changeEmail, exportMyData, deleteAccount, showToast } = useAppStore()
  const { supervisionEnabled, setSupervisionEnabled, hapticEnabled, setHapticEnabled, defaultCriterion, setDefaultCriterion } = useSettingsStore()
  const [supEmail, setSupEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const role = profile?.role ?? 'bcba'

  // Avatar
  const fileRef = useRef<HTMLInputElement>(null)
  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('Imagem muito grande (máx. 5MB)', 'warning'); return }
    try {
      const dataUrl = await fileToAvatar(file)
      await updateProfile({ avatar_url: dataUrl })
    } catch {
      showToast('Não foi possível processar a imagem', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Excluir conta
  const [delOpen, setDelOpen] = useState(false)
  const [delConfirm, setDelConfirm] = useState('')
  async function handleDelete() {
    if (delConfirm.trim().toUpperCase() !== 'EXCLUIR') return
    await deleteAccount()
    // signOut no store leva de volta à tela de login automaticamente
  }

  const initial = (profile?.full_name || user?.email || '?').charAt(0).toUpperCase()

  // Edição de perfil
  const [editProfile, setEditProfile] = useState(false)
  const [pName, setPName] = useState(profile?.full_name ?? '')
  const [pCrp, setPCrp] = useState(profile?.crp ?? '')
  // Segurança
  const [newPass, setNewPass] = useState('')
  const [newPass2, setNewPass2] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

  async function saveProfile() {
    setBusy(true)
    const ok = await updateProfile({ full_name: pName.trim(), crp: pCrp.trim() })
    setBusy(false)
    if (ok) setEditProfile(false)
  }
  async function savePassword() {
    if (newPass !== newPass2) { useAppStore.getState().showToast('As senhas não coincidem', 'warning'); return }
    setBusy(true)
    const ok = await changePassword(newPass)
    setBusy(false)
    if (ok) { setNewPass(''); setNewPass2(''); setShowPass(false) }
  }
  async function saveEmail() {
    if (!newEmail.trim()) return
    setBusy(true)
    const ok = await changeEmail(newEmail)
    setBusy(false)
    if (ok) { setNewEmail(''); setShowEmail(false) }
  }

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
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Dados do Perfil</p>
          {!editProfile && (
            <button onClick={() => { setPName(profile?.full_name ?? ''); setPCrp(profile?.crp ?? ''); setEditProfile(true) }} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover" />
              : <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-black">{initial}</div>}
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-primary hover:bg-slate-50">
              <Camera size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
          </div>
          <div>
            <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-primary hover:underline block">Alterar foto</button>
            {profile?.avatar_url && (
              <button onClick={() => updateProfile({ avatar_url: '' })} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 mt-1">
                <Trash2 size={11} /> Remover
              </button>
            )}
          </div>
        </div>

        {editProfile ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Nome completo</label>
              <input value={pName} onChange={e => setPName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">CRP</label>
              <input value={pCrp} onChange={e => setPCrp(e.target.value)} placeholder="06/123456" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={saveProfile} disabled={busy} className="flex-1 bg-primary text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"><Check size={15} /> Salvar</button>
              <button onClick={() => setEditProfile(false)} className="px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl flex items-center gap-1"><X size={15} /></button>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Nome</span><span className="font-semibold text-slate-700">{profile?.full_name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">E-mail</span><span className="font-semibold text-slate-700">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">CRP</span><span className="font-semibold text-slate-700">{profile?.crp || '—'}</span></div>
          </div>
        )}
      </Card>

      {/* Segurança */}
      <Card className="p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Segurança</p>

        {/* Trocar senha */}
        {!showPass ? (
          <button onClick={() => setShowPass(true)} className="w-full flex items-center gap-3 py-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><KeyRound size={16} /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-slate-800">Alterar senha</p><p className="text-xs text-slate-400">Defina uma nova senha de acesso</p></div>
            <Pencil size={14} className="text-slate-300" />
          </button>
        ) : (
          <div className="space-y-2.5 py-1">
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="password" value={newPass2} onChange={e => setNewPass2(e.target.value)} placeholder="Confirmar nova senha" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary" />
            <div className="flex gap-2">
              <button onClick={savePassword} disabled={busy || !newPass} className="flex-1 bg-primary text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50">Salvar senha</button>
              <button onClick={() => { setShowPass(false); setNewPass(''); setNewPass2('') }} className="px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-50 my-2" />

        {/* Trocar e-mail */}
        {!showEmail ? (
          <button onClick={() => setShowEmail(true)} className="w-full flex items-center gap-3 py-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><Mail size={16} /></div>
            <div className="flex-1"><p className="text-sm font-semibold text-slate-800">Alterar e-mail</p><p className="text-xs text-slate-400">Requer confirmação no novo endereço</p></div>
            <Pencil size={14} className="text-slate-300" />
          </button>
        ) : (
          <div className="space-y-2.5 py-1">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="novo@email.com" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary" />
            <p className="text-xs text-slate-400">Você receberá um link de confirmação no novo e-mail. O acesso só muda após confirmar.</p>
            <div className="flex gap-2">
              <button onClick={saveEmail} disabled={busy || !newEmail.trim()} className="flex-1 bg-primary text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50">Enviar confirmação</button>
              <button onClick={() => { setShowEmail(false); setNewEmail('') }} className="px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl">Cancelar</button>
            </div>
          </div>
        )}
      </Card>

      {/* Meus Dados (LGPD) */}
      <Card className="p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Meus Dados</p>
        <button onClick={exportMyData} className="w-full flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Package size={16} /></div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Exportar todos os meus dados</p>
            <p className="text-xs text-slate-400">Backup completo em JSON (portabilidade LGPD)</p>
          </div>
          <Download size={16} className="text-slate-300" />
        </button>
      </Card>

      {/* Zona de Perigo */}
      <Card className="p-5 border-red-100">
        <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-3">Zona de Perigo</p>
        {!delOpen ? (
          <button onClick={() => setDelOpen(true)} className="w-full flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Trash2 size={16} /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-600">Excluir minha conta</p>
              <p className="text-xs text-slate-400">Remove permanentemente todos os dados</p>
            </div>
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 leading-relaxed">
                Esta ação é <strong>irreversível</strong>. Todos os seus pacientes, programas, sessões e objetivos
                serão apagados permanentemente. Recomendamos <strong>exportar seus dados antes</strong>.
              </p>
            </div>
            <label className="text-xs font-semibold text-red-700 block mb-1">Digite <strong>EXCLUIR</strong> para confirmar</label>
            <input value={delConfirm} onChange={e => setDelConfirm(e.target.value)} placeholder="EXCLUIR"
              className="w-full border border-red-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400 mb-3" />
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={delConfirm.trim().toUpperCase() !== 'EXCLUIR' || busy}
                className="flex-1 bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-40">
                Excluir permanentemente
              </button>
              <button onClick={() => { setDelOpen(false); setDelConfirm('') }} className="px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl bg-white">Cancelar</button>
            </div>
          </div>
        )}
      </Card>

      {/* Ajuda */}
      <button onClick={() => onNavigate('guide')} className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary py-3">
        <HelpCircle size={16} /> Abrir Guia do Profissional
      </button>
    </div>
  )
}
