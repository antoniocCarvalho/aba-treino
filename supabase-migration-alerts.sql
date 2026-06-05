-- ─────────────────────────────────────────────────────────────────────────────
-- Alertas por e-mail: flag de preferência + controle de envio
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Flag de preferência no perfil do profissional
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN NOT NULL DEFAULT false;

-- Controle de envio para evitar e-mails duplicados no mesmo agendamento
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMPTZ;
