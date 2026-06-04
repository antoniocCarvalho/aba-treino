-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO — Portal para Pais (link de progresso compartilhável)
-- O psicólogo gera um link; o responsável abre sem login e vê um resumo
-- read-only do progresso. Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.share_links (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token            TEXT        NOT NULL UNIQUE,
  psychologist_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id       UUID        NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  revoked          BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_share_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_patient ON public.share_links(patient_id);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- O psicólogo gerencia apenas os próprios links
DROP POLICY IF EXISTS "share_crud_own" ON public.share_links;
CREATE POLICY "share_crud_own" ON public.share_links
  FOR ALL
  USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

-- ─── RPC pública: progresso a partir de um token válido ─────────────────────
-- SECURITY DEFINER → ignora RLS internamente, mas só retorna dados se o token
-- existir, não estiver revogado e não tiver expirado. Não expõe observações
-- clínicas nem notas de supervisão — apenas nome, programas e taxas.
CREATE OR REPLACE FUNCTION public.get_shared_progress(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link   RECORD;
  result JSONB;
BEGIN
  SELECT * INTO link
  FROM public.share_links
  WHERE token = p_token
    AND NOT revoked
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'patient', (SELECT name FROM public.patients WHERE id = link.patient_id),
    'generatedAt', NOW(),
    'programs', COALESCE((
      SELECT jsonb_agg(prog ORDER BY prog->>'name')
      FROM (
        SELECT jsonb_build_object(
          'name', pr.name,
          'criterion', pr.criterion,
          'sessions', COALESCE((
            SELECT jsonb_agg(
                     jsonb_build_object('date', s.session_date, 'rate', s.rate, 'collectionType', s.collection_type)
                     ORDER BY s.session_date
                   )
            FROM public.sessions s
            WHERE s.program_id = pr.id
          ), '[]'::jsonb)
        ) AS prog
        FROM public.programs pr
        WHERE pr.patient_id = link.patient_id
      ) q
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- Disponível para usuários anônimos (o responsável) e autenticados
REVOKE ALL ON FUNCTION public.get_shared_progress(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_progress(TEXT) TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação: SELECT public.get_shared_progress('token_invalido');  -- deve dar NULL
-- ═══════════════════════════════════════════════════════════════════════════
