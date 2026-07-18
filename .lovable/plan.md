
## Diagnóstico (verificado no banco e no código)

- A coluna `profiles.trial_ends_at` existe com default `now() + 3 days` e `handle_new_user` cria o perfil sem tocar nesse campo — ou seja, todo novo usuário já ganha `trial_ends_at` correto.
- **Porém o trial nunca é aplicado na prática:**
  - `SubscriptionContext` só olha para a assinatura Stripe. Nunca lê `trial_ends_at`, então o usuário em trial aparece como `free`.
  - `check-subscription` sobrescreve `plan_tier` para `'free'` sempre que não há sub ativa no Stripe, ignorando o trial.
- `TrialBanner` está vazio (`return null`).
- Limites free hoje: 3 projetos (`Projects.tsx:45`), `FREE_GOALS_LIMIT=3`, `FREE_CATEGORIES_LIMIT=3`. Não há bloqueio para itens já criados quando o usuário volta pro free — precisa ser adicionado.

Objetivo: garantir 3 dias de premium ao criar conta e, ao expirar, voltar ao free **sem apagar dados**, mostrando cadeado nos itens excedentes e impedindo timer neles.

## Mudanças

### 1. Trial ativo (backend)
- Migração: reforçar `handle_new_user` para setar explicitamente `trial_ends_at = now() + interval '3 days'` (garante consistência mesmo se o default mudar). Não altera perfis existentes.
- `supabase/functions/check-subscription/index.ts`: ao não encontrar sub Stripe ativa, buscar `trial_ends_at` do perfil. Se `trial_ends_at > now()`, **não** rebaixar `plan_tier` para `free`; deixar `plan_tier = 'premium'` e retornar `trial_active: true, trial_ends_at`. Se já expirou, downgrade para `free` como hoje. Assinaturas pagas sempre têm precedência sobre trial.

### 2. `SubscriptionContext` (frontend)
- Adicionar campos: `isTrial: boolean`, `trialEndsAt: string | null`, `trialDaysLeft: number`.
- Buscar `trial_ends_at` do perfil junto com `check-subscription`.
- Regra de tier efetivo:
  1. Se Stripe sub ativa → tier do produto.
  2. Senão, se `trial_ends_at > now()` → `tier = 'premium'`, `isTrial=true`.
  3. Senão → `tier = 'free'`.
- Manter `FALLBACK_SUBSCRIPTION` compatível.

### 3. Banner de trial
- Reescrever `src/components/TrialBanner.tsx` para mostrar "Seu trial Premium termina em X dias — assinar" quando `isTrial=true`. Botão leva para `/pricing`. Nada é exibido para free puro nem pagos.
- Adicionar strings i18n nos 12 locales (`trial.banner_days_left`, `trial.upgrade_cta`).

### 4. Bloqueio suave após expirar (projetos, categorias, metas)
Novo helper `src/hooks/useFreeLocks.ts` que:
- Recebe uma lista ordenada por `created_at asc`.
- Retorna `Set<id>` dos itens **acima** do limite free (`>3` para projetos/categorias/metas), somente quando `tier === 'free'` (não em trial).
- Também expõe `isLocked(id)` helper.

Aplicar em:
- `src/pages/Projects.tsx`: renderizar projetos e categorias bloqueados com ícone de cadeado, opacidade reduzida, badge "Renove para usar". Editar/excluir permitido; criar novo bloqueado como hoje.
- `src/components/ProjectPicker.tsx`: marcar projetos bloqueados como `disabled` no Select, com ícone de cadeado e texto "(bloqueado — renove)".
- `src/pages/Goals.tsx` / `GoalCard`: idem para metas e categorias de vida acima do limite.

### 5. Impedir contabilizar tempo em item bloqueado
- Em `useTimeEntries.createTimeEntry` (e no ponto onde o timer inicia no `TimerContext`), validar: se `project_id` está no set de bloqueados, abortar com toast "Este projeto está bloqueado. Renove o Premium para voltar a usar." Não afeta timers sem projeto.
- Salvaguarda no servidor: trigger `enforce_free_project_lock` em `time_entries` que rejeita insert quando `plan_tier='free'`, `trial_ends_at < now()` e o projeto não está entre os 3 mais antigos do usuário. Mensagem clara para o cliente exibir.

### 6. Reativar imediatamente ao voltar pro premium
- Nada extra: como o bloqueio é derivado de `tier`, ao Stripe ativar sub e `check-subscription` atualizar `plan_tier`, o `useFreeLocks` devolve set vazio → tudo destravado automaticamente. Trigger idem.

### 7. Testes manuais (após implementação)
- Criar conta nova → verificar tier=premium, banner com 3 dias, acesso a criar >3 projetos.
- Forçar `trial_ends_at = now() - '1 day'` em conta de teste, rodar `check-subscription` → tier vira free, projetos 4+ ficam com cadeado, timer neles bloqueado, itens ≤3 continuam funcionando.
- Assinar plano → cadeados somem, tudo volta.

## Detalhes técnicos

- Nenhum dado é apagado; o bloqueio é puramente de UI + trigger de insert.
- Ordem para decidir o que fica desbloqueado: `created_at ASC` (3 mais antigos preservados). Alternativa "mais recentes" é pior porque quebra hábitos já em andamento — mantemos os antigos.
- `handle_new_user` é `SECURITY DEFINER`; a alteração é additiva e não muda RLS.
- `enforce_profile_update_scope` já bloqueia usuários comuns de alterar `trial_ends_at`, então trial não pode ser estendido pelo cliente.
- `check-subscription` continua idempotente e seguro para retry.
