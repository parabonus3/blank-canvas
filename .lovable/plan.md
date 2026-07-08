
## Parte 1 — Desafio obrigatório na sala

**Problema atual:** quando o usuário deixa "Nenhum", o tempo é creditado em **todos** os desafios ativos da sala. Causa raiz confirmada: existem duas versões da função `record_room_challenge_progress` no banco. A antiga (4 argumentos, sem `_challenge_id`) ainda existe e, quando é chamada, entra no loop que credita em cada desafio ativo.

### Frontend — `RoomChallengePicker`
- Remover a opção "Nenhum (não contar em desafios)".
- Se a sala tiver ≥ 1 desafio ativo do qual o usuário é membro:
  - Auto-selecionar o **primeiro** desafio ativo (ordenado por `created_at`) na primeira vez.
  - Continuar respeitando a última escolha salva em `localStorage` (por sala).
  - Nunca emitir `onChange(null)` quando existir pelo menos um desafio disponível.
- Estilo visual: badge "Obrigatório" discreta ao lado do label, mantendo o design atual.

### Frontend — bloqueio do play
- Nos três pontos onde o timer inicia (`src/pages/Index.tsx`, `src/components/PomodoroTimer.tsx`, `src/components/rooms/RoomTimerCard.tsx`):
  - Se houver sala selecionada **com** desafios ativos e `challengeId` estiver `null`, desabilitar o botão de play com tooltip "Escolha um desafio para começar".
  - Se não houver desafios ativos na sala, comportamento atual (play livre, nenhum crédito).

### Backend — remover comportamento "credita em tudo"
Migração SQL:
- `DROP FUNCTION public.record_room_challenge_progress(uuid, uuid, integer, timestamptz);` (a assinatura antiga de 4 argumentos).
- Manter apenas a versão nova com `_challenge_id uuid DEFAULT NULL`.
- Alterar essa versão para: **se `_challenge_id` for NULL, retornar sem creditar nada** (em vez de creditar todos). Isso protege contra qualquer caller legado.
- Confirmar que o trigger `trg_time_entry_room_progress` passa `NEW.challenge_id` corretamente.

## Parte 2 — Notificações automáticas não chegam

**Diagnóstico:** o edge function `notification-scheduler` existe e está correto, mas **nenhum job de `pg_cron`** o invoca. Por isso o botão "enviar teste" funciona (chama `send-push` direto), mas `streak_risk`, `room_goal_reminder`, `weekly_recap`, etc. nunca disparam.

### Agendamento do cron
Usar `supabase--insert` (não migração — contém URL/anon key do projeto) para:
- Habilitar `pg_cron` e `pg_net` (idempotente).
- Criar job `invoke-notification-scheduler-hourly` rodando a cada hora (`0 * * * *`), fazendo `net.http_post` para `https://iukwvfyhforubyqgguwl.supabase.co/functions/v1/notification-scheduler` com header `apikey` + `Authorization: Bearer <anon>`.

### Robustez do scheduler
Pequenos ajustes em `supabase/functions/notification-scheduler/index.ts`:
- Adicionar log de resumo por categoria (quantos usuários elegíveis por janela de hora), para diagnóstico futuro nos logs do edge function.
- Corrigir o `Promise.all` desestruturação (hoje só a última posição é lida em `cleaned`; o resto ignora resultados, ok, mas trocar por `await` sequenciais dentro de try/catch por categoria para uma falha não abortar as outras).

### Verificação pós-deploy
Após o cron ser aprovado, checar logs do edge function e a tabela `notification_log` na próxima hora cheia para confirmar disparo real (não código — apenas leitura de logs).

## Arquivos afetados

**Migração (banco):**
- `DROP` da assinatura antiga + `CREATE OR REPLACE` da função com early-return quando `_challenge_id IS NULL`.

**Insert direto (cron, não migração):**
- `pg_cron` job hourly → `notification-scheduler`.

**Frontend:**
- `src/components/timer/RoomChallengePicker.tsx` — remove "Nenhum", auto-seleciona 1º, badge "Obrigatório".
- `src/pages/Index.tsx` — desabilita play quando desafio faltando.
- `src/components/PomodoroTimer.tsx` — idem.
- `src/components/rooms/RoomTimerCard.tsx` — idem.

**Edge function:**
- `supabase/functions/notification-scheduler/index.ts` — logs por categoria + isolamento de erros.

**i18n (pt-BR + en-US mínimos):**
- `rooms.challenges.required_badge` = "Obrigatório"
- `rooms.challenges.pick_to_start` = "Escolha um desafio para começar"

## Fora do escopo
- Não mexer no layout do `RoomChallengesMatrix` (já refatorado na iteração anterior).
- Não alterar RPCs de leitura de desafios (`get_room_challenges_with_status`).
- Não mexer nas preferências, quiet-hours ou dedup do `send-push` — o problema é apenas ausência de gatilho.
