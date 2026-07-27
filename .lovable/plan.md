# Plano: Colaboração Kanban nível Trello (mobile-first)

## 1. Comentários com autor visível
Hoje `TaskDetailDrawer` mostra apenas texto + timestamp — sem avatar/nome de quem comentou, e sem realtime. Quando várias pessoas comentam, ninguém sabe quem falou.

- Buscar perfis dos autores em `useTaskComments` (join com `profiles` como já fazemos em `useBoardCollab`), retornando `display_name` + `avatar_url`.
- Renderizar cada comentário com: avatar à esquerda, nome + horário na primeira linha, texto abaixo (padrão Trello/Slack).
- Botão apagar só aparece para o autor do comentário.
- Realtime: assinar `postgres_changes` em `task_comments` filtrado por `task_id`, invalidando a query (padrão dos outros hooks colaborativos).
- Traduzir "Você" / "há X min" via `date-fns` locale já configurado.

## 2. Convidar amigos direto (sem código)
Fluxo atual força o dono a copiar/colar friend code — muita fricção.

- Em `BoardInviteDialog`, adicionar uma seção "Seus amigos" acima do campo de código:
  - Lista os amigos aceitos (via `useFriendships`) com avatar + nome.
  - Cada linha tem estado: **Membro** (já entrou, com check verde), **Convidado** (pendente, com botão "Cancelar"), ou **Convidar** (botão primário).
  - Clicar em Convidar chama a mesma RPC `invite_to_board_by_code` usando o `friend_code` do amigo (buscado no hook) — reaproveitamos toda a infra existente, zero mudança de backend.
- Manter o campo "Convidar por código" recolhido em um `<details>` para casos de não-amigos.
- Adicionar hook auxiliar `useBoardInvitationsForBoard(boardId)` para o dono ver convites pendentes que ele enviou (necessário para o estado "Convidado" e para cancelar).
- Cancelar convite = update `board_invitations.status = 'cancelled'` (o RLS de UPDATE do inviter já permite).

## 3. Convite explícito no card da tarefa
Na aba "Membros" da tarefa hoje só temos o `TaskMemberAssigner` (lista de membros do board). Vamos:
- Mostrar avatares em grade (2 col mobile / 3-4 desktop) com nome abaixo, seguindo o mesmo padrão de tiles que aplicamos no drawer.
- Membros já atribuídos ganham anel primário + check; clicar toggla atribuir/remover.
- Se o board tem só o dono, mostrar CTA "Convidar amigos" que abre o `BoardInviteDialog`.

## 4. Diferenciais Trello ainda faltantes (mobile-first)
Incluir nesta rodada:
- **Editar quadro** (título, descrição, cor): dialog acionado pelo header — hoje só criamos, não editamos.
- **Cores nas colunas**: o form atual salva `color` mas o seletor está cinza; adicionar palette de 8 cores semânticas com preview no chip da coluna.
- **Atividade da tarefa**: seção "Atividade" (opcional para esta rodada) — pode ficar para próxima entrega se preferir manter o escopo curto.
- **Anexos**: já temos tabela `task_attachments` + bucket. Fica para próxima rodada (avisar caso o usuário queira nesta).

## 5. i18n
Novas chaves em 12 idiomas via script:
- `kanban.invite_friends`, `kanban.friends_on_board`, `kanban.friend_status_member`, `kanban.friend_status_invited`, `kanban.cancel_invite`, `kanban.no_friends_yet`, `kanban.invite_by_code_advanced`, `kanban.comment_by`, `kanban.edit_board`, `kanban.column_color`.

## Fora do escopo (posso encadear depois)
Anexos com upload, seção "Atividade" com histórico de mudanças, due date reminders push, capa/cover em cards, votos/likes em comentários.

## Detalhes técnicos
- Arquivos alterados: `src/hooks/useTaskComments.ts` (perfis + realtime), `src/components/kanban/TaskDetailDrawer.tsx` (comentário com autor + grid de membros), `src/components/kanban/BoardInviteDialog.tsx` (lista de amigos), `src/hooks/useBoardCollab.ts` (novo `useBoardOutgoingInvitations`, cancel action), `src/components/kanban/TaskMemberAssigner.tsx` (grid de tiles), `src/pages/BoardDetail.tsx` (dialog de editar quadro + palette), `src/hooks/useBoardColumns.ts` (garantir persistência de color), locales `*.json`.
- Sem migrações; usamos `board_invitations.status='cancelled'` já suportado pelo RLS.
- Realtime dos comentários segue o padrão de nome de canal único (`Math.random()`) já em uso.

Me confirma se quer que eu inclua "Editar quadro" + "Cores nas colunas" nesta mesma leva, ou prefere que eu fique só nos itens 1–3 (comentários + convite de amigos) primeiro?