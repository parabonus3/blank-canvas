
## Diagnóstico — "novo dia" no Explorar

Hoje, três RPCs (`get_public_rooms_ranking_by_period`, `get_room_daily_progress`, `get_global_user_ranking`) filtram por `CURRENT_DATE`. `CURRENT_DATE` no Postgres usa o **timezone do servidor (UTC)**, então:

- Para um usuário em São Paulo (UTC−3), o "novo dia" do ranking vira às **21:00 do dia anterior** (00:00 UTC).
- Sessões feitas entre 21:00–23:59 SP "somem" do dia atual no Explorar e aparecem como dia novo cedo demais.
- O mesmo se aplica a "semana" (offset de 3h também desloca o início).

### Decisão recomendada

Para o **Explorar (rankings globais)**: usar um **fuso padrão único** (`America/Sao_Paulo`) para que o ranking seja igual para todos os usuários e justo (caso contrário, quem está em UTC+12 começa o dia 15h antes e domina o "today"). Mostrar isso de forma **discreta** abaixo das tabs: texto pequeno tipo *"Dia/semana baseados em America/Sao_Paulo (UTC−3)"*.

Para **progresso da sala** (`get_room_daily_progress`) e **metas/timer pessoais**: usar o **timezone do próprio usuário** (`profiles.timezone`), pois é experiência individual.

## Mudanças no banco (migration)

Substituir `CURRENT_DATE` por cálculo via timezone:

```sql
-- helper
CREATE OR REPLACE FUNCTION public.start_of_day_in_tz(_tz text)
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT date_trunc('day', (now() AT TIME ZONE _tz)) AT TIME ZONE _tz;
$$;
```

Atualizar:
1. `get_public_rooms_ranking_by_period` — receber `_tz text DEFAULT 'America/Sao_Paulo'` e trocar `CURRENT_DATE` por `start_of_day_in_tz(_tz)` e `start_of_day_in_tz(_tz) - INTERVAL '6 days'` para semana (semana = últimos 7 dias incluindo hoje no fuso).
2. `get_global_user_ranking` — idem.
3. `get_room_daily_progress` — receber `_tz` (frontend passa `profile.timezone`).

Manter assinatura compatível (parâmetro com default), sem quebrar chamadas existentes.

## Frontend — Explorar

- `src/pages/Explore.tsx`: abaixo das tabs de período, linha discreta `text-xs text-muted-foreground` com aviso do fuso padrão (i18n).
- Não passar `_tz` nas chamadas do Explorar (usa default SP). Em `RoomGoalProgress` (sala), passar `_tz: profile.timezone`.

## Frontend — Metas no Timer (discreto)

Contexto: hoje `useGoalsWithProgress` retorna metas ativas com `progress`, `status` e dados do projeto. O usuário quer ver no `/` (Timer) e no `FullscreenTimer` apenas metas **em andamento** (excluir `status === "completed"`).

1. **Novo componente** `src/components/timer/ActiveGoalsStrip.tsx`:
   - Lista compacta horizontal (chips) com: cor do projeto, nome curto, mini barra de progresso, `XX%`.
   - Apenas metas com `progress < 100`.
   - Limite visual: até 3 visíveis + "+N" se houver mais (tooltip/popover lista o resto).
   - Estilo bem discreto: `text-xs`, fundo `bg-muted/40`, borda sutil. Sem títulos grandes.
   - Mobile: scroll horizontal (`overflow-x-auto`, snap), chips menores.

2. **Integração em `src/pages/Index.tsx`** (Timer): renderizar `ActiveGoalsStrip` logo abaixo do header do timer, recolhível em mobile (`hidden sm:flex` no chip extra, mas o strip aparece sempre). Esconder se nenhuma meta ativa.

3. **Integração em `src/components/FullscreenTimer.tsx`**: render no rodapé/bottom com `opacity-60 hover:opacity-100`, posicionamento absoluto inferior central, mantendo o foco no relógio.

4. **Filtro:** ambos usam `useGoalsWithProgress()` e filtram `status !== "completed"`.

## Responsividade mobile

- Strip: `flex gap-2 overflow-x-auto snap-x` em < `sm`, grid `flex-wrap` em ≥ `sm`.
- Aviso de fuso no Explorar: `text-[11px]` em mobile, alinhado à direita das tabs ou abaixo.
- FullscreenTimer: strip vira linha única com `max-w-[90vw]` e fonte menor.

## Detalhes técnicos

- Migration via supabase migration tool (CREATE OR REPLACE; mantém assinatura).
- Não tocar em `src/integrations/supabase/types.ts`.
- i18n: novas chaves `explore.timezone_notice`, `timer.active_goals`, `timer.goals_more`.
- Sem mudanças em auth, RLS, ou regras de negócio fora do escopo.

## Fora do escopo

- Não alterar cálculo de streak (já usa timezone do usuário).
- Não alterar tela de Goals (`/goals`) — apenas adicionar visualização discreta no Timer.
