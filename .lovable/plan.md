

# Plano: Comprar Defensivas via Stripe (3 por $1)

## Visão geral

Adicionar uma compra avulsa (one-off, sem assinatura) de **pacote de 3 defensivas por $1**, processada via Stripe Checkout. As defensivas compradas vão para um **saldo permanente**, separado do limite mensal do plano (Free/Pro/Premium), e **nunca expiram**. O consumo automático sempre prioriza o saldo mensal primeiro, e só usa o comprado quando o mensal acaba.

## Modelo de dados

### Nova tabela `purchased_streak_freezes`

Saldo permanente (não-mensal) de defensivas compradas, separado do `streak_freezes` que é por mês.

```sql
CREATE TABLE public.purchased_streak_freezes (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  total_purchased integer NOT NULL DEFAULT 0,
  total_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```
- Uma linha por usuário (PK em `user_id`); incrementa `balance` e `total_purchased` ao receber webhook; decrementa `balance` e incrementa `total_used` quando consumido.
- RLS: SELECT só pelo dono. INSERT/UPDATE bloqueados para o cliente — só o webhook (service role) escreve.

### Tabela `streak_freeze_purchases` (auditoria/idempotência)

```sql
CREATE TABLE public.streak_freeze_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent text,
  quantity integer NOT NULL,             -- pacotes comprados
  freezes_added integer NOT NULL,        -- quantity * 3
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
- `UNIQUE(stripe_session_id)` garante idempotência: se o webhook chegar 2x, a 2ª inserção falha silenciosamente e não credita de novo.
- RLS: SELECT só pelo dono; INSERT só via service role (webhook).

### RPC `consume_streak_freeze` (SECURITY DEFINER)

Função única que centraliza o consumo, chamada pelo `useStreakFreeze` no auto-use:

```sql
-- Pseudocódigo
1. Tenta debitar do streak_freezes do mês corrente (até atingir total_granted).
2. Se monthly esgotado, debita 1 do purchased_streak_freezes.balance.
3. Em ambos os casos, registra a data em auto_used_dates do mês corrente.
4. Retorna { source: 'monthly' | 'purchased' | 'none', remaining_monthly, remaining_purchased }.
```

Vantagem: o frontend não precisa decidir de onde vem; só chama a RPC e mostra o resultado. **Regra firme: monthly sempre antes de purchased.**

## Stripe

### Produto e preço a criar
- **Produto**: `Streak Freeze Pack (3)` (descrição traduzível na UI; descrição interna em inglês).
- **Preço**: `$1.00 USD`, one-time (sem `recurring`).
- ID será fixado em `src/lib/stripePlans.ts` como `STREAK_FREEZE_PACK_PRICE_ID` e `STREAK_FREEZE_PACK_PRODUCT_ID`.
- Cada pacote = 3 defensivas. Quantidade no Checkout é livre (`adjustable_quantity` ativo, min 1, max 50) → comprou 5 pacotes = 15 defensivas.

### Edge Function nova: `create-freeze-purchase`
- `mode: "payment"` (one-off, **não** subscription).
- Authenticated (Bearer JWT) — só usuário logado pode comprar (sem guest).
- Reusa `stripe.customers.list({email})` para reaproveitar `customer` existente.
- `line_items: [{ price: STREAK_FREEZE_PACK_PRICE_ID, quantity: 1, adjustable_quantity: { enabled: true, minimum: 1, maximum: 50 } }]`
- `metadata: { user_id, kind: 'streak_freeze_pack' }` no Checkout Session.
- `success_url: ${origin}/timer?freeze_purchase=success`
- `cancel_url: ${origin}/timer?freeze_purchase=cancel`
- Retorna `{ url }` para abrir em nova aba.

### Webhook `stripe-webhook` — adicionar handler
No `case "checkout.session.completed"` existente, detectar `session.metadata?.kind === 'streak_freeze_pack'`:

```typescript
if (session.payment_status === 'paid' && session.metadata?.kind === 'streak_freeze_pack') {
  const userId = session.metadata.user_id;
  const quantity = session.line_items?.data?.[0]?.quantity ?? 1; // precisa expand=line_items
  const freezesAdded = quantity * 3;

  // 1. Insert em streak_freeze_purchases (UNIQUE no session_id garante idempotência)
  const { error: insErr } = await supabaseAdmin
    .from('streak_freeze_purchases')
    .insert({ user_id: userId, stripe_session_id: session.id, ... });
  
  if (insErr?.code === '23505') return; // já processado
  
  // 2. Upsert em purchased_streak_freezes: balance += freezesAdded
  await supabaseAdmin.rpc('credit_purchased_freezes', { _user_id: userId, _amount: freezesAdded });
}
```

A `expand: ['line_items']` precisa ser feito via `stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] })` dentro do webhook porque `line_items` não vem por padrão no payload do evento.

RPC auxiliar `credit_purchased_freezes(_user_id, _amount)` faz o `INSERT ... ON CONFLICT (user_id) DO UPDATE SET balance = balance + _amount, total_purchased = total_purchased + _amount`. SECURITY DEFINER, executável só pelo service role.

## Frontend

### Hook `useStreakFreeze` (atualizar)
- Adicionar query para `purchased_streak_freezes` → expor `purchasedBalance`, `totalAvailable = remaining + purchasedBalance`.
- Trocar o auto-use direto na tabela por chamada à RPC `consume_streak_freeze` (que aplica monthly-first).
- Manter compatibilidade: `remaining` continua sendo o do mês; novos campos são aditivos.

### Hook novo `useFreezePurchase`
- `purchase(quantity = 1)`: invoca `create-freeze-purchase`, abre `data.url` em nova aba.
- `isPurchasing` state para loading.

### UI

**`StreakDetailModal.tsx`** (já é a tela onde o usuário vê defensivas):
- Trocar `t("streak.freezes_remaining")` por exibição dual:
  - `🛡️ Mensais: X / Y` (do plano)
  - `💎 Compradas: Z` (saldo permanente)
- Adicionar botão CTA `Comprar mais defensivas (3 por $1)` que abre um sub-dialog `BuyFreezesDialog`.
- O bloco continua com o mesmo layout (já é responsivo para mobile com `max-w-sm sm:max-w-md`).

**`BuyFreezesDialog.tsx`** (novo):
- Stepper de quantidade (1–50 pacotes) com `+`/`-` e input.
- Cálculo dinâmico: `X pacotes = Y defensivas = $X.00`.
- Botão `Comprar` chama `useFreezePurchase.purchase(quantity)`.
- Layout mobile-first com `max-w-sm`, botões `min-h-11` (touch-friendly).
- i18n para todos os 12 idiomas (chaves novas em `streak.buy_*`).

**`/timer` query param handler**:
- Em `Index.tsx`, useEffect que lê `?freeze_purchase=success` → toast de sucesso + invalida queries `purchasedFreezes` + remove o param da URL.
- `?freeze_purchase=cancel` → toast neutro.

### i18n (12 idiomas)
Novas chaves em todos os locales:
```
streak.purchased_balance: "Compradas"
streak.monthly_balance: "Do plano"
streak.buy_more_cta: "Comprar mais defensivas"
streak.buy_dialog_title: "Comprar pacote de defensivas"
streak.buy_dialog_desc: "3 defensivas por $1. Sem expiração."
streak.buy_quantity: "Quantidade de pacotes"
streak.buy_total: "{{count}} defensivas por ${{price}}"
streak.buy_button: "Comprar agora"
streak.purchase_success: "Defensivas adicionadas com sucesso!"
streak.purchase_cancel: "Compra cancelada"
```

## Garantias de robustez

| Cenário | Comportamento |
|---|---|
| Webhook chega 2x (retry Stripe) | UNIQUE em `stripe_session_id` bloqueia duplicação |
| Pagamento falha após Checkout | `payment_status !== 'paid'` ignora; nada é creditado |
| Mês vira | Saldo `purchased_streak_freezes.balance` é independente de `month_year` — permanece intacto |
| Usuário Free compra | `granted = 0` no mensal → todo consumo vai pro purchased |
| Usuário Premium compra | Mensal (6) consumido primeiro, depois purchased |
| Cliente tenta inserir/UPDATE direto em `purchased_streak_freezes` | RLS bloqueia (só service role escreve) |
| User compra 5 pacotes em uma sessão | `quantity=5` × 3 = 15 defensivas creditadas de uma vez |

## Arquivos a criar/modificar

| Arquivo | Mudança |
|---|---|
| Migration | `purchased_streak_freezes`, `streak_freeze_purchases`, RPCs `credit_purchased_freezes` e `consume_streak_freeze`, RLS |
| `src/lib/stripePlans.ts` | Adicionar `STREAK_FREEZE_PACK_PRICE_ID` e `STREAK_FREEZE_PACK_PRODUCT_ID` |
| `supabase/functions/create-freeze-purchase/index.ts` | Nova edge function (auth + Stripe Checkout one-off) |
| `supabase/functions/stripe-webhook/index.ts` | Handler para `checkout.session.completed` com `kind=streak_freeze_pack` |
| `src/hooks/useStreakFreeze.ts` | Adicionar `purchasedBalance`; trocar auto-use por RPC `consume_streak_freeze` |
| `src/hooks/useFreezePurchase.ts` | Novo hook |
| `src/components/StreakDetailModal.tsx` | Mostrar saldo dual + CTA `Comprar mais` |
| `src/components/BuyFreezesDialog.tsx` | Novo modal de compra |
| `src/pages/Index.tsx` | useEffect para `?freeze_purchase=success/cancel` |
| `src/i18n/locales/*.json` (12 arquivos) | Novas chaves `streak.buy_*` e `streak.purchased_balance` |

## Stripe — execução
1. Criar produto e preço via tool `create_stripe_product_and_price`: `name="Streak Freeze Pack (3)"`, `price_amount=100`, `price_currency="usd"`, sem `recurring_interval`.
2. Listar prices para confirmar o `price_id` gerado e gravá-lo em `stripePlans.ts`.

## O que NÃO muda
- `streak_freezes` (mensal) e `STREAK_FREEZE_LIMITS` continuam como estão.
- Lógica de cálculo de streak (`get_member_room_streak`, etc.) — saldo comprado é só "estoque", o consumo registra em `auto_used_dates` exatamente como hoje.
- Subscription flow Free/Pro/Premium intacto.

## Risco
**Baixo.** Tudo aditivo: novas tabelas, novo edge function, novo handler dentro do `switch` existente do webhook (não toca os outros cases). O auto-use atual passa a usar uma RPC que mantém o mesmo efeito visível para usuários sem compras (debita do mensal igualzinho); só ganha capacidade extra de cair no purchased se o mensal zerar.

