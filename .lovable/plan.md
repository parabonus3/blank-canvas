## Plano: Kanban nível Trello — funcionalidades finais

Encadeamos os 6 pontos que faltam. Tudo mobile-first, respeitando papéis (`owner`/`editor` podem editar, `viewer` só lê) e traduzido nos 12 idiomas.

### 1. Editar quadro (título, descrição, cor)
- Novo `EditBoardDialog.tsx` (Sheet no mobile) acionado por botão de lápis no header de `BoardDetail.tsx`, ao lado do título.
- Campos: título (input), descrição (textarea curta) e paleta com 12 cores predefinidas (mesma paleta usada em outros lugares do app).
- Reusar `useUpdateBoard` já existente em `useBoards.ts` (verificar; se faltar, adicionar mutation).
- Descrição aparece abaixo do título do quadro num bloco discreto (colapsável no mobile).
- Só dono edita; para editor/viewer o botão some.

### 2. Palette real nas cores das colunas
- Em `BoardColumnDialog` (criar/editar coluna) substituir o input cinza por um grid 6×2 de swatches com as mesmas 12 cores da paleta do quadro + "Sem cor".
- A cor selecionada vira a borda superior (barra de 3px) da coluna no board e o fundo translúcido do header da coluna — sem quebrar o layout atual, só adicionando `style={{ borderTopColor }}`.
- Migration não precisa: a coluna `color` já existe em `board_columns`.

### 3. Anexos em tarefas
Backend (migration):
- Bucket de Storage `task-attachments` (privado). RLS de leitura via prefixo `board_id/task_id/…` reutilizando `can_access_task`.
- Tabela `task_attachments` já existe (vista no schema). Confirmar policies e adicionar as que faltarem para editor/owner via `can_edit_task`.

Frontend:
- Nova aba "Anexos" no `TaskDetailDrawer` (já tem o grid de tiles — encaixa perfeitamente).
- Upload por clique ou drag-and-drop; preview inline para imagem, ícone genérico para PDF/outros. Limite 10 MB por arquivo, aviso amigável se excedido.
- Hook `useTaskAttachments.ts` (list/upload/delete) com signed URL para preview.
- Viewer não vê botão de upload/delete; só baixa.

### 4. Seção "Atividade" (histórico de mudanças)
Backend (migration):
- Tabela `task_activity` com colunas de domínio: `task_id`, `user_id`, `action_type` (`created` | `title_changed` | `status_changed` | `moved_column` | `member_added` | `member_removed` | `checklist_added` | `checklist_completed` | `comment_added` | `attachment_added` | `label_added` | `due_date_changed`) e `metadata jsonb` (antes/depois).
- Triggers `AFTER INSERT/UPDATE/DELETE` em `tasks`, `task_checklists`, `task_members`, `task_comments`, `task_labels`, `task_attachments` que registram automaticamente na `task_activity`.
- GRANTs corretos + RLS: SELECT para membros do quadro; INSERT só via trigger (revoga para roles).

Frontend:
- Nova aba "Atividade" no drawer, timeline vertical com avatar + frase i18n ("{{name}} concluiu «{{title}}»", "{{name}} moveu para «Em progresso»", etc.) + tempo relativo.
- Hook `useTaskActivity.ts` com Realtime subscribe.

### 5. Capas em cards
- Reaproveitar `task_attachments`: adicionar coluna `cover_attachment_id uuid` em `tasks` (nullable, FK para `task_attachments`).
- Botão "Definir como capa" em cada anexo de imagem dentro do drawer.
- No `TaskCard`, se `cover_attachment_id` estiver setado e o anexo for imagem, renderizar a imagem no topo do card (altura 96px mobile / 120px desktop) com `object-cover` e cantos arredondados combinando com o card. Se não tiver capa, layout continua igual.

### 6. @menções em comentários
- Editor de comentário em `TaskDetailDrawer` detecta `@` e abre popover com os membros do quadro (busca por nome, mobile-friendly com Sheet inferior em telas <640px).
- Ao inserir, salva no texto como token `@[Nome](user_id)`; renderiza como pill clicável.
- Trigger no banco: quando `task_comments` for inserido e o `content` casar `@\[.*?\]\((uuid)\)`, inserir em `notification_log` (kind `task_mention`) e chamar `dispatch_chat_mentions`-like (reaproveitar padrão existente).
- Highlight visual dos comentários onde o usuário atual foi mencionado (borda esquerda accent).

### Ordem de entrega (uma rodada por bloco para revisar entre passos)
1. Editar quadro + palette de colunas (baixo risco, ganho visual imediato).
2. Anexos + capas (encadeados, mesma tabela).
3. Atividade da tarefa.
4. @menções em comentários.

### Detalhes técnicos
Arquivos novos:
- `src/components/kanban/EditBoardDialog.tsx`
- `src/components/kanban/ColorPalettePicker.tsx` (reutilizado por quadro e coluna)
- `src/hooks/useTaskAttachments.ts`
- `src/hooks/useTaskActivity.ts`
- `src/components/kanban/TaskAttachmentsTab.tsx`
- `src/components/kanban/TaskActivityTab.tsx`
- `src/components/kanban/MentionInput.tsx`

Arquivos alterados:
- `src/pages/BoardDetail.tsx` (botão editar, descrição, top-bar da coluna com cor real)
- `src/components/kanban/TaskCard.tsx` (capa)
- `src/components/kanban/TaskDetailDrawer.tsx` (abas Anexos, Atividade, editor com menções)
- `src/hooks/useBoards.ts` / `useBoardColumns.ts` (garantir mutations de update)
- `src/i18n/locales/*.json` (chaves de atividade, anexos, editar quadro, menções)

Migrations:
- Bucket `task-attachments` + policies.
- Ajustes de policies em `task_attachments` conforme `can_edit_task`.
- Tabela `task_activity` + triggers em todas as tabelas relacionadas.
- Coluna `tasks.cover_attachment_id`.

Fora do escopo: due-date com calendário avançado (repetição custom), automações tipo "quando mover para X, marcar concluído", múltiplas visualizações (calendar/timeline). Aviso se quiser encaixar depois.
