import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp } from 'lucide-react'

export function AuthPage() {
  const [view, setView] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', crp: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (error) setError(translateError(error.message))
    setBusy(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name, crp: form.crp } } })
    if (error) setError(translateError(error.message))
    else { setView('login'); setError('') }
    setBusy(false)
  }

  function translateError(msg: string) {
    if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) return 'E-mail ou senha inválidos.'
    if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.'
    if (msg.includes('is invalid') || msg.includes('Unable to validate')) return 'E-mail inválido ou domínio não aceito.'
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
    return msg
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <TrendingUp size={30} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Evolvy</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Plataforma ABA profissional</p>
          <p className="text-slate-500 mt-3 text-sm">{view === 'login' ? 'Entre com sua conta' : 'Criar conta profissional'}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-modal p-8">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-5">{error}</div>}

          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {view === 'register' && (
              <>
                <Field label="Nome Completo" type="text" value={form.name} onChange={update('name')} placeholder="Dr. João Silva" required />
                <Field label="CRP (opcional)" type="text" value={form.crp} onChange={update('crp')} placeholder="06/123456" />
              </>
            )}
            <Field label="E-mail" type="email" value={form.email} onChange={update('email')} placeholder="seu@email.com" required autoComplete="email" />
            <Field label="Senha" type="password" value={form.password} onChange={update('password')} placeholder={view === 'register' ? 'Mínimo 6 caracteres' : 'Sua senha'} required minLength={view === 'register' ? 6 : 1} autoComplete="current-password" />
            {view === 'register' && (
              <Field label="Confirmar Senha" type="password" value={form.confirm} onChange={update('confirm')} placeholder="Repita a senha" required minLength={6} />
            )}
            <button type="submit" disabled={busy} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl mt-2 hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {busy ? 'Aguarde…' : view === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {view === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError('') }} className="text-primary font-semibold hover:underline">
              {view === 'login' ? 'Criar conta' : 'Fazer login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input {...rest} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all" />
    </div>
  )
}
