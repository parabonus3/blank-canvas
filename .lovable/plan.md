# Convites de quadro: cancelar sempre, e push com foto de quem convida

## O que está errado hoje (verificado no banco)

1. **Cancelar convite antigo falha com erro de chave duplicada.**
   A tabela `board_invitations` tem uma restrição única por (quadro, convidado, status). Cancelar hoje troca o status de `pending` para `cancelled`; se aquela pessoa já tinha sido cancelada antes naquele quadro, já existe uma linha `cancelled` e o banco recusa (o erro `duplicate key ... board_invitations_board_id_invitee_id_status_key` da imagem). Por isso convites novos cancelam e os antigos não.
   O mesmo acontece ao **recusar** um convite quando já houve um `rejected` anterior.

2. **A notificação push não mostra a foto de quem convidou.**
   O push é enviado corretamente (gatilho existe e funciona), mas o payload usa sempre o ícone fixo do app; o avatar do convidante nunca é enviado.

3. **O cartão de convite em "Tarefas"** já foi refeito com foto, nome do quadro e botões Aceitar/Recusar, e a função segura `get_my_board_invitations` existe no banco e retorna título do quadro + nome + avatar. A tela da imagem é anterior a esse ajuste; será revalidada e, se algo ainda vier vazio, corrigido no mesmo passo.

## O que será feito

1. **Cancelar e recusar sem erro nunca mais**
   - Cancelar (pelo dono) e recusar (pelo convidado) passam a **remover** a linha pendente em vez de mudar o status, o que elimina de vez o conflito e mantém o histórico limpo.
   - Limpeza única das linhas `cancelled`/`rejected` antigas que estão travando esses pares.
   - Mensagem de erro amigável no lugar do texto técnico do banco, caso qualquer outra falha ocorra.
   - A lista de "Convite pendente" no diálogo de membros continua atualizando em tempo real; após cancelar, o botão volta para "Convidar" imediatamente.

2. **Push de convite com a foto de quem convidou**
   - O gatilho passa a incluir o avatar do convidante, e o envio do push usa essa foto como ícone da notificação (com o ícone do app como reserva quando a pessoa não tem foto).
   - Mesmo tratamento para convite de tarefa (atribuição) e comentário, para o padrão ficar consistente.

3. **Revalidação do cartão em "Tarefas"**
   - Conferir na prática que aparece foto, nome de quem convidou, nome do quadro e "há X"; ajustar o que faltar.
   - Contador vermelho em "Tarefas" no menu confirmado e desaparecendo ao responder o convite.

## Detalhes técnicos

- Migração:
  - `DELETE FROM board_invitations WHERE status IN ('cancelled','rejected')` (limpeza dos bloqueios).
  - `reject_board_invitation(_invitation_id uuid)` e `cancel_board_invitation(_invitation_id uuid)` `SECURITY DEFINER`, validando `invitee_id = auth.uid()` (recusar) e `is_board_owner` (cancelar), fazendo `DELETE`; `GRANT EXECUTE` só para `authenticated`.
  - `tg_notify_board_invite`: adicionar `inviter_avatar` (de `profiles.avatar_url`) ao `jsonb` do `dispatch_push`; idem nos gatilhos de `task_assigned` e `task_comment`.
- `supabase/functions/send-push/index.ts`: `icon` do payload passa a usar `data.inviter_avatar ?? "/icons/icon-192.png"`; sem mudança na deduplicação por `payload_hash`.
- `src/hooks/useBoardCollab.ts`: `useRejectBoardInvitation` e `useCancelBoardInvitation` passam a chamar as novas RPCs; `onError` com copy traduzida em vez de `e.message`.
- Chaves de tradução novas nos 12 arquivos de `src/i18n/locales`.
