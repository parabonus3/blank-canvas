# Correção do convite + Bloco 2 (Anexos e Capas)

## 1. Bug: "Friend code not found" ao convidar amigo

Causa confirmada: o botão "Convidar" na lista de amigos usa `useInviteFriendToBoard`, que tenta ler `profiles.friend_code` do outro usuário direto na tabela (`src/hooks/useBoardCollab.ts:365-371`). O RLS de `profiles` não permite ler linhas de terceiros, então o retorno é vazio e o código lança o erro manual "Friend code not found". Por isso a lista mostra nome/foto (que vêm de RPC segura) mas o convite falha.

Correção:
- Nova função no banco `invite_to_board_by_user(_board_id uuid, _user_id uuid)` (SECURITY DEFINER), que valida: quem chama é dono/editor do quadro, o alvo não é membro nem tem convite pendente, e cria a linha em `board_invitations` — a mesma lógica de `invite_to_board_by_code`, mas por `user_id`.
- `useInviteFriendToBoard` passa a chamar essa RPC diretamente, sem ler `profiles`.
- Mensagens de erro traduzidas (código não encontrado, já é membro, convite já enviado, sem permissão) em vez do texto fixo em inglês.

Também nesta rodada: o toast "Erro"/"✅ Convite enviado" em `useBoardCollab.ts` está hardcoded em português — passa a usar chaves i18n nos 12 idiomas.

## 2. Bloco 2: Anexos em tarefas

- Bucket de Storage `task-attachments` com políticas por membro do quadro.
- Upload no `TaskDetailDrawer` (aba Anexos): arquivo/foto, com barra de progresso, preview de imagem, nome, tamanho e autor.
- Excluir anexo (autor ou dono do quadro).
- Contador de anexos no `TaskCard` (ícone de clipe + número).

## 3. Bloco 2: Capas nos cards

- Definir uma imagem anexada como capa da tarefa, ou uma cor sólida da paleta existente.
- `TaskCard` renderiza a capa no topo (altura compacta no mobile).
- Remoção da capa pelo mesmo menu.

## Detalhes técnicos

- Migração: `invite_to_board_by_user`, coluna `cover` em `tasks` (`{type: 'color'|'image', value}` em jsonb ou duas colunas simples), bucket + policies de storage.
- Arquivos tocados: `src/hooks/useBoardCollab.ts`, `src/components/kanban/BoardInviteDialog.tsx`, `src/components/kanban/TaskDetailDrawer.tsx`, `src/components/kanban/TaskCard.tsx`, novo `useTaskAttachments.ts`, locales dos 12 idiomas.
- Mobile-first: upload com input nativo (câmera/galeria), tiles de anexo em grid de 2 colunas.

## Ordem de execução

1. Correção do convite + i18n dos toasts (entrega rápida, desbloqueia colaboração).
2. Anexos.
3. Capas.
