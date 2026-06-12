# Correções: Timer da Sala, Premium e Explorar

Investiguei o código + banco e identifiquei a causa de cada problema. Abaixo o plano para resolver os três pontos de forma coerente.

---

## 1) Timer da Sala — visual ruim, texto sumindo

**Causa real:** o `RoomTimerCard` em si já usa `bg-card` sólido, mas em `RoomDetail.tsx` ele é renderizado **dentro de `.classroom-chalkboard`** (gradiente verde-escuro com borda madeira). O cartão branco "glassy" empilhado sobre o quadro-negro cria a aparência de gradiente esverdeado e deixa o título "Timer da Sala" praticamente ilegível no tema light.

**O que vou fazer:**
- Tirar o `RoomTimerCard` de dentro do `.classroom-chalkboard` em `src/pages/RoomDetail.tsx` e colocá-lo como bloco próprio acima do quadro-negro (mesma posição visual, sem o fundo verde por trás).
- Redesenhar o `RoomTimerCard` com identidade premium e sólida:
  - Fundo `bg-card` com borda fina `border-primary/20`, cantos `rounded-2xl`, sombra suave `shadow-lg shadow-primary/5`.
  - Header com ícone em "chip" `bg-primary/10`, título em `text-foreground font-semibold` (contraste garantido em light/dark), subtítulo em `text-muted-foreground`.
  - Display do tempo grande, mono, `text-primary` com `tabular-nums`.
  - Botão principal sólido `bg-primary text-primary-foreground` (manter), botão Parar `variant="destructive"`.
  - Painel de sons recolhível mantendo o mesmo padrão sólido (sem gradientes).
- Garantir responsividade: padding `p-4 sm:p-5`, tipografia escalonando `text-4xl sm:text-5xl`, botões `w-full`.
- Manter o ProjectPicker, sons ambientes e a lógica atual (sem mexer em hooks/RPCs).

**Aceite:** Em light e dark, o card aparece destacado, com texto totalmente legível, sem o "véu" verde do quadro-negro.

---

## 2) Membros Premium não aparecem como Premium

**Causa real:** No banco, **apenas 2 perfis** têm `plan_tier = 'premium'` (Nicky, Isabella). Os demais usuários que pagaram premium ficaram com `plan_tier = 'free'` porque o `plan_tier` só é atualizado quando a função `check-subscription` roda para aquele usuário (no login/refresh dele). O webhook do Stripe (`stripe-webhook`) também não está gravando o `plan_tier` corretamente para todos os eventos.

**O que vou fazer:**
1. **Backfill imediato (migration SQL)** — função `sync_all_plan_tiers_from_stripe()` chamada via Edge Function admin, mas como rodar Stripe em SQL não é trivial, vou criar uma **edge function `sync-all-plan-tiers`** que:
   - Lista todos os customers ativos do Stripe.
   - Para cada um, busca a assinatura ativa e mapeia produto → tier usando o `PRODUCT_TIER_MAP` já existente em `check-subscription`.
   - Faz `UPDATE profiles SET plan_tier = ... WHERE email = customer.email`.
   - Retorna um relatório (quantos atualizados / quais).
2. **Corrigir o `stripe-webhook`** para sempre escrever `plan_tier` em `profiles` nos eventos `customer.subscription.created/updated/deleted` e `invoice.payment_succeeded` (hoje só atualiza em alguns caminhos). Garantir que `subscription.deleted` faz fallback para `'free'`.
3. **Realtime no perfil:** assinar `postgres_changes` em `profiles` no `useRoomMembers` (filtro `user_id in (...)`) para que mudanças de `plan_tier` apareçam ao vivo na sala sem reload.
4. **Defensivo:** no `get_room_member_profiles` já retorna `plan_tier`; conferir que o front (`RoomMemberGrid`, `MemberProfileModal`, `RoomRankingSidebar`) lê esse campo de forma consistente.

**Aceite:** Após rodar a edge function uma vez, todos os pagantes ativos aparecem com selo Premium/Pro nas salas, ranking e modal de perfil.

---

## 3) "Hoje" no Explorar mostra quem não estudou hoje

**Causa real:** `get_global_user_ranking` usa `_tz = 'UTC'` (passado pelo `Explore.tsx`). Quem estudou ontem entre 21h–00h (horário Brasil) cai dentro de "hoje UTC" e aparece no ranking — mesmo sem ter estudado no dia local do usuário. Mesma incoerência já corrigida nas salas, agora precisa valer no Explorar global.

**O que vou fazer:**
1. **Migration SQL:**
   - Reescrever `get_global_user_ranking(_period, _tz)` para de fato usar `_tz` no cálculo de "today/week" (já recebe, mas usa `start_of_day_in_tz(_tz)` — vou validar e corrigir uso para todos os ramos, incluindo `now` filtrar por `start_of_day_in_tz(_tz)` em vez de "últimas 24h").
   - Mesma correção em `get_public_rooms_ranking_by_period` se necessário.
2. **Frontend (`src/pages/Explore.tsx`):**
   - Substituir `_tz: "UTC"` por **o timezone do próprio usuário** (`useTimezone()` hook já existente) — assim "Hoje" significa "hoje pra você".
   - Atualizar o aviso `explore.timezone_notice` para refletir: "Dia e semana baseados no seu fuso ({tz})" em todos os 12 locales.
   - Filtrar do resultado quem tem `total_seconds = 0` (defensivo).
3. **Coerência com salas:** a aba "Salas" do Explorar também passa a usar o tz do usuário para "Hoje/Semana".

**Aceite:** Em "Hoje" só aparecem usuários que efetivamente estudaram hoje no fuso local do visitante. "Semana" idem. Os números batem com o que o usuário vê no próprio Dashboard.

---

## Arquivos afetados

```text
src/components/rooms/RoomTimerCard.tsx        (redesign)
src/pages/RoomDetail.tsx                      (tirar timer do chalkboard)
src/pages/Explore.tsx                         (usar tz local)
src/hooks/useRoomMembers.ts                   (realtime profiles)
src/i18n/locales/*.json                       (12 arquivos — texto do aviso)
supabase/migrations/<timestamp>_*.sql         (get_global_user_ranking + tz)
supabase/functions/sync-all-plan-tiers/       (nova edge function)
supabase/functions/stripe-webhook/index.ts    (gravar plan_tier sempre)
```

## Pontos técnicos

- A edge function `sync-all-plan-tiers` exige `STRIPE_SECRET_KEY` (já existe) e `SUPABASE_SERVICE_ROLE_KEY` (já existe). Será chamada manualmente uma vez e fica disponível para re-execução.
- A migration é não-destrutiva: só `CREATE OR REPLACE FUNCTION`.
- Nada do redesign do timer toca em hooks de tempo/RPCs — risco visual baixo.

Confirme para eu aplicar.
