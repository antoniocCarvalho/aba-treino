-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO — Supervisão BCBA / RBT
-- Execute no SQL Editor do Supabase. É ADITIVO: não altera nem remove as
-- políticas existentes; apenas amplia o acesso para o fluxo de supervisão.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Perfis: papel, e-mail e vínculo de supervisão ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'bcba'
  CHECK (role IN ('bcba', 'rbt'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS supervisor_id UUID
  REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_supervisor ON public.profiles(supervisor_id);

-- Preenche e-mail dos perfis já existentes a partir de auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email = '';

-- ─── 2. Sessões: campos de revisão clínica ──────────────────────────────────
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS reviewed_by UUID
  REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS supervisor_notes TEXT NOT NULL DEFAULT '';

-- ─── 3. Trigger de novo usuário: salvar e-mail e papel ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, crp, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'crp', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'bcba')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── 4. Função auxiliar: o usuário atual supervisiona o dono X? ──────────────
-- SECURITY DEFINER ignora RLS internamente, evitando recursão de políticas.
CREATE OR REPLACE FUNCTION public.is_supervisor_of(target UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target AND supervisor_id = auth.uid()
  );
$$;

-- ─── 5. Função para um RBT vincular seu supervisor por e-mail ────────────────
-- Retorna o nome do supervisor em caso de sucesso, ou NULL se não encontrado.
CREATE OR REPLACE FUNCTION public.link_supervisor(supervisor_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sup_id   UUID;
  sup_name TEXT;
BEGIN
  SELECT id, full_name INTO sup_id, sup_name
  FROM public.profiles
  WHERE lower(email) = lower(trim(supervisor_email))
    AND id <> auth.uid()
  LIMIT 1;

  IF sup_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
  SET supervisor_id = sup_id, role = 'rbt'
  WHERE id = auth.uid();

  RETURN COALESCE(NULLIF(sup_name, ''), supervisor_email);
END;
$$;

-- ─── 6. Políticas ADITIVAS de supervisão ────────────────────────────────────
-- (RLS é permissivo: estas políticas se SOMAM às de "dados próprios")

-- Supervisor pode LER sessões dos supervisionados
DROP POLICY IF EXISTS "sessions_select_supervisor" ON public.sessions;
CREATE POLICY "sessions_select_supervisor" ON public.sessions
  FOR SELECT USING (public.is_supervisor_of(psychologist_id));

-- Supervisor pode ATUALIZAR (marcar revisão + notas) sessões dos supervisionados
DROP POLICY IF EXISTS "sessions_update_supervisor" ON public.sessions;
CREATE POLICY "sessions_update_supervisor" ON public.sessions
  FOR UPDATE USING (public.is_supervisor_of(psychologist_id))
  WITH CHECK (public.is_supervisor_of(psychologist_id));

-- Supervisor pode LER pacientes e programas dos supervisionados (para nomes)
DROP POLICY IF EXISTS "patients_select_supervisor" ON public.patients;
CREATE POLICY "patients_select_supervisor" ON public.patients
  FOR SELECT USING (public.is_supervisor_of(psychologist_id));

DROP POLICY IF EXISTS "programs_select_supervisor" ON public.programs;
CREATE POLICY "programs_select_supervisor" ON public.programs
  FOR SELECT USING (public.is_supervisor_of(psychologist_id));

-- Supervisor pode LER os perfis dos supervisionados (para listar a equipe)
DROP POLICY IF EXISTS "profiles_select_supervisees" ON public.profiles;
CREATE POLICY "profiles_select_supervisees" ON public.profiles
  FOR SELECT USING (supervisor_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação:
-- SELECT id, full_name, role, email, supervisor_id FROM public.profiles;
-- ═══════════════════════════════════════════════════════════════════════════
