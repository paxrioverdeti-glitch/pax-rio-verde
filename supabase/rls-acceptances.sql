-- ============================================================================
-- Pax Rio Verde — Blindagem da tabela de aceites (RLS)
-- ----------------------------------------------------------------------------
-- Rode este script UMA VEZ no Supabase: painel do projeto -> SQL Editor ->
-- cole tudo -> Run.
--
-- O que ele faz, em linguagem simples:
--   1. Liga a "trava de linha" (Row Level Security) na tabela de aceites.
--   2. NÃO cria nenhuma permissão de leitura para o público (anon) nem para
--      usuários logados comuns. Resultado: a chave pública que fica no
--      navegador (anon key) passa a ler ZERO linhas desta tabela.
--   3. O seu site continua funcionando normalmente, porque:
--        - a rota pública /api/acceptances grava usando a service_role key,
--        - a rota /api/admin/acceptances lê usando a service_role key,
--      e a service_role IGNORA o RLS por design (é a chave de servidor).
--
-- Em resumo: ninguém lê a base pelo navegador; só o seu servidor lê.
-- É seguro rodar mais de uma vez (idempotente).
-- ============================================================================

-- 1) Liga o RLS. A partir daqui, sem policy = sem acesso para anon/authenticated.
ALTER TABLE public.acceptances ENABLE ROW LEVEL SECURITY;

-- 2) Garante que não sobrou nenhuma policy antiga liberando leitura/escrita.
--    (Se você nunca criou policies, estes DROPs simplesmente não fazem nada.)
DROP POLICY IF EXISTS "acceptances_select_public"    ON public.acceptances;
DROP POLICY IF EXISTS "acceptances_select_anon"       ON public.acceptances;
DROP POLICY IF EXISTS "acceptances_insert_public"     ON public.acceptances;
DROP POLICY IF EXISTS "acceptances_insert_anon"       ON public.acceptances;
DROP POLICY IF EXISTS "acceptances_all"               ON public.acceptances;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.acceptances;

-- 3) (Opcional, mas recomendado) FORCE o RLS até para o dono da tabela,
--    de modo que nem uma consulta rodada como "postgres" no editor leia
--    sem querer. A service_role continua passando porque ela faz BYPASS,
--    não é afetada pelo FORCE.
ALTER TABLE public.acceptances FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICAÇÃO (rode depois e confira o resultado):
--
--   -- Deve retornar rowsecurity = true
--   SELECT relname, relrowsecurity, relforcerowsecurity
--   FROM pg_class WHERE relname = 'acceptances';
--
--   -- Deve retornar NENHUMA linha (nenhuma policy de leitura para o público)
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE tablename = 'acceptances';
--
-- TESTE DE ATAQUE (faça no navegador, no site publicado, console do DevTools):
--   const { createClient } = supabase; // se o client estiver exposto
--   // ou use a anon key do bundle e tente:
--   //   supabase.from('acceptances').select('*')
--   // Depois deste script, deve voltar [] (vazio) ou erro de permissão.
-- ============================================================================
