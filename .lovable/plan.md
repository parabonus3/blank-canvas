# Organização Mobile + Clareza do Timer da Sala

Foco: melhorar a página da sala no mobile (espaçamento, ordem, hierarquia), tornar o Timer da Sala claro e profissional sobre o que conta para a sala/desafio, melhorar o Mapa de Atividade com noção de dias, e reorganizar o status do membro no mobile.

## 1. Reorganização mobile do RoomDetail

**Ordem dos blocos no overview (mobile e desktop):**

```text
1. RoomStatsHeader
2. RoomTimerCard        ← sobe para antes do desafio
3. RoomChallengesCard   ← agora abaixo do timer
4. Chalkboard (Estudando agora / goal)
5. Floor + RoomMemberGrid
6. Sidebar (ranking, conquistas, heatmap, atividades) — empilhada no mobile
```

**Espaçamentos:**
- Trocar `space-y-0` por `space-y-4 sm:space-y-5` no container principal e remover os `mt-4` redundantes (eles + space-y duplicam margens em telas grandes e somem no mobile).
- Sidebar mobile: aumentar gap para `gap-4 sm:gap-6` e adicionar `mt-2` entre o classroom-floor e a sidebar empilhada para não colar.
- Padding do `RoomFrame`: `p-3 sm:p-6` (mobile mais apertado, mas com respiro entre cards).
- Cada card (`RoomChallengesCard`, `RoomHeatmap`, `RoomActivityFeed`, `RoomAchievements`, `RoomRankingSidebar`) usa borda + `rounded-2xl` consistente — já fazem, garantir margem entre eles via `space-y` do pai (não mais via `mt-4` ad-hoc).

## 2. RoomTimerCard mais claro e destacado

Visual:
- Ring de destaque sutil: `ring-1 ring-primary/15 shadow-md shadow-primary/10` mantido, mas com header maior (ícone 12x12, título `text-base sm:text-lg`).
- Quando NÃO há timer ativo, mostrar 1 linha de helper logo abaixo do botão Iniciar:
  - Sem desafio ativo na sala: "O tempo conta para o ranking e streak desta sala."
  - Com desafio ativo: "Conta para o ranking, streak e para o desafio: <nome do desafio>." (puxar nome do `useRoomChallenges` ativo).

Estado "ativo em outro lugar" (já existe) — refinar:
- Texto novo: "Você está com cronômetro rodando em outro contexto. Esse tempo NÃO está contando para esta sala. Toque em Parar lá e Iniciar aqui para contabilizar nesta sala."
- Botão secundário "Ir para o cronômetro ativo" (navega para a sala de origem se `active.room_id` existe, senão para `/`).

Estado "ativo nesta sala":
- Adicionar chip discreto abaixo do tempo: "Contando para esta sala" e, se houver desafio ativo, "+ desafio: X".

Tudo profissional: copy curto, sem emoji excessivo, sem alarmes — apenas info inline em `text-xs text-muted-foreground` ou chip pequeno com `bg-primary/10`.

## 3. RoomHeatmap com noção de dias

Hoje o heatmap mostra só pontos. Adicionar:
- Rótulos de mês acima das colunas (Jan, Fev, Mar...) — render condicional na primeira coluna de cada mês.
- Coluna lateral com iniciais de dias da semana (S, T, Q, Q, S — alternados).
- Tooltip já existe, manter; aumentar levemente as células no mobile (`h-3 w-3` → `h-3.5 w-3.5`).
- Trocar título do bloco para incluir período: "Mapa de Atividade — últimos X dias" e dropdown simples (30 / 84 / 180 dias) opcional — versão mínima: só o subtítulo dinâmico.
- Manter scroll horizontal no mobile (já tem `overflow-x-auto`).

## 4. Status do membro organizado no mobile

Problema: no mobile o status aparece em linha junto com badges e quebra layout (vide imagem 3 — "Com grandes…" colado).

Mudanças em `RoomMemberGrid`:
- Mover o `status_text` para uma linha própria abaixo do bloco principal do card, com `mt-1.5 pl-0 sm:pl-14` (alinhada após o avatar) e `line-clamp-2` em vez de `truncate`.
- No mobile, o card vira layout vertical compacto:
  - Linha 1: avatar + nome + tier badge (chips no canto direito)
  - Linha 2: título de nível + streak
  - Linha 3 (se houver): status em itálico
  - Tempo total: posição absoluta no canto superior direito do card no mobile (`absolute top-3 right-3`) para não brigar com badges.
- Fita "PRO/PREMIUM" diagonal: encolher no mobile (`text-[9px]` em vez de `text-[10px]`) e mover para `top-1 right-1` com menos rotação, ou trocar por um pill discreto no header do card no mobile (a fita estourava a borda do card pequeno).

Resultado: cada membro vira um cartão "respirável" no mobile, sem badges sobrepostas e com o status legível.

## 5. Detalhes técnicos

**Arquivos editados (sem mudanças de lógica/dados):**
- `src/pages/RoomDetail.tsx` — reordenar blocos, padding e space-y mobile-first.
- `src/components/rooms/RoomTimerCard.tsx` — copy + chips de contexto + integração com `useRoomChallenges` para detectar desafio ativo + botão "Ir para timer ativo".
- `src/components/rooms/RoomHeatmap.tsx` — labels de mês e dias da semana, subtítulo dinâmico com período.
- `src/components/rooms/RoomMemberGrid.tsx` — layout mobile do card (status em linha própria, tempo absoluto, fita menor).
- `src/i18n/locales/pt-BR.json` + demais 11 locales — novas chaves:
  - `rooms.room_timer_counts_for_room`
  - `rooms.room_timer_counts_for_room_and_challenge`
  - `rooms.room_timer_active_elsewhere_v2`
  - `rooms.room_timer_go_to_active`
  - `rooms.room_timer_counting_here`
  - `rooms.heatmap_period_30` / `_84` / `_180`
  - `rooms.weekday_short_s` etc. (iniciais)

**O que NÃO muda:**
- Nenhuma lógica de contagem de tempo, RPC, schema, ou regras de negócio.
- Nenhuma migração nova.
- Apenas UI/UX, copy, e i18n.

## 6. Verificação

- Inspecionar preview em mobile (375px) e desktop após cada mudança.
- Garantir que o card do timer no mobile não fica colado no card de desafio nem no chalkboard.
- Garantir que membros com status longo não quebram o grid no mobile.
- Garantir que o heatmap mostra rótulos de mês corretamente alinhados.
