-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO — Plano de Tratamento (objetivos terapêuticos)
-- Execute no SQL Editor do Supabase. Aditivo e seguro.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.treatment_goals (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  psychologist_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id       UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  domain           TEXT        NOT NULL DEFAULT 'comunicacao',
  description      TEXT        NOT NULL DEFAULT '',
  term             TEXT        NOT NULL DEFAULT 'short' CHECK (term IN ('short', 'long')),
  target_date      DATE,
  status           TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'achieved', 'discontinued')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_patient ON public.treatment_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_goals_psychologist ON public.treatment_goals(psychologist_id);

ALTER TABLE public.treatment_goals ENABLE ROW LEVEL SECURITY;

-- CRUD pelo dono
DROP POLICY IF EXISTS "goals_crud_own" ON public.treatment_goals;
CREATE POLICY "goals_crud_own" ON public.treatment_goals
  FOR ALL
  USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

-- Leitura pelo supervisor (requer a migração de supervisão já aplicada)
DROP POLICY IF EXISTS "goals_select_supervisor" ON public.treatment_goals;
CREATE POLICY "goals_select_supervisor" ON public.treatment_goals
  FOR SELECT USING (public.is_supervisor_of(psychologist_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação: SELECT * FROM public.treatment_goals;
-- ═══════════════════════════════════════════════════════════════════════════
