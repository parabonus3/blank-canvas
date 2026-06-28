## Problema

A seção "Missões de Defensiva" aparece de forma intermitente porque o RPC `get_freeze_missions_progress` retorna **HTTP 400** com o erro do Postgres:

```
column reference "mission_type" is ambiguous
```

Confirmei isso nos logs do Postgres — toda chamada feita pelo `useFreezeMissions` está falhando. Quando o React Query tem o cache antigo válido, o card aparece; quando não tem, fica oculto. Daí o "às vezes sim, às vezes não".

### Causa raiz

Dentro da função `get_freeze_missions_progress`, os parâmetros `OUT` da `RETURNS TABLE(mission_type text, period_key text, ...)` colidem com as colunas reais da tabela `freeze_missions` dentro dos subqueries `EXISTS(...)`:

```sql
EXISTS(SELECT 1 FROM public.freeze_missions
       WHERE user_id=v_user
         AND mission_type='weekly_bronze'     -- ambíguo: OUT vs coluna
         AND period_key=v_week_key)            -- ambíguo: OUT vs coluna
```

O Postgres não consegue resolver se `mission_type`/`period_key` referem-se à coluna da tabela ou ao parâmetro de saída da função, então aborta com 42702 — devolvido como 400 pelo PostgREST.

## Correção

Migration única, cirúrgica, sem alterar assinatura, retorno, grants nem comportamento:

1. `CREATE OR REPLACE FUNCTION public.get_freeze_missions_progress()` reescrevendo apenas os três blocos `EXISTS(...)` para qualificar as colunas com alias da tabela:

```sql
EXISTS(SELECT 1 FROM public.freeze_missions fm
       WHERE fm.user_id = v_user
         AND fm.mission_type = 'weekly_bronze'
         AND fm.period_key  = v_week_key)
```

(e o equivalente para `weekly_gold` e `monthly_legendary`).

Tudo o resto — timezone do perfil, janelas semanais/mensais, cálculo de bronze/gold/legendary, valores retornados — permanece idêntico.

## Por que isso não quebra nada

- Mesma assinatura (`RETURNS TABLE(...)`) → tipos gerados em `src/integrations/supabase/types.ts` continuam válidos.
- Mesmos grants (`EXECUTE TO PUBLIC` já existente é preservado pelo `CREATE OR REPLACE`).
- Nenhuma mudança em tabelas, RLS, triggers ou `check_and_grant_freeze_missions`.
- Frontend (`useFreezeMissions.ts`, `FreezeMissionsCard.tsx`) não muda.

## Resultado esperado

Após a migration, o RPC volta a responder 200 com as 3 linhas (bronze/gold/legendary) e o card "Missões de Defensiva" aparece de forma consistente em todos os carregamentos da página Conquistas.
