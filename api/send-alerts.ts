import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Envia alertas de sessão por e-mail ao usuário.
// Chamada pelo cliente (App.tsx) ao abrir o app, com o JWT no header.
//
// Variáveis de ambiente necessárias na Vercel:
//   SUPABASE_SERVICE_ROLE_KEY  → Supabase Dashboard → Settings → API → service_role
//   GMAIL_USER                 → e-mail remetente (ex: ca727707@gmail.com)
//   GMAIL_APP_PASSWORD         → Senha de app do Google (myaccount.google.com →
//                                Segurança → Senhas de app)
// ─────────────────────────────────────────────────────────────────────────────

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // ── Autenticação via JWT do cliente ──────────────────────────────────────
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente' })
  const token = auth.slice(7)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const gmailUser   = process.env.GMAIL_USER
  const gmailPass   = process.env.GMAIL_APP_PASSWORD

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Servidor sem configuração do Supabase' })
  }
  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ error: 'Servidor sem configuração do Gmail (GMAIL_USER / GMAIL_APP_PASSWORD)' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // Verifica o JWT e obtém o usuário
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return res.status(401).json({ error: 'Token inválido' })

  // ── Verifica se alertas estão habilitados ────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_alerts_enabled, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.email_alerts_enabled) {
    return res.status(200).json({ skipped: true, reason: 'alertas desativados' })
  }

  // ── Busca agendamentos nas próximas 2 horas ainda não notificados ─────────
  const now   = new Date()
  const in2h  = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, patient_name, scheduled_at, duration_min, alert_sent_at')
    .eq('psychologist_id', user.id)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in2h.toISOString())
    .is('alert_sent_at', null)   // ainda não notificado

  const toNotify = appointments ?? []
  if (!toNotify.length) return res.status(200).json({ sent: 0 })

  // ── Configura transporte Gmail ────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  })

  let sent = 0

  for (const appt of toNotify) {
    const apptTime = new Date(appt.scheduled_at)
    const diffMin  = Math.ceil((apptTime.getTime() - now.getTime()) / 60_000)
    const timeStr  = apptTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const dateStr  = apptTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    const name     = profile.full_name || user.email || 'Profissional'

    const label = diffMin <= 1
      ? 'em menos de 1 minuto'
      : diffMin < 60
      ? `em ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`
      : `às ${timeStr}`

    const urgency = diffMin <= 10 ? '#EF4444' : diffMin <= 20 ? '#F59E0B' : '#0D9488'

    try {
      await transporter.sendMail({
        from: `Evolvy <${gmailUser}>`,
        to: user.email,
        subject: `⏰ Sessão com ${appt.patient_name} ${label}`,
        html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0FDFA;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:#0D9488;padding:24px 28px;display:flex;align-items:center;gap:12px">
      <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">📈</div>
      <div>
        <div style="color:#ffffff;font-size:18px;font-weight:900;letter-spacing:-0.5px">Evolvy</div>
        <div style="color:rgba(255,255,255,0.75);font-size:12px">Plataforma ABA</div>
      </div>
    </div>

    <!-- Alerta -->
    <div style="padding:28px">
      <p style="margin:0 0 4px;font-size:13px;color:#64748B">Olá, ${name}</p>
      <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#0F172A;line-height:1.2">
        Você tem uma sessão <span style="color:${urgency}">${label}</span>
      </h1>

      <!-- Card da sessão -->
      <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:16px;padding:18px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;background:${urgency}18;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:${urgency}">
            ${appt.patient_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#0F172A">${appt.patient_name}</div>
            <div style="font-size:12px;color:#64748B;margin-top:2px">${dateStr} · ${timeStr} · ${appt.duration_min}min</div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px">
        <a href="${supabaseUrl.replace('supabase.co', 'vercel.app') || 'https://evolvy.app'}"
           style="display:inline-block;background:#0D9488;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none">
          Abrir Evolvy
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #F1F5F9;text-align:center">
      <p style="margin:0;font-size:11px;color:#94A3B8">
        Você recebeu este alerta pois ativou notificações por e-mail no Evolvy.<br>
        Para desativar, acesse Configurações → Notificações.
      </p>
    </div>
  </div>
</body>
</html>`,
      })

      // Marca como notificado
      await supabase
        .from('appointments')
        .update({ alert_sent_at: now.toISOString() })
        .eq('id', appt.id)

      sent++
    } catch (e) {
      console.error(`Falha ao enviar alerta para ${appt.patient_name}:`, e)
    }
  }

  return res.status(200).json({ sent })
}
