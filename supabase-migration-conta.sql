-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO — Conta: avatar personalizado e exclusão de conta
-- Execute no SQL Editor do Supabase. Aditivo e seguro.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Avatar do perfil (imagem em base64, já redimensionada no cliente) ────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';

-- ─── 2. Exclusão da própria conta ───────────────────────────────────────────
-- Apaga o usuário em auth.users; o ON DELETE CASCADE em profiles remove o
-- perfil, e este (também em cascata) remove patients → programs → sessions →
-- treatment_goals. Tudo em uma transação.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só permite excluir a própria conta do usuário autenticado
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Apenas usuários autenticados podem executar; nunca anônimos
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url';
-- ═══════════════════════════════════════════════════════════════════════════
