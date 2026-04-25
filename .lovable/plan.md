## Goal

Permitir que o **admin master** conceda defensivas (streak freezes) gratuitamente para qualquer usuário, com o mesmo comportamento da compra via Stripe — créditos acumulam no saldo e só são consumidos quando o usuário perde a sequência.

## Como funcionará

A função SQL `credit_purchased_freezes(_user_id, _amount)` **já existe** e faz exatamente o necessário: incrementa `balance` e `total_purchased` na tabela `purchased_streak_freezes`, criando o registro se não existir. Os créditos ficam acumulados indefinidamente e são consumidos pela função `consume_streak_freeze` (mesma lógica usada hoje para defensivas compradas).

Vamos apenas expor essa função para o admin master, sem cobrança.

## Mudanças técnicas

### 1. Edge function `admin-users` — nova ação `grant_streak_freezes`

Recebe `{ user_id, amount, reason? }`, valida (1–365), chama:
```ts
await supabaseAdmin.rpc("credit_purchased_freezes", { _user_id: user_id, _amount: amount });
```
Registra em `streak_freeze_purchases` uma linha de auditoria com `currency = 'admin_grant'`, `amount_cents = 0`, `stripe_session_id = 'admin-grant-{timestamp}-{callerId}'` e `quantity = freezes_added = amount`. Isso mantém o histórico rastreável sem alterar o esquema.

### 2. Hook `useAdmin` — nova mutation `useGrantStreakFreezes`

Mutation que invoca `admin-users` com `action: "grant_streak_freezes"` e invalida `["admin-user-details", userId]`.

### 3. UI — `UserDetailDrawer.tsx`

Adicionar nova seção "Defensivas (Admin)" com:
- Saldo atual (já obtido se incluirmos no `get_user_details`).
- Input numérico (quantidade) + textarea opcional (motivo).
- Botão "Conceder defensivas" com confirmação.
- Toast de sucesso + atualização do saldo.

Ampliar `get_user_details` na edge function para incluir `purchased_freezes` (balance, total_purchased, total_used) e as últimas 5 linhas de `streak_freeze_purchases` (histórico, mostrando se foi compra Stripe ou concessão admin).

### 4. i18n

Adicionar chaves em `pt-BR.json` e `en-US.json`:
- `admin.streak_freezes.title`, `.balance`, `.grant`, `.amount`, `.reason`, `.granted_success`, `.history`, `.source_stripe`, `.source_admin`.

## Segurança

- Apenas admins (verificação já existente via `requireAdmin` no início da edge function) podem chamar `grant_streak_freezes`.
- Limite máximo por concessão: 365 defensivas (proteção contra erros de digitação).
- Auditoria completa via `streak_freeze_purchases`.

## Arquivos afetados

- `supabase/functions/admin-users/index.ts` — nova case `grant_streak_freezes` + enriquecer `get_user_details`.
- `src/hooks/useAdmin.ts` — nova mutation.
- `src/components/admin/UserDetailDrawer.tsx` — nova seção UI.
- `src/i18n/locales/pt-BR.json` e `en-US.json` — novas chaves.

Sem necessidade de migração de banco — toda a infraestrutura SQL já existe.