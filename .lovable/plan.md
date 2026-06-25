
# Notificações push no PWA TimeZoni

Sim, é totalmente possível mandar notificações estilo "app nativo" em um PWA usando **Web Push + VAPID**. Funciona em Android (Chrome/Edge/Firefox/Samsung), desktop e — desde iOS 16.4 — também em iPhone/iPad **se** o usuário tiver adicionado o app à Tela de Início. Não precisa de loja, é grátis, e a notificação chega mesmo com o app fechado.

A seguir, um plano completo e enxuto.

---

## 1. Fundação técnica (uma vez só)

**Service Worker push handler**
- Hoje usamos `vite-plugin-pwa` com `generateSW`. Vamos adicionar `workbox.importScripts: ['/push-sw.js']` apontando para um arquivo estático em `public/push-sw.js` com os listeners `push` e `notificationclick`.
- Isso preserva todo o offline/cache atual (nada quebra) e só adiciona o comportamento de push.

**Chaves VAPID**
- Geramos um par VAPID (público/privado) uma única vez.
- `VAPID_PUBLIC_KEY` vai no `.env` (lido no frontend pra fazer `subscribe`).
- `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` vão em **Supabase Secrets** (usados só nas edge functions).

**Permissão e inscrição**
- Componente `EnablePushButton` (em Settings + um nudge contextual na primeira sessão completa, nunca on-load) que:
  1. Pede `Notification.requestPermission()`.
  2. Faz `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
  3. Salva a subscription via RPC no Supabase.
- No iOS, detectamos `navigator.standalone === true` e, se não estiver instalado, mostramos um diálogo amigável "Instale na tela de início para receber notificações" (já temos `IOSInstallDialog`).

---

## 2. Modelo de dados (migração)

Tabela `push_subscriptions`:
- `id uuid pk`, `user_id uuid` (FK soft pro `auth.users`), `endpoint text unique`, `p256dh text`, `auth text`, `user_agent text`, `lang text`, `timezone text`, `created_at`, `last_seen_at`, `last_error_at`, `failure_count int`.
- RLS: usuário vê/deleta as suas; `service_role` lê todas. GRANTs explícitos.

Tabela `notification_preferences` (1:1 com profile, default tudo ON):
- `room_goal_reminder`, `streak_risk`, `room_challenge_deadline`, `friend_activity`, `re_engagement`, `chat_mentions`.
- `quiet_hours_start` (ex 22:00), `quiet_hours_end` (ex 08:00), respeitado no fuso do usuário.
- `max_per_day int default 3` (anti-spam).

Tabela `notification_log`:
- `user_id`, `kind`, `sent_at`, `lang`, `payload_hash`, `clicked_at`.
- Usada pra deduplicação ("já mandei essa hoje?") e métricas de CTR.

---

## 3. Envio (edge function `send-push`)

Função única `send-push` (Deno + lib `web-push`) que recebe `{ user_id, kind, vars }`:
1. Busca todas as subscriptions do usuário.
2. Resolve a língua: `subscription.lang ?? profile.lang ?? 'en-US'`.
3. Renderiza título/corpo do template (ver §5) com interpolação.
4. Envia em paralelo. Em erro 404/410, deleta a subscription. Em erro transitório, incrementa `failure_count`.
5. Grava em `notification_log`.

Respeita preferências, quiet hours e `max_per_day` antes de despachar.

---

## 4. Agendamento inteligente (pg_cron + edge functions)

Cada job roda de hora em hora, mas só dispara pro usuário quando **a hora local dele** bate com a janela definida. Assim atendemos todos os fusos sem ter 24 crons.

| Job | Hora local | Regra |
|---|---|---|
| `notify-room-goal-pending` | 19:00 | tem sala com `goal_hours`, e progresso de hoje < meta |
| `notify-streak-risk` | 20:30 | streak ≥ 2 dias e nenhum `time_entry` hoje |
| `notify-room-challenge-deadline` | 09:00 | desafio ativo termina em ≤ 24h e progresso < 80% |
| `notify-re-engagement` | 11:00 (sáb) | sem login há 3, 7, 14 dias (cada um manda só 1x) |
| `notify-friend-back-online` | em tempo real (trigger) | amigo entrou em sala (já existe lógica) |
| `notify-weekly-recap` | dom 18:00 | resumo da semana com stats da sala |

Defesas embutidas em todo job:
- só dispara se `notification_preferences[kind] = true`;
- só dispara fora de quiet hours;
- dedup por `payload_hash` nas últimas 24h;
- respeita `max_per_day`.

---

## 5. Conteúdo multilíngue, profissional e divertido

Templates ficam em `supabase/functions/_shared/notifications/{lang}.json` para as 12 línguas já suportadas (`pt-BR, en-US, es-ES, fr-FR, ja-JP, de-DE, ar-SA, ko-KR, zh-CN, it-IT, ru-RU, id-ID`). Mesma estrutura do `src/i18n/locales/*.json`, mas só com as chaves de notificação. Variáveis tipo `{{room_name}}`, `{{streak_days}}`, `{{hours_left}}`.

Cada `kind` tem **3 variações** que rotacionam aleatoriamente pra não cansar. Exemplos em PT (mesma ideia em todas):

**Meta da sala pendente**
- "📚 Ainda dá tempo! Sua meta de hoje em **{{room_name}}** te espera."
- "⏰ Faltam {{remaining_h}}h pra bater sua meta em **{{room_name}}**. Bora?"
- "🎯 Seus colegas de **{{room_name}}** já contabilizaram. E você?"

**Risco de streak**
- "🔥 Não perca sua ofensiva de **{{streak_days}} dias**! Bastam 10 minutos hoje."
- "❄️ Sua streak de {{streak_days}} dias tá em risco. Contabilize antes da meia-noite!"
- "🏆 Você chegou longe — {{streak_days}} dias. Não para agora."

**Prazo de desafio**
- "🚨 O desafio **{{challenge_name}}** acaba em {{hours_left}}h. Sprint final!"

**Reengajamento**
- "👀 Faz {{days}} dias… tá tudo bem? Suas plantinhas sentem sua falta 🌱"

Todos os textos vão pra revisão num arquivo só, fáceis de polir.

---

## 6. Clique inteligente

`notificationclick` no `push-sw.js` foca a janela aberta (ou abre nova) numa URL passada no payload (`/rooms/{id}`, `/timer`, `/dashboard`). Marca `clicked_at` no log via `fetch` keepalive.

---

## 7. UI/UX

- **Settings → Notificações**: toggles por categoria, quiet hours, botão "Ativar notificações" + "Enviar teste".
- **Onboarding**: depois da primeira sessão de timer concluída, banner discreto "Quer lembretes pra não perder sua streak?" (CTA único, pode dispensar).
- **iOS PWA**: se não instalado, abre `IOSInstallDialog` explicando o passo extra.

---

## 8. Entregáveis (ordem de execução)

1. Migration: `push_subscriptions`, `notification_preferences`, `notification_log` (com GRANTs + RLS).
2. Secrets: gerar VAPID e adicionar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
3. `public/push-sw.js` + ajuste em `vite.config.ts` (`workbox.importScripts`).
4. Frontend: `usePushSubscription` hook, `EnablePushButton`, seção em `Settings`.
5. Edge function `send-push` + lib `web-push` + helper de templates i18n.
6. Edge functions agendadas: `notify-room-goal-pending`, `notify-streak-risk`, `notify-room-challenge-deadline`, `notify-re-engagement`, `notify-weekly-recap`.
7. pg_cron schedules (hora em hora) chamando cada função.
8. Templates JSON nas 12 línguas.
9. Teste end-to-end (botão "enviar teste") + verificação no Android e iOS instalado.

---

## Observações importantes

- **iOS exige app instalado** na Tela de Início para receber push — vamos comunicar isso claramente.
- **Nada quebra** do que existe hoje: o SW atual continua funcionando, só ganha um `importScripts` extra. Offline/cache intactos.
- Push é **gratuito** (usa servidores do navegador, FCM/APNs). Custo zero por mensagem.
- Cada usuário pode ter várias subscriptions (celular + desktop). Tudo já tratado.

Se aprovar, começo pela migração + VAPID + SW handler, depois a UI de opt-in, e por fim os jobs agendados com os templates nas 12 línguas.
