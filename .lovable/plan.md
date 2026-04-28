## Análise — o que é real, o que pode ser ignorado

Analisei cada aviso, conferi o código que usa cada coisa e o impacto real. Resumo antes do plano:

| # | Aviso | Importante? | Risco real |
|---|-------|-------------|------------|
| 1 | Stripe IDs visíveis ao dono da compra | **Sim, fácil** | Baixo, mas trivial corrigir. Frontend nunca lê esses campos. |
| 2 | Rate limit em memória no `send-email` | **Sim, médio** | Real — atacante pode spammar reset de senha de qualquer email. |
| 3 | Moderador pode virar owner por brecha de RLS | **Sim, alto** | Confirmado: as 2 policies `UPDATE` são PERMISSIVE (OR). Mod passa no USING da policy "membro" e no WITH CHECK da policy "mod" → escala para owner. |
| 4 | Funções SECURITY DEFINER acessíveis ao `anon` | **Parcial** | 5 funções: 4 são intencionais (preview público de salas). 1 (`stop_time_entry`) NÃO deve ser anon. |

Nenhuma correção quebra fluxo existente — todas as queries do frontend continuam funcionando.

---

## Plano de correção (1 migration única)

### Fix 1 — `streak_freeze_purchases`: esconder Stripe IDs do cliente

Verifiquei: **nenhum código frontend lê `stripe_session_id` nem `stripe_payment_intent`**. Só o webhook (service-role) e admin-users (service-role) escrevem/leem.

Trocar a policy SELECT para excluir essas colunas via REVOKE de coluna:
```sql
REVOKE SELECT (stripe_session_id, stripe_payment_intent) 
  ON public.streak_freeze_purchases FROM authenticated, anon;
```
Usuário continua vendo `quantity`, `freezes_added`, `amount_cents`, `currency`, `created_at`. Nada quebra.

### Fix 2 — `send-email`: rate limit persistente

Substituir o `Map` em memória por uma tabela:
```sql
CREATE TABLE public.email_rate_limits (
  email text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 0
);
ALTER TABLE public.email_rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem policies: só service-role (edge function) acessa.
```

Atualizar `supabase/functions/send-email/index.ts` para usar a tabela com upsert atômico (mantém limite 3/10min, mas global em todas as instâncias). Validar formato do email antes de gerar link. Não muda fluxo do usuário.

### Fix 3 — `room_members`: bloquear escalação de moderador

A brecha é real porque as 2 policies UPDATE são PERMISSIVE (OR). Solução cirúrgica: adicionar policy **RESTRICTIVE** que bloqueia qualquer UPDATE em que `role` mude para `'owner'` ou que o owner seja rebaixado, exceto pelo próprio dono via função.

```sql
CREATE POLICY "Block role escalation to owner"
ON public.room_members
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (
  role = get_member_current_role(id)  -- role inalterada
  OR (
    -- mudanças de role permitidas só por owner, e nunca para 'owner'
    is_room_owner(auth.uid(), room_id)
    AND role IN ('member','moderator')
    AND user_id <> auth.uid()
  )
);
```

Como é RESTRICTIVE, vale junto com as PERMISSIVE existentes (AND). Isso preserva o fluxo atual (mods podem mutar/kickar — não mexe em role; owners promovem via `set_member_role` RPC) e fecha a brecha de auto-promoção. Verifiquei: o frontend só faz `update({ notifications_enabled })` — esse caso passa pela primeira condição.

### Fix 4 — Revogar `stop_time_entry` do `anon`

Funções `SECURITY DEFINER` acessíveis a `anon` (visitante não logado):
- `find_room_by_invite_code`, `get_public_rooms_ranking`, `get_public_rooms_ranking_by_period`, `get_room_public_preview` → **intencionais** (página pública de explorar / preview de sala). Mantém.
- `stop_time_entry` → **não deveria** ser anon (criada na última migration). Função já valida `auth.uid() IS NULL`, mas é boa prática revogar.

```sql
REVOKE EXECUTE ON FUNCTION public.stop_time_entry(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.stop_time_entry(uuid) TO authenticated;
```

Não quebra nada — só usuário logado já chamava.

---

## Avisos que vou IGNORAR (justificativa)

- **`SUPA_authenticated_security_definer_function_executable`**: as funções SECURITY DEFINER chamáveis por `authenticated` são todas intencionais (RPCs do app: `join_public_room`, `consume_streak_freeze`, etc). É padrão da arquitetura.
- **`SUPA_auth_leaked_password_protection`**: precisa ser ativado pelo usuário no painel do Supabase (Auth → Password Protection). Não dá pra fazer via migration. Vou só lembrar o usuário.
- **`SUPA_public_bucket_allows_listing`** (avatars): bucket público de avatares — listing é esperado. Pode ignorar OU adicionar policy mais estrita depois.
- **`REALTIME_TOPIC_SCOPE_BYPASS`**: o app usa Postgres Changes (não Broadcast) nessas tabelas, então as RLS SELECT já protegem. Não é vulnerabilidade real.
- **`INFO_LEAKAGE` (raw errors em edge functions)**: nível `info`. Pode-se sanear depois; não bloqueia segurança.

---

## Entregáveis

1. **1 migration** com: REVOKE de colunas, criação da tabela `email_rate_limits`, policy RESTRICTIVE em `room_members`, REVOKE de `stop_time_entry` para anon.
2. **Edit** em `supabase/functions/send-email/index.ts` para usar tabela em vez de Map.
3. **Marcar** os 4 findings como fixed (e ignorar os outros com justificativa) no painel de segurança.

Nenhuma mudança no frontend é necessária.
