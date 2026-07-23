# Plano de evolução do Kanban Timezoni

## Contexto atual
O módulo Kanban já existe com tabelas `boards`, `board_columns`, `tasks`, `task_labels`, `task_checklists`, `task_comments`, `task_time_logs` e `task_attachments`. O `time_entries` já tem `task_id`, então conseguimos rastrear quem está focando em cada tarefa em tempo real. O que falta é: compartilhamento/convite, atribuição de membros às tarefas, cores nas colunas, mais opções visuais para quadros e traduções completas.

## Objetivos desta fase
1. Permitir convidar pessoas para um quadro (por amigo ou friend-code) e atribuir membros às tarefas.
2. Mostrar foto/nome de quem está ativo na tarefa (time_entries sem `end_time`).
3. Adicionar seletor de cor na criação/edição de colunas e expandir paleta de cores dos quadros.
4. Permitir editar/visualizar descrição de quadros e colunas.
5. Manter tudo responsivo para mobile, que é 90% dos usuários.
6. Traduzir todas as novas strings para os 12 idiomas suportados.

---

## 1. Banco de dados — colaboração

### Criar tabelas novas
- `board_invitations` (id, board_id, inviter_id, invitee_id, status, created_at, updated_at)
- `board_members` (id, board_id, user_id, role, added_at)
- `task_members` (id, task_id, user_id, assigned_by, assigned_at)

### Alterar tabelas existentes
- `tasks`: adicionar `owner_id` (uuid) para distinguir criador da tarefa de membros atribuídos.
- `boards`: manter `user_id` como criador, mas permitir acesso a `board_members`.
- `board_columns`: manter `user_id` como criador da coluna.

### RLS
- `board_invitations`: convites só podem ser lidos/criados/aceitos pelos participantes.
- `board_members`: quem pertence ao board pode ver; quem criou o board pode gerenciar.
- `tasks`: quem criou o board, é membro do board ou é `owner_id` da tarefa pode ver/editar.
- `task_members`: quem tem acesso ao board pode ver; quem criou a tarefa ou é owner pode atribuir/remover.
- `time_entries` com `task_id`: membros do board podem ver entradas ativas (sem `end_time`) das tarefas do board para mostrar quem está focando agora.

### Funções/Triggers
- Função `is_board_member(_board_id, _user_id)` para simplificar políticas.
- Trigger para manter `updated_at` nas novas tabelas.

---

## 2. Backend — hooks e lógica

### Novos hooks
- `useBoardMembers(boardId)`: lista membros do quadro com perfil (avatar, nome).
- `useBoardInvitations(boardId)`: enviar, aceitar, recusar e listar convites pendentes.
- `useTaskMembers(taskId)`: adicionar/remover/ver atribuídos da tarefa.
- `useActiveTaskWorkers(taskIds)`: retorna, para cada tarefa, usuários com `time_entries` sem `end_time`.

### Ajustes nos hooks existentes
- `useTasks(boardId)`: passar a buscar tarefas de todos os membros do board, não só do usuário logado.
- `useBoards`: mostrar quadros que o usuário criou ou que foi convidado.
- `useCreateTask`: permitir atribuir membros no momento da criação.
- `useUpdateTask`: permitir alterar `owner_id` (delegar) e adicionar/remover atribuídos.

---

## 3. Interface — convites e membros

### `src/pages/Tasks.tsx` (listagem de quadros)
- Expandir `BOARD_COLORS` para pelo menos 16 cores (incluindo tons pastel e vibrantes).
- Adicionar botão de editar quadro em cada card (título, descrição, cor, projeto vinculado).
- Exibir descrição do quadro quando houver.
- Mostrar avatares dos membros do quadro em cada card (até 4 avatares, depois "+N").
- Adicionar botão "Convidar" por friend-code ou busca por nome/código.
- Listar convites pendentes recebidos com aceitar/recusar.

### `src/pages/BoardDetail.tsx` (quadro)
- Seletor de cor na criação de nova coluna e na edição de coluna existente.
- Usar a cor da coluna no header e no anel lateral.
- Diálogo para convidar pessoas para o quadro.
- Painel lateral "Membros" mostrando quem está no board e quem está focando agora em qual tarefa.
- No mobile: as colunas continuam como acordeão vertical; header do board fica compacto.

### `src/components/kanban/TaskCard.tsx`
- Mostrar avatares dos atribuídos (até 3, depois "+N").
- Indicador pulsante laranja quando alguém está focando na tarefa agora.
- Tooltip/label com nome de quem está focando.

### `src/components/kanban/TaskDetailDrawer.tsx`
- Nova aba "Membros" ou seção no topo do drawer:
  - Listar atribuídos com avatar e nome.
  - Botão para adicionar/remover atribuídos (somente criador da tarefa ou owner do board).
  - Mostrar "focando agora" com tempo corrido quando houver time_entry ativa.
- Aba "Tempo": histórico de time logs e entradas ativas.
- Aba "Comentários": manter, mas permitir menção a membros (@nome).

### `src/components/kanban/TaskFormDialog.tsx`
- Campo para atribuir membros do board já na criação.
- Checkbox para marcar como concluída (já existe via status).

---

## 4. Mobile-first e UX

- Nenhum scroll horizontal na tela do quadro. Colunas como acordeão vertical já implementado; manter e refinar.
- Botões de ação com altura mínima 44px.
- Avatares em tamanho pequeno (24px) para não poluir cards.
- Sheet/drawer nativo do shadcn para convites e atribuições no mobile.
- Feedback sonner/toast para convites aceitos, membros adicionados e tarefas delegadas.

---

## 5. Traduções

Criar/expandir o objeto `kanban` em todos os 12 locales:
- `pt-BR`, `en-US`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`, `ja-JP`, `ko-KR`, `zh-CN`, `ru-RU`, `ar-SA`, `id-ID`.

Novas chaves necessárias:
- `kanban.title`, `kanban.subtitle`, `kanban.page_title`
- `kanban.new_board`, `kanban.edit_board`, `kanban.board_title`, `kanban.board_description`, `kanban.board_color`, `kanban.linked_project`, `kanban.no_project`
- `kanban.new_column`, `kanban.edit_column`, `kanban.column_title`, `kanban.column_color`, `kanban.wip_limit`
- `kanban.new_task`, `kanban.edit_task`, `kanban.task_title`, `kanban.task_description`, `kanban.due_date`, `kanban.priority`, `kanban.estimated_time`
- `kanban.members`, `kanban.invite`, `kanban.invite_by_code`, `kanban.pending_invites`, `kanban.accept`, `kanban.reject`, `kanban.remove_member`
- `kanban.assign_members`, `kanban.assigned`, `kanban.working_now`, `kanban.working_now_with_name`
- `kanban.empty_boards`, `kanban.empty_columns`, `kanban.empty_tasks`, `kanban.start_focus`
- `kanban.delete_board_title`, `kanban.delete_board_desc`, `kanban.delete_column_title`, `kanban.delete_column_desc`, `kanban.delete_task_title`, `kanban.delete_task_desc`
- `kanban.favorite`, `kanban.unfavorite`, `kanban.archive`, `kanban.unarchive`
- `kanban.reports`, `kanban.calendar`, `kanban.back_to_boards`

Usar o script Python de sincronização de traduções para manter consistência entre idiomas.

---

## 6. Fluxo de testes e validação

1. Verificar tipos com `tsgo` (TypeScript-only check).
2. Testar visualmente no preview mobile (viewport 375x812) e desktop (1280x800).
3. Verificar migrations e RLS com o script de teste local se disponível.
4. Validar traduções: garantir que nenhuma nova string fique sem fallback no `t()`.

---

## Entregáveis
- Migration SQL para `board_members`, `board_invitations`, `task_members` e alterações de RLS.
- Hooks colaborativos (`useBoardMembers`, `useBoardInvitations`, `useTaskMembers`, `useActiveTaskWorkers`).
- UI atualizada: `Tasks.tsx`, `BoardDetail.tsx`, `TaskCard.tsx`, `TaskDetailDrawer.tsx`, `TaskFormDialog.tsx`.
- Traduções sincronizadas em 12 idiomas.
- Testes de tipos e preview mobile.

---

## Próximos passos
Após aprovação, implemento na ordem: banco → hooks → UI → traduções → validação.