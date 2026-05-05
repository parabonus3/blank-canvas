# Sistema de Metas Anuais — TimeZoni

Substituir a área atual de Metas (foco em horas diárias/semanais por projeto) por um sistema de **Metas Anuais** organizadas por **Categorias da Vida**, com 3 tipos de metas, progresso visual, contexto anual e interação rápida.

A página atual de "Metas" hoje mistura: metas por projeto (horas), checklists e histórico. Vamos reorganizar mantendo checklist em aba separada (não mexer nele) e refazendo toda a parte de "Metas".

---

## 1. Modelo de dados (novas tabelas)

### `life_categories`
Áreas da vida do usuário (Health, Business, Finance, etc.).

| coluna | tipo | notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | dono |
| name | text | "Health" |
| color | text | hex, ex `#22c55e` |
| icon | text | nome do ícone Lucide (ex: `heart`) |
| position | int | ordenação |
| created_at | timestamptz | |

RLS: dono faz tudo (`auth.uid() = user_id`).

### `annual_goals`
| coluna | tipo | notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | |
| category_id | uuid | FK → life_categories (nullable, "sem categoria") |
| year | int | ex 2026 |
| title | text | "Read 10 books" |
| description | text | opcional |
| goal_type | text | `simple` \| `progress` \| `habit` |
| target_value | numeric | progress: ex 10000; habit: vezes/semana; simple: 1 |
| current_value | numeric | acumulado (progress) ou contador (habit) |
| unit | text | opcional ex `$`, `books`, `times` |
| frequency_period | text | só habit: `weekly` \| `monthly` |
| is_completed | bool | |
| completed_at | timestamptz | |
| archived | bool | true ao virar o ano se não duplicada |
| created_at, updated_at | timestamptz | |

CHECK: `goal_type IN ('simple','progress','habit')`.
RLS: dono.

### `annual_goal_progress`
Histórico de incrementos (para metas progress e habit).
| coluna | tipo |
|---|---|
| id | uuid |
| goal_id | uuid FK |
| user_id | uuid |
| value | numeric (qto somou; habit usa 1) |
| note | text opcional |
| logged_at | timestamptz default now() |

RLS: dono. Trigger: ao inserir, soma em `annual_goals.current_value` e marca `is_completed=true` quando `current_value >= target_value` (clamp ao máximo).

### Função RPC `duplicate_goals_to_year(_from int, _to int)`
Copia metas não arquivadas resetando `current_value=0`, `is_completed=false`.

---

## 2. Hooks (novo arquivo `src/hooks/useAnnualGoals.ts`)

- `useLifeCategories()` / `useCreateCategory` / `useUpdateCategory` / `useDeleteCategory`
- `useAnnualGoals(year)` — retorna metas do ano agrupadas por categoria, com progresso calculado
- `useCreateAnnualGoal`, `useUpdateAnnualGoal`, `useDeleteAnnualGoal`
- `useLogGoalProgress(goalId, value)` — inserts em `annual_goal_progress`
- `useToggleSimpleGoal(goalId)` — marca/desmarca simple como concluída
- `useAnnualGoalsStats(year)` — % geral do ano, total concluídas, breakdown por categoria
- `useDuplicateGoalsToYear`

Invalidações de cache: `['annualGoals', year]`, `['annualGoalsStats', year]`, `['lifeCategories']`.

---

## 3. UI — `src/pages/Goals.tsx` (refatorado)

Estrutura nova com Tabs:
- **Anuais** (NOVO — default)
- **Checklist** (mantém atual)
- **Histórico** (mantém atual + adiciona metas anuais arquivadas/concluídas)

### Aba Anuais — layout

```text
┌─────────────────────────────────────────────────────────┐
│ Metas 2026                  [Ano ▼] [+ Categoria] [+ Meta] │
├─────────────────────────────────────────────────────────┤
│ ┌──────┬──────┬──────┬──────┐                            │
│ │ 42%  │ 8/19 │ 5    │ 🌳   │  cards de resumo           │
│ │ ano  │ feitas│cats  │ tree │                            │
│ └──────┴──────┴──────┴──────┘                            │
├─────────────────────────────────────────────────────────┤
│ Progresso por categoria  (barras coloridas)              │
│ ● Health    ████████░░ 72%                                │
│ ● Business  ███░░░░░░░ 30%                                │
├─────────────────────────────────────────────────────────┤
│ [Categoria: Health  ❤️]                  3 metas          │
│   ┌───────────────────────────────────────────┐          │
│   │ ☐ Travel to 3 countries          [simple] │  1-clique│
│   │ ▓▓▓▓░░░░ 40%   400/1000 push-ups [progress]│ +/qtd   │
│   │ ▓▓▓░░░░░ 2/3 essa semana          [habit] │ +1 hoje │
│   └───────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### Componentes novos em `src/components/goals/`
- `AnnualGoalsHeader.tsx` — título, seletor de ano, botões
- `AnnualStatsCards.tsx` — 4 cards (% ano, concluídas, categorias, mini tree)
- `CategoryProgressList.tsx` — barras por categoria
- `CategorySection.tsx` — agrupa metas de uma categoria, expansível
- `GoalCard.tsx` — renderiza card adaptado ao `goal_type`
  - **Simple**: checkbox grande + título; click = toggle (animação confetti se concluir)
  - **Progress**: barra + input rápido `+` (ex botões `+1`, `+10`, `+100` configuráveis pelo unit, ou input livre); auto-completa ao bater target
  - **Habit**: contador semanal/mensal (ex `2/3 esta semana`) + botão `Registrar hoje`; mostra mini-heatmap dos dias
- `CreateCategoryDialog.tsx` — nome, cor (palette), ícone (grid de Lucide)
- `CreateGoalDialog.tsx` — categoria, tipo (3 opções com explicação visual), título, target, unit, frequência (só habit)
- `LogProgressPopover.tsx` — popover rápido no card (sem abrir dialog)

### Interações rápidas (crítico)
- 1 clique para concluir simple
- Botões rápidos `+1` / `+5` / `+10` ou input inline para progress
- Botão "Registrar hoje" único para habit
- Animação `scale-in` + confetti ao concluir
- Toast com mensagem motivadora

### Responsividade
- Mobile: cards full-width (`grid-cols-1`), header empilhado, dialog vira sheet em telas pequenas se necessário, botões `+` com tap targets ≥44px
- Desktop: `md:grid-cols-2 lg:grid-cols-3` para cards de meta
- Stats cards: `grid-cols-2 md:grid-cols-4`

---

## 4. Conexão com o resto do sistema (diferencial)

- Registrar progresso conta como "atividade" do dia (atualiza `last_active_at` indireto via cache + futuro hook em streak — só preparar campo, não alterar lógica de streak agora)
- Ao concluir uma meta anual: toast com bônus visual + considerar conceder 1 freeze bônus se concluir 5 metas no ano (regra futura — deixar TODO comentado, não implementar agora pra não bagunçar economia)
- Mini árvore (GrowthTree) reaproveitada nos stats

---

## 5. Traduções

Adicionar em todos os 12 arquivos `src/i18n/locales/*.json` namespace `annual_goals.*`:

Chaves: `title`, `subtitle`, `year`, `new_category`, `new_goal`, `category_name`, `category_color`, `category_icon`, `goal_title`, `goal_type`, `type_simple`, `type_simple_desc`, `type_progress`, `type_progress_desc`, `type_habit`, `type_habit_desc`, `target`, `unit`, `frequency`, `weekly`, `monthly`, `current_progress`, `mark_complete`, `add_progress`, `log_today`, `not_started`, `in_progress`, `completed`, `archived`, `duplicate_to_next_year`, `overall_progress`, `goals_completed`, `categories_count`, `no_categories`, `no_goals_year`, `confirm_delete_category`, `confirm_delete_goal`, `goal_completed_toast`, `progress_added_toast`, `quick_add`, `view_history`.

Português completo + inglês completo; outras 10 línguas: traduções básicas (não copiar PT como fallback — usar tradução real).

---

## 6. Integração na página Goals

`src/pages/Goals.tsx`:
- Remover stats cards atuais (Trophy/Daily/Weekly por horas)
- Substituir conteúdo da aba "active" pela nova UI de Metas Anuais
- Manter aba "checklist" intacta
- Aba "history" passa a mostrar tanto metas anuais concluídas quanto checklist (como já faz)
- Manter paywall `hasFeature("goals")`

---

## 7. Detalhes técnicos

- Trigger SQL `update_goal_on_progress`: AFTER INSERT em `annual_goal_progress` → soma `current_value`, set `is_completed`/`completed_at`. Clamp `current_value <= target_value`.
- Função `get_habit_period_count(goal_id, period)` para contar registros do período atual (semana/mês).
- Index em `annual_goals(user_id, year)` e `annual_goal_progress(goal_id, logged_at)`.
- Sem CHECK constraint com tempo; usar trigger se precisar de validação temporal.
- `archived` setado por job manual / RPC `duplicate_goals_to_year` (ao virar ano usuário escolhe).

---

## 8. Entregáveis

1. Migração SQL: `life_categories`, `annual_goals`, `annual_goal_progress` + RLS + triggers + RPC duplicate
2. `src/hooks/useAnnualGoals.ts`
3. `src/components/goals/*` (8 componentes listados)
4. `src/pages/Goals.tsx` refatorado
5. Traduções nos 12 locales
6. Sem alterar streak/freeze/checklist

Após aprovação, parto para implementação.
