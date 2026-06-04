-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO — Onda 2: Análise de Tarefa e Registro por Intervalo
-- Estende os tipos de coleta aceitos. Execute no SQL Editor do Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- Remove a restrição antiga de collection_type e recria com os novos tipos
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_collection_type_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_collection_type_check
  CHECK (collection_type IN ('dtt', 'frequency', 'duration', 'abc', 'task_analysis', 'interval'));

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.sessions'::regclass AND conname LIKE '%collection_type%';
-- ═══════════════════════════════════════════════════════════════════════════
