
# Plano: Kanban de nível profissional

Foco em 3 frentes: (1) clareza do convite/colaboração, (2) navegação da tarefa em **grid de ícones estilo "Financeiro"**, (3) lacunas que ainda faltam do plano original.

## 1. Convidar pessoas — tornar óbvio e convidativo

Hoje o botão de membros no header do quadro é discreto (avatares pequenos + botão pequeno) e o convite se perde. Mudanças:

- **Botão "Convidar" dedicado no header do quadro** (`BoardDetail.tsx`), com ícone `UserPlus`, rótulo visível no mobile (não só ícone), estilo `variant="outline"` com destaque em cor primária. Fica ao lado da pilha de avatares.
- **Estado vazio explícito**: quando o quadro tem só o dono, exibir uma faixa fina abaixo do header — "Trabalhe em equipe: convide alguém para colaborar neste quadro" com CTA "Convidar" — que desaparece após o primeiro membro entrar.
- **Banner de convites pendentes também dentro do BoardDetail** (não só na lista `/tasks`). Se você tem convite para este quadro específico, aparece uma faixa no topo.
- **Sheet de convite (`BoardInviteDialog`)**: reforçar hierarquia — bloco "Seu código" em card destacado no topo com botão "Copiar" grande, bloco "Convidar por código" com input grande e botão largo, lista de membros embaixo com papel em pill colorido. Adicionar contagem "(N membros)" no título.

## 2. Detalhes da tarefa — grid de ícones (padrão Financeiro)

Substituir as `Tabs` horizontais atuais (que exigem scroll horizontal no mobile — visível no print) por um **grid de tiles com ícone em cima e nome em baixo**, igual ao exemplo de referência do "Financeiro".

Layout em `TaskDetailDrawer.tsx`:

```text
[  Detalhes   ] [  Checklist ]      ← 2 col no mobile (<640px)
[  Membros    ] [ Comentários]      ← 3 col em sm+ (Detalhes | Checklist | Membros | Comentários | Tempo | Anexos)
[  Tempo      ] [   Anexos   ]
```

- Cada tile: `rounded-xl border bg-card`, ícone 20-24px no topo centralizado, rótulo abaixo, badge de contagem no canto superior direito (`0/1`, número de comentários, tempo total curto).
- Tile ativo: `bg-primary text-primary-foreground` (mesmo destaque do "Resumo" na referência).
- Após tocar num tile, o conteúdo da seção abre **abaixo do grid** (permanece no mesmo Sheet, sem navegação). Botão sutil "voltar aos atalhos" no topo da seção para colapsar de volta ao grid.
- No desktop (sm+), o grid vira 3 colunas e o conteúdo aparece ao lado (grid `sm:grid-cols-[180px_1fr]`), preservando fluidez.
- Manter os mesmos ids/tradução das abas (`kanban.tab_details`, `tab_checklist`, `tab_members`, `tab_comments`, `tab_time`) e adicionar `tab_attachments`.

## 3. Lacunas ainda em aberto do plano Kanban

Verificado no código atual:

- **Anexos**: tabela `task_attachments` já existe no banco, mas não há UI. Adicionar aba "Anexos" no novo grid, com upload para storage (bucket `task-attachments` a criar) — apenas frontend + criação de bucket, sem mexer em lógica de negócio.
- **Descrição/edição do quadro**: hoje só criamos quadros; falta editar título, descrição, cor e projeto vinculado depois. Adicionar item "Editar quadro" no `DropdownMenu` do card em `Tasks.tsx` e um dialog reutilizando o formulário de criação.
- **Paleta de cores da coluna**: usuário reportou que sai cinza. Auditar `useCreateColumn`/`useUpdateColumn`: garantir que o color-picker aplique um valor default vívido (ex.: `#3b82f6`) e mostrar swatches no diálogo de criação — não só no de edição.
- **Cores extras do quadro**: já temos 16 cores em `BOARD_COLORS`, mas o modal só mostra uma linha apertada. Reorganizar em grid 8×2 com preview do banner colorido em tempo real.
- **Indicador "quem está focando"** já existe no `TaskCard`; adicionar contraparte discreta na **coluna** (badge "N focando" no header da coluna) para o dono do quadro ver atividade agregada.
- **i18n**: adicionar chaves novas (`kanban.invite_cta`, `kanban.empty_team_hint`, `kanban.tab_attachments`, `kanban.edit_board`, `kanban.tile_*`) em todos os 12 locales.

## Arquivos afetados

- `src/components/kanban/TaskDetailDrawer.tsx` — substituir `Tabs` por grid de tiles + seção expandível.
- `src/components/kanban/BoardInviteDialog.tsx` — hierarquia visual do Sheet.
- `src/pages/BoardDetail.tsx` — botão "Convidar" destacado, faixa de estado vazio, banner de convites pendentes escopado.
- `src/pages/Tasks.tsx` — item "Editar quadro" no menu + dialog de edição.
- `src/components/kanban/TaskAttachments.tsx` (novo) — upload/listar anexos.
- `supabase/migrations/*` — criar bucket `task-attachments` com políticas por `board_members`.
- `src/i18n/locales/*.json` — 12 idiomas.

## Fora de escopo (evitar quebrar o que funciona)

- Não vou mexer no DnD do quadro, no `useTasks`, nas RPCs de colaboração nem no rastreamento de tempo — tudo isso continua igual. A mudança é 100% de UI/UX e uma tabela de anexos que já existe.
