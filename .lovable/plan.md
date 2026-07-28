# Plano: Colaboração Kanban — corrigir convites, autoria e permissões

## 1. Corrigir "Convidar amigos" mostrando "—" sem foto (bug)
Hoje `BoardInviteDialog` faz `select` direto em `profiles` para os amigos. Pelo RLS atual de `profiles`, esse `select` não retorna `display_name`/`avatar_url` de terceiros — por isso todas as linhas aparecem como "—" e avatar vazio (visto no print).

- Substituir `useProfilesByIds` no `BoardInviteDialog` por chamadas à RPC segura `get_member_public_stats(_user_id)` (mesma que `useFriendProfiles` e `MemberProfileModal` já usam com sucesso). Faz `Promise.all` para os `friendIds` e devolve `Map<user_id, { display_name, avatar_url }>`.
- Manter fallback de iniciais quando `display_name` for null (agora deve preencher normalmente).
- Sem mudanças de backend; a RPC já retorna exatamente o que precisamos.

## 2. Mostrar autoria no checklist da tarefa
Hoje `TaskChecklistItem` mostra apenas o texto e o checkbox; ninguém sabe quem criou nem quem marcou como concluído.

Backend (migration):
- Adicionar coluna `completed_by uuid` e `completed_at timestamptz` em `task_checklists` (nullable).
- Trigger `BEFORE UPDATE` que preenche `completed_by = auth.uid()` e `completed_at = now()` quando `is_completed` vira `true`; limpa ambos quando volta a `false`.
- Manter as políticas existentes; sem novos GRANTs (colunas ficam sob a mesma tabela).

Frontend:
- Estender `TaskChecklistItem` type com `completed_by` / `completed_at` e a coluna `user_id` (autor da criação, já existe).
- Em `ChecklistItem.tsx` (dentro do drawer da tarefa), renderizar abaixo do texto quando concluído: avatar pequeno + "feito por Nome · há X min" (usa `get_member_public_stats` cacheado por user_id, mesmo padrão do resto do drawer).
- Autor da criação aparece discreto ao lado direito quando não concluído ("criado por Nome").
- Traduções: `kanban.checklist_done_by`, `kanban.checklist_created_by` em 12 idiomas.

## 3. Checklist mais visível no card do quadro
O card já mostra o badge `n/total`. Melhorias sem poluir:
- Se algum item está concluído, mostrar mini barra de progresso (1px) abaixo do título ocupando a largura do card.
- Ao passar do 100%, badge fica verde sólido (já é verde translúcido hoje).

## 4. Papéis por membro (Editor / Visualizador)
Hoje `board_members.role` existe (`owner`/`member`), mas o dono não consegue mudar entre "pode editar" e "só vê". Vamos formalizar:

Backend:
- Migration: adicionar/normalizar valores permitidos em `board_members.role` para `owner | editor | viewer` (default `editor`). Manter linhas antigas: `UPDATE board_members SET role='editor' WHERE role='member'`.
- Atualizar as RLS/functions de `boards`, `board_columns`, `tasks`, `task_checklists`, `task_comments`, `task_members`, `task_labels` para exigir `role IN ('owner','editor')` em INSERT/UPDATE/DELETE; SELECT continua permitindo `viewer`.
- Função helper `can_edit_board(_board_id uuid)` `SECURITY DEFINER` já pode existir — se sim, adaptar; caso contrário, criar e reutilizar em todas as policies afetadas.

Frontend:
- Em `BoardInviteDialog`, cada linha da seção "Membros" ganha um `Select` com "Editor" / "Visualizador" (apenas dono vê e edita). Também permite trocar o papel de um convite pendente (armazenado em `board_invitations.role` se existir; caso contrário, aplica no aceite).
- Novo hook `useUpdateBoardMemberRole({ memberId, role })`.
- Ocultar/atenuar ações de edição para `viewer` (botões de nova coluna, nova tarefa, editar tarefa, mover, etc.) — reutilizar um `useBoardRole(boardId)` que devolve `'owner' | 'editor' | 'viewer'`.
- Badge de papel no card do membro no header (`Editor` / `Visualizador`).
- Traduções: `kanban.role_editor`, `kanban.role_viewer`, `kanban.change_role`, `kanban.viewer_locked_hint` em 12 idiomas.

## 5. Fora do escopo (para próxima rodada)
Anexos com upload, seção "Atividade" com histórico, capas em cards, votos em comentários, edição de quadro (título/cor/descrição), palette real nas colunas — me avise se quer emendar já com o item 4.

## Detalhes técnicos
Arquivos alterados:
- `src/components/kanban/BoardInviteDialog.tsx` (RPC de perfis + seletor de papel)
- `src/hooks/useBoardCollab.ts` (novo `useUpdateBoardMemberRole`, `useBoardRole`)
- `src/hooks/useTaskChecklists.ts` (novos campos)
- `src/components/checklist/ChecklistItem.tsx` (autoria)
- `src/components/kanban/TaskCard.tsx` (barra de progresso do checklist)
- `src/pages/BoardDetail.tsx` + `TaskDetailDrawer.tsx` + `TaskFormDialog.tsx` (respeitar `viewer`)
- Locales `src/i18n/locales/*.json` (novas chaves nas 12 línguas)
- Migrations: colunas de autoria em `task_checklists` + trigger; normalização de `board_members.role` + policies.
