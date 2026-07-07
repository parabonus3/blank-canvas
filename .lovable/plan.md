
# Plano — Matriz de desafios sem scroll horizontal

## Problema atual
- Mobile: `MatrixTable` renderiza `overflow-x-auto` + `min-w-max` → scroll horizontal ruim.
- Desktop: com 5+ desafios a tabela também estoura e vira scroll horizontal.
- A aba "Por membro" no mobile existe mas não é o padrão nem tem visual profissional.

## Direção nova
Substituir a metáfora de **tabela matricial** por uma lista de **cards de membro** onde os desafios ficam empilhados verticalmente. Um único layout responsivo serve mobile e desktop, com densidade ajustada por breakpoint. Sem scroll horizontal em nenhum caso.

### Card do membro (padrão em todos os tamanhos)
```text
┌───────────────────────────────────────────────┐
│ [avatar] Nicky              🔥 2/2  ▸ expand │
│          Total hoje: 66min                    │
├───────────────────────────────────────────────┤
│ ✅ 📖 Leitura bíblica            23/10m 100% │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ✅ 🙏 Desafio de Oração         43/10m 100% │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ⚠ 🎯 Foco profundo               3/60m   5% │
│ ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└───────────────────────────────────────────────┘
```
- 1 linha por desafio: `[status] [emoji] [título truncado]  [min/target] [%]` + barra fina.
- Título do desafio truncado com `...`; nunca quebra layout.
- Toque/click na linha abre o `ChallengeCalendarModal` (mantém a UX atual do matrix).
- Anel/avatar mostra progresso agregado (`doneToday/total`).

### Breakpoints
- **Mobile (<640px)**: 1 coluna, cards em largura total, densidade compacta (texto `text-xs`, barra `h-1`, padding `p-3`). Sem scroll horizontal.
- **Tablet (≥640px)**: 2 colunas via `grid-cols-2 gap-3`.
- **Desktop (≥1024px)**: 2–3 colunas conforme largura (`lg:grid-cols-2 xl:grid-cols-3`). Cada card mantém desafios empilhados — escalável para 4, 8, 20 desafios sem scroll lateral.

### Cabeçalho de desafios (novo bloco acima da lista)
Substitui as "colunas" da tabela por um resumo horizontal de chips **com wrap**:
```text
[📖 Leitura 4/18 22%]  [🙏 Oração 3/18 17%]  [🎯 Foco 0/18 0%]  +Novo
```
- Wrap natural (`flex flex-wrap gap-2`), nunca gera scroll.
- Cada chip clicável abre um mini-menu com editar/excluir (owner) e mostra progresso agregado.
- Owner vê ações inline via popover para não sobrecarregar o card.

### Filtros e busca
- Mantém a barra atual (`Todos / Bateram hoje / Faltam / Não começaram`) + busca (auto-visível ≥10 membros).
- Ordenação: mais desafios batidos hoje → mais tempo total hoje → nome.

### Colapsar/expandir (opcional, ativo em ≥ 6 desafios)
- Quando a sala tiver muitos desafios, o card do membro mostra os 3 primeiros (priorizando "em risco" + "em andamento") e um botão `Ver mais (N)` que expande via `Collapsible`. Evita cards gigantes sem esconder informação.

## Arquivos a alterar
- `src/components/rooms/RoomChallengesMatrix.tsx` — substituir `MatrixTable`, `MobilePerChallenge`, `MobilePerMember` por:
  - `ChallengeSummaryChips` (novo, interno)
  - `MemberCard` (novo, interno) — layout único responsivo
  - Remover `Tabs` de mobile: layout unificado dispensa alternância.
- Sem mudanças de backend, RPC, tipos ou hooks (`useRoomChallenges`, `RoomChallengesCard`, `ChallengeCalendarModal` continuam iguais).
- Traduções: reutilizar chaves existentes; adicionar `rooms.challenges.total_today`, `rooms.challenges.see_more`, `rooms.challenges.see_less` em pt-BR + fallback default nos `t()`.

## Detalhes técnicos
- Container principal: `<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">`.
- Cada `MemberCard`: `rounded-xl border bg-card p-3 space-y-2` com header sticky-free (não sobrepõe).
- Linha de desafio: `<button className="w-full flex items-center gap-2 py-1.5">` para manter alvo de toque ≥40px no mobile.
- Estados de cor via classes já usadas (`bg-green-500/10`, `bg-amber-500/10`); status calculado por `memberChallengeStatus` (reaproveitado).
- Sem `overflow-x-auto` em nenhum ponto do componente.
- Preservar `AvatarFlair`, tooltips de legenda e handlers `onEdit/onDelete/onOpenMember`.

## Rollout
Mudança apenas de UI, drop-in em `RoomChallengesCard`. Nada quebra caso o usuário tenha 1, 2, 5 ou 20 desafios — sempre empilha e faz wrap.
