-- ============================================================================
-- Pax Rio Verde — Trilha de auditoria dos aceites (Opção C)
-- ----------------------------------------------------------------------------
-- Rode UMA VEZ no Supabase: SQL Editor -> cole tudo -> Run.
--
-- O que faz, em linguagem simples:
--   1. Adiciona colunas que registram COMO/DE ONDE cada aceite foi feito
--      (IP e navegador), para que o aceite seja defensável e rastreável
--      (importante para LGPD e em caso de contestação do cliente).
--   2. Garante que o mesmo CPF não gere dois registros (CPF único).
--
-- É seguro rodar mais de uma vez (idempotente).
-- ============================================================================

-- 1) Colunas de auditoria (criadas só se ainda não existirem).
ALTER TABLE public.acceptances
  ADD COLUMN IF NOT EXISTS ip         text,
  ADD COLUMN IF NOT EXISTS user_agent text;

-- 2) CPF único: impede aceites duplicados para o mesmo CPF.
--    (O código já trata o erro 23505 como "ok" silencioso.)
--    Criamos o índice único só se ainda não houver uma constraint/índice de CPF.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'acceptances'
      AND indexdef ILIKE '%(cpf)%'
      AND indexdef ILIKE '%UNIQUE%'
  ) THEN
    CREATE UNIQUE INDEX acceptances_cpf_unique ON public.acceptances (cpf);
  END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO (rode depois):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'acceptances';
--   -- deve listar: id, name, cpf, phone, accepted_at, ip, user_agent (e afins)
-- ============================================================================
