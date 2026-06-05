-- ─────────────────────────────────────────────────────────────────────────────
-- Onda 4 + 5: Avaliação de Preferência + Agenda de Sessões
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Onda 4: Itens de preferência (reforçadores) ───────────────────────────────
CREATE TABLE IF NOT EXISTS preference_items (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id  UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id       UUID         REFERENCES patients(id)   ON DELETE CASCADE NOT NULL,
  name             TEXT         NOT NULL,
  category         TEXT         NOT NULL DEFAULT 'outro'
    CHECK (category IN ('comida','brinquedo','atividade','social','outro')),
  rank             INTEGER      NOT NULL DEFAULT 3 CHECK (rank BETWEEN 1 AND 5),
  notes            TEXT         NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE preference_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pref_own" ON preference_items
  USING  (psychologist_id = auth.uid())
  WITH CHECK (psychologist_id = auth.uid());

-- ── Onda 5: Agenda de Sessões ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id  UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id       UUID         REFERENCES patients(id)   ON DELETE SET NULL,
  patient_name     TEXT         NOT NULL DEFAULT '',
  title            TEXT         NOT NULL DEFAULT '',
  scheduled_at     TIMESTAMPTZ  NOT NULL,
  duration_min     INTEGER      NOT NULL DEFAULT 60,
  notes            TEXT         NOT NULL DEFAULT '',
  status           TEXT         NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','completed','cancelled','missed')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_own" ON appointments
  USING  (psychologist_id = auth.uid())
  WITH CHECK (psychologist_id = auth.uid());

-- Índice para queries por data (agenda semanal)
CREATE INDEX IF NOT EXISTS appointments_scheduled_idx
  ON appointments (psychologist_id, scheduled_at);
