# Convites de quadro: aviso visível e cartão profissional

## O que está acontecendo hoje (verificado)

- O push de convite de quadro **funciona**: existe o gatilho `trg_notify_board_invite` e há registro de envio (`notification_log`, tipo `board_invite`) no dia 31/07.
- O que falta é o **aviso dentro do app**: não há nenhum contador no menu "Tarefas" (só Salas, Amigos e SAC têm), então a pessoa só descobre o convite se entrar na página por conta própria.
- O nome do quadro aparece como "—" porque a regra de acesso de `boards` só libera leitura para dono e membros; quem foi convidado ainda não é membro, então a consulta do banner volta vazia. O nome de quem convidou aparece, mas sem foto.

## O que será feito

1. **Contador no menu "Tarefas"**
   - Bolinha vermelha com o número de convites pendentes no item Tarefas (mesmo padrão visual de Salas/Amigos).
   - Desaparece sozinha quando o convite é aceito ou recusado — a lista já se atualiza em tempo real.

2. **Cartão de convite bem feito**
   - Foto (avatar) de quem convidou, com inicial como fallback.
   - Copy clara: "**Nicky** te convidou para colaborar" + nome do quadro em destaque + "há 2 horas".
   - Botões "Aceitar" e "Recusar" legíveis (hoje o recusar é só um "X"), empilhados no mobile e lado a lado no desktop.
   - Quando há mais de um convite, cada um em seu próprio bloco com separação clara.
   - Estado de carregando nos botões para evitar cliques duplos.

3. **Nome do quadro correto**
   - Nova função no banco que devolve, para os convites da própria pessoa: nome do quadro, nome e foto de quem convidou. Isso resolve o "—" sem afrouxar as regras de acesso aos quadros.

4. **Tradução completa**
   - Todos os textos novos nos 12 idiomas já suportados.

## Detalhes técnicos

- Migração: `get_my_board_invitations()` `SECURITY DEFINER STABLE`, retornando `id, board_id, board_title, inviter_id, inviter_name, inviter_avatar, created_at`, filtrando `invitee_id = auth.uid() AND status = 'pending'`; `GRANT EXECUTE` apenas para `authenticated`. Expõe somente `display_name`/`avatar_url` do perfil do convidante (padrão já usado no projeto).
- `src/hooks/useBoardCollab.ts`: `useMyBoardInvitations` passa a usar a RPC (mantendo a assinatura `BoardInvitation` + novo campo `inviter_avatar`); realtime atual é preservado.
- `src/components/layout/Sidebar.tsx`: `useMyBoardInvitations()` para o badge em `/tasks`.
- `src/components/kanban/BoardInvitationsBanner.tsx`: reescrito com `Avatar`, hierarquia de texto, tempo relativo e dois botões; sem cores fixas (tokens semânticos).
- `src/i18n/locales/*.json` (12 arquivos): chaves `kanban.invite_cta`, `kanban.invite_board_label`, `kanban.decline`, `kanban.invites_pending_title`, etc.
- Sem mudanças no `send-push` nem nos templates de push — a copy do push já está pronta nos 12 idiomas.
