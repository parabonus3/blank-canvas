# Plano — Módulo Kanban de Tarefas no Timezoni

## Visão geral

Criar uma nova seção de **Organização de Tarefas** (Kanban) dentro do Timezoni, com visual profissional, foco em mobile, integração nativa ao timer de foco e reaproveitamento dos projetos/categorias já existentes. Tarefas no Kanban contam tempo e progressam para metas dos projetos vinculados.

**Princípios-guia:**
- Mobile-first: 90% dos usuários usam mobile.
- Sem scroll horizontal no mobile: colunas viram seções verticais colapsáveis.
- Integração com timer: cada card pode iniciar uma sessão de foco; o tempo registra no projeto e na tarefa.
- Reaproveitamento: não duplicar projetos/categorias; as tarefas pertencem a projetos existentes.
- Sem quebrar o que existe: tudo em novas tabelas/caminhos, com RLS e GRANTs corretos.
- 12 idiomas: todas as chaves de i18n cobertas.

---

## 1. Banco de dados (Supabase)

### 1.1 Novas tabelas

Todas as tabelas seguem a ordem: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY.

#### `boards` (quadros Kanban)
- `id` uuid PK
- `user_id` uuid FK → profiles.id (owner do quadro)
- `project_id` uuid FK → projects.id (opcional; se vinculado, o tempo das tarefas soma no projeto)
- `title` text
- `description` text nullable
- `color` text nullable
- `is_favorite` boolean default false
- `is_archived` boolean default false
- `created_at`, `updated_at` timestamps
- `position` int default 0
- **RLS**: usuário pode CRUD seus próprios quadros.

#### `board_columns` (colunas do quadro)
- `id` uuid PK
- `board_id` uuid FK → boards.id ON DELETE CASCADE
- `title` text
- `color` text nullable
- `position` int default 0
- `limit` int nullable (limite de cards por coluna, WIP)
- `created_at`, `updated_at`
- **RLS**: acesso pelo owner do board.

#### `tasks` (cards de tarefa)
- `id` uuid PK
- `board_id` uuid FK → boards.id ON DELETE CASCADE
- `column_id` uuid FK → board_columns.id ON DELETE SET NULL (quando a coluna é excluída, cards vão para "sem coluna")
- `user_id` uuid FK → profiles.id
- `project_id` uuid FK → projects.id (opcional; se vinculado, tempo soma no projeto)
- `title` text
- `description` text nullable
- `priority` text: `low`, `medium`, `high`, `urgent`
- `status` text: `todo`, `in_progress`, `done`, `archived`
- `due_date` timestamptz nullable
- `recurrence_type` text: `none`, `daily`, `weekly`, `monthly`, `weekdays` nullable
- `recurrence_days` int[] nullable (dias da semana)
- `estimated_minutes` int nullable
- `total_tracked_seconds` int default 0 (tempo já contabilizado na tarefa)
- `is_completed` boolean default false
- `completed_at` timestamptz nullable
- `position` int default 0 (dentro da coluna)
- `created_at`, `updated_at`
- **RLS**: usuário pode CRUD suas próprias tarefas.

#### `task_labels` (etiquetas de cor por tarefa)
- `id` uuid PK
- `task_id` uuid FK → tasks.id ON DELETE CASCADE
- `name` text
- `color` text
- `created_at`
- **RLS**: acesso via owner da tarefa/board.

#### `task_checklists` (subtarefas internas de um card)
- `id` uuid PK
- `task_id` uuid FK → tasks.id ON DELETE CASCADE
- `title` text
- `is_completed` boolean default false
- `position` int default 0
- `created_at`, `updated_at`
- **RLS**: acesso via owner da tarefa.

#### `task_comments` (comentários no card)
- `id` uuid PK
- `task_id` uuid FK → tasks.id ON DELETE CASCADE
- `user_id` uuid FK → profiles.id
- `content` text
- `created_at`, `updated_at`
- **RLS**: acesso via owner da tarefa.

#### `task_attachments` (anexos — referência a storage)
- `id` uuid PK
- `task_id` uuid FK → tasks.id ON DELETE CASCADE
- `user_id` uuid FK → profiles.id
- `file_name` text
- `storage_path` text
- `file_type` text
- `file_size` int
- `created_at`
- **RLS**: acesso via owner da tarefa.

#### `task_time_logs` (histórico de tempo apontado manualmente na tarefa)
- `id` uuid PK
- `task_id` uuid FK → tasks.id ON DELETE CASCADE
- `user_id` uuid FK → profiles.id
- `seconds` int
- `logged_at` timestamptz default now()
- `note` text nullable
- **RLS**: acesso via owner.

### 1.2 Alteração em tabela existente

- `time_entries`: adicionar `task_id` uuid FK → tasks.id nullable.
  - Quando o timer é iniciado a partir de uma tarefa, `project_id` e `task_id` são preenchidos.
  - Trigger/atualização em batch incrementa `tasks.total_tracked_seconds` quando `time_entries` com `task_id` recebe `duration`.

### 1.3 Realtime

Habilitar realtime para:
- `boards` (compartilhamento futuro)
- `board_columns`
- `tasks`
- `task_checklists`

### 1.4 Índices

- `idx_tasks_board_id_column_id_position`
- `idx_tasks_project_id_user_id`
- `idx_tasks_due_date`
- `idx_board_columns_board_id_position`

---

## 2. Backend (Supabase)

### 2.1 Migrations

Migration única: `YYYYMMDDHHMMSS_add_kanban_module.sql` com:
1. CREATE TABLE de todas as tabelas novas.
2. GRANTs para `authenticated` e `service_role`.
3. ENABLE RLS.
4. CREATE POLICY para cada tabela.
5. ALTER TABLE `time_entries` ADD COLUMN `task_id`.
6. Trigger/Function para atualizar `tasks.total_tracked_seconds` ao finalizar `time_entries`.
7. Realtime publication.

### 2.2 Funções úteis (RPC)

- `reorder_task(_task_id, _new_column_id, _new_position)`: move card entre colunas e reordena.
- `duplicate_task(_task_id)`: clona tarefa com subtarefas e labels.
- `archive_completed_tasks(_board_id)`: move tarefas concluídas para coluna "Concluído".
- `get_board_time_summary(_board_id, _period)`: retorna tempo total do quadro (usado em dashboards).

### 2.3 Storage bucket

- Novo bucket privado `task-attachments`.
- RLS: acesso ao owner da tarefa.

---

## 3. Frontend — arquitetura

### 3.1 Roteamento e navegação

- Nova rota em `src/App.tsx`: `/tasks` (Kanban principal).
- Adicionar item no sidebar: `sidebar.tasks` com ícone Kanban (usar `Layout` ou `KanbanSquare` do lucide-react).
- Nova rota: `/tasks/board/:id` (quadro específico).
- Nova rota: `/tasks/calendar` (visão calendário/planner).
- Nova rota: `/tasks/reports` (dashboards simples de tempo).

### 3.2 Hooks novos (`src/hooks/`)

- `useBoards.ts`: CRUD de quadros, favoritos, arquivar.
- `useBoardColumns.ts`: CRUD e reordenação de colunas.
- `useTasks.ts`: CRUD, filtro, busca, reordenação.
- `useTaskLabels.ts`: CRUD de etiquetas.
- `useTaskChecklists.ts`: subtarefas.
- `useTaskComments.ts`: comentários.
- `useTaskAttachments.ts`: upload/download.
- `useTaskTimeLogs.ts`: apontamento manual de tempo.
- `useKanbanDrag.ts`: abstração sobre `@dnd-kit/core` para drag-and-drop.

### 3.3 Componentes novos (`src/components/kanban/`)

- `KanbanBoard.tsx`: página principal, gerencia boards.
- `BoardView.tsx`: visualização do quadro com colunas.
- `BoardColumn.tsx`: coluna individual com título, contador, WIP.
- `TaskCard.tsx`: card de tarefa com título, prioridade, etiquetas, due date, checklist, tempo.
- `TaskDetailDrawer.tsx`: drawer (mobile) / dialog (desktop) com abas: detalhes, subtarefas, comentários, anexos, tempo.
- `TaskFormDialog.tsx`: criação/edição de tarefa.
- `ColumnFormDialog.tsx`: criação/edição de coluna.
- `BoardFormDialog.tsx`: criação/edição de quadro.
- `KanbanCalendar.tsx`: planner/calendário com tarefas por data.
- `KanbanReports.tsx`: mini dashboards: tempo por quadro, tarefas concluídas, distribuição por prioridade.
- `PriorityBadge.tsx`, `DueDateBadge.tsx`, `TaskLabelChip.tsx`: micro-componentes.
- `MobileBoardNav.tsx`: navegação por abas no mobile: Quadro | Calendário | Relatórios.

### 3.4 Drag-and-drop

- Usar `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (moderno, acessível, funciona bem em mobile).
- Reordenar cards dentro da mesma coluna e entre colunas.
- Otimização: usar `useMemo` e `memo` para não re-renderar cards desnecessariamente.

---

## 4. Mobile-first: sem scroll horizontal

### 4.1 Layout mobile padrão

- O board não terá scroll horizontal.
- Cada coluna vira um card vertical colapsável (`Accordion` do shadcn).
- Padrão: coluna "Em andamento" aberta; outras fechadas.
- Botão flutuante para adicionar tarefa rápida.
- Top bar com: título do board, seletor de projeto, abas Quadro/Calendário/Relatórios.

### 4.2 Layout desktop

- Board horizontal com scroll horizontal controlado (mouse + touchpad).
- Colunas lado a lado com altura fixa e scroll vertical interno.

### 4.3 Interações touch

- Swipe no card para abrir menu de ações rápidas (concluir, mover, excluir).
- Long-press para iniciar drag-and-drop no mobile.

---

## 5. Integração com timer

### 5.1 Alteração no hook `useStartTimer` (`useTimeEntries.ts`)

- Aceitar parâmetro opcional `taskId`.
- Ao iniciar, preencher `time_entries.task_id`.
- Exibir título da tarefa ativa na mini-barra do timer e na tela cheia.

### 5.2 Alteração em `Index.tsx`

- Se o timer foi iniciado de uma tarefa, manter o `taskId` na sessão ativa.
- Ao parar, o tempo é contabilizado no projeto e na tarefa (via trigger no `time_entries`).
- Botão "Iniciar foco" aparece em cada card de tarefa; se já houver sessão ativa, desabilita.

### 5.3 Apontamento manual de tempo

- No drawer da tarefa, usuário pode adicionar tempo manualmente (ex: reunião de 30 min) sem usar o timer.
- Isso cria um `task_time_logs` e atualiza `total_tracked_seconds`.

### 5.4 Progresso para metas

- O tempo de `time_entries` vinculado a `project_id` de uma tarefa já conta para `goals` existentes.
- O dashboard do Kanban mostra tempo total por projeto e progresso da meta semana/dia.

---

## 6. Reuso de entidades existentes

- **Projetos**: cada tarefa pode ser vinculada a um projeto existente. Quadro também pode ter um projeto default.
- **Categorias**: filtros por categoria usam o projeto vinculado.
- **Tags**: reaproveitar tabela `tags` + `time_entry_tags`? Não — melhor criar etiquetas específicas do Kanban (`task_labels`) para evitar conflito semântico. Mas usar visualmente o mesmo componente `Badge`.
- **Checklists**: reaproveitar a UI/UX do `ChecklistItem.tsx` para `task_checklists`.
- **Soft-lock**: integrar com `useFreeLocks` para limitar quadros/cards/tarefas no plano Free (oldest N free, resto com cadeado).

---

## 7. i18n (12 idiomas)

Adicionar chaves em `src/i18n/locales/*.json`:
- `sidebar.tasks`
- `kanban.title`, `kanban.boards`, `kanban.columns.*`
- `kanban.tasks.*` (criar, editar, excluir, concluir, mover)
- `kanban.priority.low/medium/high/urgent`
- `kanban.recurrence.*`
- `kanban.timer.start`, `kanban.timer.stop`, `kanban.timer.manual_log`
- `kanban.reports.*`
- `kanban.empty.*`
- `kanban.upsell.*` (free tier limitado)

Criar script Python para inserir as chaves em todos os arquivos de forma consistente (igual à abordagem usada para `rooms.*`).

---

## 8. Fases de implementação (ordem de construção)

A entrega final será completa, mas construída em camadas para garantir estabilidade e testes a cada passo.

### Fase 1 — Fundação e schema
- Migration de banco com todas as tabelas, RLS, GRANTs, realtime e `task_id` em `time_entries`.
- Atualizar `src/integrations/supabase/types.ts` (se necessário, via CLI; não editar manualmente).
- Criar hooks base: `useBoards`, `useBoardColumns`, `useTasks`.

### Fase 2 — UI básica do board
- Página `/tasks` com listagem de quadros.
- Página `/tasks/board/:id` com colunas e cards estáticos (sem drag).
- Componentes `BoardView`, `BoardColumn`, `TaskCard`, `TaskDetailDrawer`.
- Adicionar sidebar e rotas.
- i18n básico para navegação e ações.

### Fase 3 — Drag-and-drop e reordenação
- Integrar `@dnd-kit`.
- Mover cards entre colunas e reordenar.
- RPC `reorder_task`.
- Otimização de re-render.

### Fase 4 — Timer e tempo
- Alterar `useStartTimer` e `Index.tsx` para aceitar `taskId`.
- Adicionar botão de foco nos cards.
- Apontamento manual de tempo.
- Dashboard de tempo (`KanbanReports`).
- Trigger para somar `total_tracked_seconds`.

### Fase 5 — Recursos avançados
- Etiquetas (`task_labels`).
- Subtarefas (`task_checklists`).
- Comentários (`task_comments`).
- Anexos (`task_attachments` + storage bucket).
- Tarefas recorrentes (lógica de clonagem).
- Calendário/planner (`KanbanCalendar`).
- Favoritar, arquivar, duplicar tarefa.

### Fase 6 — Mobile-first e polimento
- Layout mobile vertical sem scroll horizontal.
- Swipe/long-press, ações rápidas.
- Testes em viewport mobile 375px.
- Ajustes de i18n, traduções, acessibilidade.
- Integração com `useFreeLocks` para limites do plano Free.

---

## 9. Limites do plano Free (reaproveitando `useFreeLocks`)

- **Free (trial expirado)**: até 3 quadros, 5 colunas por quadro, 30 tarefas por quadro. Anexos e comentários limitados.
- **Pro**: quadros e colunas ilimitados; tarefas ilimitadas.
- Exibir cadeado e banner de upgrade quando o limite for atingido.
- Não excluir dados: apenas bloquear criação/edição e exibir upgrade prompt.

---

## 10. Testes e validação

- Typecheck/build: `bun run build` (ou comando do projeto).
- Verificar i18n em PT, EN, JA, KO, DE.
- Testar mobile 375px e 390px: sem scroll horizontal, drag funcional.
- Testar timer iniciando a partir de uma tarefa e verificando `time_entries.task_id`.
- Testar soft-lock: criar mais tarefas que o limite Free e confirmar cadeado.
- Testar drag-and-drop entre colunas e reordenação.

---

## 11. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Scroll horizontal no mobile | Usar layout vertical colapsável; nunca usar colunas lado a lado no mobile. |
| Performance com muitos cards | Virtualização se necessário; otimização com memo; carregamento por coluna. |
| Drag-and-drop quebrar touch | Usar `@dnd-kit` com sensores touch configurados; fallback de botões de mover. |
| Conflito de queryKey no TanStack | Usar chaves bem namespaces: `["boards", userId]`, `["tasks", boardId]`, `["columns", boardId]`. |
| Quebra do timer existente | `task_id` é nullable; nenhuma alteração de contrato obrigatória. Testar regressão. |
| Traduções incompletas | Script Python para sincronizar todas as chaves nos 12 arquivos. |