## Objetivo

1. Corrigir os problemas de responsividade da página `/achievements` (especialmente Calendário de Consistência e Progresso Mensal cortados no mobile 390px).
2. Adicionar um sistema de **gamificação de defensivas** (streak freezes) por metas — inspirado no Duolingo, mas calibrado para não ficar fácil demais.

---

## Parte 1 — Correções de responsividade

### Diagnóstico

Olhando as screenshots em viewport 390px e o código atual:

- **`ConsistencyCalendar.tsx`** — o header do card tem ícone + título "Calendário de Consistência" + 2 botões icon (h-10 w-10) + um span com `min-w-[90px]` para "maio 2026". Esse `min-w` fixo somado aos botões força o card a ficar mais largo que a viewport, e como o calendário é `grid-cols-7`, as colunas Sex/Sáb são empurradas para fora (visível na screenshot: só Dom-Qui aparecem completos). Há também `overflow-x-hidden` no `<main>`, mas o conteúdo interno fica clipado em vez de re-fluir.
- **`Achievements.tsx` / Progresso Mensal** — o `BarChart` está dentro de `<CardContent className="h-[300px]">` com `ResponsiveContainer width="100%"`. Mas `ReferenceLine` com `label={{ position: 'right' }}` reserva espaço, e o XAxis renderiza 12 meses lado a lado — com fonte 12 e padding default, isso satura em 350-360px e os meses Out/Nov/Dez ficam cortados (visível na screenshot: só Jan-Set). O problema também é o card do gráfico estar dentro de `grid lg:grid-cols-2` que no mobile vira coluna única, mas o gráfico interno não encolhe direito.
- **Outros pontos menores**: header da página tem `Level X/366` + `XX% complete` que estouram em telas pequenas; cards de stats ok; árvore ok.

### Mudanças

**`src/components/achievements/ConsistencyCalendar.tsx`**
- Remover `min-w-[90px]` do mês — usar apenas `text-xs sm:text-sm whitespace-nowrap`.
- Reduzir `Button size="icon"` para `size="sm" className="h-7 w-7"` no mobile.
- Em mobile, mover o seletor de mês para uma linha abaixo do título (`flex-col sm:flex-row`) para liberar largura total ao calendário.
- Reduzir `gap-1` para `gap-0.5` no grid, e células de calendário com `text-[10px] sm:text-xs`.
- Garantir `w-full` no `<Card>` e remover qualquer min-width implícito.
- Encurtar os nomes dos dias no mobile (ex.: "D, S, T, Q, Q, S, S" em xs, "Dom, Seg…" em sm+).

**Card "Progresso Mensal" em `src/pages/Achievements.tsx`**
- Reduzir altura no mobile: `h-[220px] sm:h-[300px]`.
- Ajustar `XAxis` com `interval={0}`, `fontSize={10}`, e em mobile usar abreviação de 1 letra (`tickFormatter`) para caber 12 meses.
- Remover o `label` do `ReferenceLine` no mobile (mantém só a linha tracejada) — passa para legenda textual abaixo do gráfico.
- Adicionar `padding` esquerdo/direito mínimos no `BarChart` (`margin={{ left: -10, right: 4, top: 4, bottom: 0 }}`) para o YAxis encolher.

**`src/pages/Achievements.tsx` (header e topo)**
- Badges `Level X/366` e `XX% complete`: já tem `text-sm sm:text-lg`, mas adicionar `whitespace-nowrap` e quebrar para linha própria via `flex-wrap`.
- Reduzir `p-4` da página principal para `p-2 sm:p-4`.

**`src/components/achievements/UnlockedAchievements.tsx`**
- Cards de milestone em mobile: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` (atualmente `grid-cols-2`, fica apertado com texto + check).

**`src/components/achievements/TreePhaseIndicator.tsx`** — verificar se há overflow; se houver, aplicar `overflow-x-auto scrollbar-thin` horizontal scroll para fases.

### Como validar
- Abrir `/achievements` em viewport 390x844 e confirmar:
  - Nenhum scroll horizontal na página.
  - Calendário mostra todas as 7 colunas (Dom-Sáb) inteiras.
  - Gráfico mensal mostra todos os 12 meses (Jan-Dez).
  - Header não estoura.

---

## Parte 2 — Gamificação: defensivas por metas

### Sua ideia + refinamentos

Sua proposta: "2h por dia todos os dias da semana → 1 defensiva". Isso daria ~4-5/mês — você mesmo notou que pode ficar fácil. Aqui está uma versão mais equilibrada e estimulante:

### Sistema proposto: "Missões de Defensiva"

Em vez de **uma** regra única, criar **3 níveis de missão** que coexistem. Cada missão ganha defensivas, mas ficam mais difíceis. Total esperado: **2-3 defensivas/mês para usuário comprometido, 4-5 para usuário excepcional**.

| Missão | Critério | Recompensa | Frequência esperada |
|---|---|---|---|
| **Semanal Bronze** | 5 dias com ≥1h em uma semana (Seg-Dom) | +1 defensiva | ~3-4x/mês para usuário ativo |
| **Semanal Ouro** | 7 dias com ≥2h na mesma semana | +1 defensiva extra (total +2 nessa semana) | ~1-2x/mês para usuário dedicado |
| **Mensal Lendária** | Mês inteiro com ≥1h todos os dias E total ≥80h | +2 defensivas + badge | raro, ~1x/trimestre |

**Limite global**: máximo de **6 defensivas ganhas por mês** via missões (independente do plano), para não inflacionar e manter valor.

### Por que essa estrutura?

1. **Bronze é alcançável** → mantém engajamento de quem não consegue diariamente.
2. **Ouro recompensa consistência real** (2h × 7 dias = 14h/semana, exigente mas factível).
3. **Lendária** dá objetivo de longo prazo e feedback de orgulho.
4. **Defensivas têm valor**: usuário não fica "rico" delas, então ainda há razão para comprar packs / assinar Premium.
5. Funciona como o "loop de retenção" do Duolingo — sempre tem uma missão visível em progresso.

### Implementação

**Banco (Lovable Cloud / Supabase)**
- Nova tabela `freeze_missions`:
  - `id`, `user_id`, `mission_type` (`weekly_bronze` | `weekly_gold` | `monthly_legendary`), `period_key` (ex.: `2026-W18` ou `2026-05`), `completed_at`, `freezes_awarded`, `created_at`.
  - Unique `(user_id, mission_type, period_key)` — impede dupla recompensa.
- RPC `check_and_grant_freeze_missions()`:
  - Calcula horas/dia da semana atual e do mês atual a partir de `time_entries`.
  - Para cada missão elegível ainda não premiada na período atual, insere registro e incrementa `purchased_streak_freezes.balance` (ou cria coluna separada `earned_balance` para distinguir).
  - Respeita teto mensal de 6.
  - Retorna `[{ mission_type, freezes_granted }]`.
- Novo hook `useFreezeMissions` que chama o RPC quando o usuário entra na página `/achievements` ou completa uma sessão de timer.

**UI — novo componente `FreezeMissionsCard`** dentro de `Achievements.tsx`, perto da seção "Streak Freezes":
- Lista as 3 missões com:
  - Ícone, nome, descrição curta.
  - Barra de progresso (ex.: "4/5 dias com 1h" para bronze).
  - Estado: em progresso / concluída esta semana / bloqueada.
- Toast + som (`playSuccess`) quando uma missão é concluída.

**i18n**: adicionar chaves em todos os locales (`pt-BR`, `en-US`, `es-ES`, etc.) — `freeze_missions.bronze_title`, `freeze_missions.gold_title`, etc.

### Como validar
- Forçar manualmente (via SQL) horas em `time_entries` para um usuário test e verificar que o RPC concede defensivas corretas e respeita o teto mensal.
- Confirmar que o card de missões mostra progresso ao vivo.

---

## Sequência de execução

1. Correções de responsividade (rápido, sem risco).
2. Migração do banco + RPC para missões.
3. Hook + componente UI das missões.
4. i18n.
5. QA visual em 390px e em desktop.

Nada quebra os fluxos atuais de defensivas (mensal por plano + compra avulsa) — o sistema novo é **aditivo**.
