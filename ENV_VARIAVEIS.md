# Variáveis de ambiente — Pax Rio Verde

Configure estas variáveis no arquivo `.env.local` (desenvolvimento) e no painel
da Vercel (produção). **Nunca** versione valores reais.

## Supabase (já existentes)

    NEXT_PUBLIC_SUPABASE_URL=...        # URL pública do projeto (ok expor)
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # anon key (projetada para ser pública)
    SUPABASE_URL=...                    # usada no servidor (rotas de API)
    SUPABASE_SERVICE_ROLE_KEY=...       # SECRETA — só no servidor, nunca com prefixo NEXT_PUBLIC_

## Autenticação do painel admin (já existentes)

    ADMIN_USERNAME=...
    ADMIN_PASSWORD=...
    ADMIN_SESSION_SECRET=...            # segredo forte e aleatório para assinar a sessão

## Rate limiting — Upstash Redis (NOVO)

Opcional, mas recomendado em produção. Se NÃO configurar, o rate limit cai
automaticamente para um contador em memória (por instância, menos robusto).

    UPSTASH_REDIS_REST_URL=...          # do painel do Upstash (Redis > REST API)
    UPSTASH_REDIS_REST_TOKEN=...        # do painel do Upstash (Redis > REST API)

### Como obter

1. Crie uma conta gratuita em https://upstash.com
2. Crie um banco Redis (região próxima da sua Vercel).
3. Na página do banco, seção "REST API", copie a URL e o TOKEN.
4. Cole os dois valores no `.env.local` e nas Environment Variables da Vercel.

O plano gratuito do Upstash costuma cobrir folgado o volume de um site de aceites.
