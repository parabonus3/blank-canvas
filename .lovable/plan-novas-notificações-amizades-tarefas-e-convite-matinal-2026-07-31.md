# Novas notificações: amizades, tarefas e convite matinal

Hoje as notificações funcionam em dois caminhos: agendadas (cron horário na função `notification-scheduler`) e instantâneas (gatilho no banco que chama `send-push`, como já acontece com menções no chat). Os novos avisos vão usar exatamente esses mesmos caminhos, sem mexer no que já funciona.

## O que será adicionado

Instantâneas (chegam no momento do evento):
- Pedido de amizade recebido — "Fulano quer treinar com você".
- Amizade aceita — "Agora vocês estão conectados".
- Convite para um quadro/projeto — "Fulano te convidou para o quadro X".
- Você foi atribuído a uma tarefa — "Fulano te colocou em 'Nome da tarefa'".
- Comentário em tarefa da qual você participa.

Agendadas:
- Convite matinal (por volta das 8h no fuso de cada pessoa): convida a começar uma tarefa, citando quantas tarefas em aberto existem e a mais próxima do prazo. Só dispara se a pessoa tiver tarefas pendentes.
- Tarefa vencendo hoje (uma vez, no início da tarde), citando o nome da tarefa.

Cada tipo terá 2-3 variações de texto em cada um dos 12 idiomas já suportados, no mesmo padrão de copy (emoji + frase curta + chamada para ação).

## Controle do usuário

Novos interruptores na tela de notificações, junto com os atuais:
- Convites e amizades
- Tarefas e quadros
- Convite matinal

Regras já existentes continuam valendo: horário silencioso e limite diário. Ajuste necessário: hoje o sistema bloqueia um segundo aviso do mesmo tipo em 12h — isso faria com que dois pedidos de amizade diferentes virassem um só. Para os avisos instantâneos, a repetição passa a ser avaliada pelo conteúdo (pessoa + item), então cada convite distinto chega, mas o mesmo convite nunca chega duplicado.

## Detalhes técnicos

1. Migração:
   - Colunas em `notification_preferences`: `social_invites`, `task_updates`, `morning_kickoff` (default true).
   - Gatilhos `SECURITY DEFINER` + `net.http_post` para `send-push`, no padrão de `dispatch_chat_mentions` (com `EXCEPTION WHEN OTHERS` para nunca quebrar a escrita original):
     - `friendships` AFTER INSERT (status pending) → `friend_request`
     - `friendships` AFTER UPDATE (para accepted) → `friend_accepted`
     - `board_invitations` AFTER INSERT (pending) → `board_invite`
     - `task_members` AFTER INSERT (quando `user_id <> assigned_by`) → `task_assigned`
     - `task_comments` AFTER INSERT → `task_comment` para membros da tarefa, exceto o autor
   - Cada payload envia `vars` (nomes) e `url` de destino (`/friends`, `/tasks`, `/boards/<id>`).

2. `supabase/functions/_shared/notif-templates.ts`:
   - Novos `NotifKind`: `friend_request`, `friend_accepted`, `board_invite`, `task_assigned`, `task_comment`, `morning_kickoff`, `task_due_today`.
   - Novas variáveis: `{{board_title}}`, `{{task_title}}`, `{{task_count}}`.
   - Blocos de texto para os 12 idiomas.

3. `supabase/functions/send-push/index.ts`:
   - Mapa `prefKey` estendido para os novos tipos (`social_invites`, `task_updates`, `morning_kickoff`).
   - Deduplicação por `payload_hash` (hash de kind + vars) para os tipos instantâneos, mantendo a dedup por tipo/12h nos agendados.

4. `supabase/functions/notification-scheduler/index.ts`:
   - `processMorningKickoff` (8h local): conta tarefas não concluídas do usuário; envia se houver pelo menos uma.
   - `processTaskDueToday` (13h local): tarefas com vencimento no dia local e não concluídas.
   - Ambos registrados no `Promise.all` com `runSafe`.

5. `src/components/pwa/PushNotificationsSection.tsx` + 12 arquivos de tradução: três novos interruptores e suas legendas.
