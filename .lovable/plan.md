## Diagnóstico (o que investiguei)

Consultei o banco e o código. Descobertas concretas:

**1. Teste funciona, o resto não — por 3 motivos distintos:**

| Notificação | Existe template? | Existe código que dispara? | Status real |
|---|---|---|---|
| `test` | ✅ | ✅ botão manual | ✅ chegando |
| `room_goal_reminder` | ✅ | ✅ scheduler (19h local) | ⚠️ só dispara se sala tem `goal_hours > 0` e progresso < meta |
| `streak_risk` | ✅ | ✅ scheduler (20h local) | ⚠️ só dispara com streak ≥ 2 e zero sessões no dia |
| `room_challenge_deadline` | ✅ | ✅ scheduler (9h local) | ⚠️ só se restam 1–24h e há progresso do usuário |
| `re_engagement` | ✅ | ✅ scheduler (sáb 11h) | ⚠️ só se ausente exatamente 3, 7 ou 14 dias |
| `weekly_recap` | ✅ | ❌ **não existe processador** | 🔴 nunca dispara |
| `friend_activity` | ❌ **sem template** | ❌ **sem trigger nem scheduler** | 🔴 nunca dispara |
| `chat_mentions` | ❌ **sem template** | ❌ **sem trigger** | 🔴 nunca dispara |

Confirmei em `notification_log`: só existem 10 registros, todos `kind=test`. Nenhum agendado disparou porque as condições são muito estritas E porque 3 tipos nem foram implementados.

**2. Cron OK**: `tz-notification-scheduler` rodando de hora em hora. Sem problema aí.

**3. Preferências no BD já vêm todas com default `true`** — não precisa migração pra isso, mas o UI ainda mostra os toggles avançados que você quer remover.

---

## Plano — sem quebrar o que funciona

### Frente 1 — UI enxuta (Settings → Notificações)

**Remover:**
- Botão "Enviar teste"
- Botão "Diagnóstico" + card de resultado
- Inputs de "quiet hours start/end" e "max per day"
- Função `sendTest` e `runDiagnostics` do hook (deixa só se algum outro lugar usar — não usa)

**Manter:**
- Botão único **Ativar notificações** (subscribe) / **Desativar** (unsubscribe)
- Explicação curta do que o app envia
- Lista de 7 toggles individuais (meta de sala, streak, desafio, resumo semanal, amigos, menções, re-engajamento) — cada um `true` por padrão, o usuário desliga o que não quiser
- Aviso especial pra iOS não instalado (needs-install) e permissão negada

### Frente 2 — Fazer as notificações faltantes existirem

**2.1 `weekly_recap`** — adicionar no `notification-scheduler`:
- Roda quando `localWeekday() === 0` (domingo) e `localHour() === 10`
- Soma segundos do usuário nos últimos 7 dias em `time_entries`
- Envia com `vars: { hours: X, sessions: Y }`
- Adicionar variação `{{hours}}` e `{{sessions}}` nos templates existentes de `weekly_recap` (já tem os 12 idiomas, só ajustar body)

**2.2 `friend_activity`** — event-driven, não agendado:
- Adicionar template `friend_activity` nos 12 idiomas (ex.: "🎉 {{friend_name}} completou {{hours}}h hoje")
- Criar trigger no BD em `time_entries` (AFTER INSERT) que, quando duração ≥ 30min, chama `pg_net.http_post` pra `send-push` pra cada amigo confirmado (`friendships.status='accepted'`) do usuário — respeitando cap de 1 por amigo por dia
- Alternativa mais simples: consolidar no scheduler noturno (20h), varrendo `time_entries` do dia dos amigos e mandando um resumo — evita spam e é mais seguro. **Vou usar essa** por padrão.

**2.3 `chat_mentions`** — event-driven:
- Adicionar template `chat_mentions` (ex.: "💬 {{sender_name}} mencionou você em {{room_name}}")
- Criar trigger em `room_messages` (AFTER INSERT) que detecta `@nome` no `content`, resolve pra `user_id`, e chama `send-push` via `pg_net` com `kind=chat_mentions`
- Só notifica se o mencionado NÃO está online na sala (`room_members.status='online'` do usuário → pular)

**2.4 Afrouxar condições dos jobs existentes** (pra parar de "quase nunca disparar"):
- `streak_risk`: remover o mínimo de 2 dias → passa a alertar com streak ≥ 1
- `re_engagement`: em vez de dias exatos 3/7/14, mudar pra "≥ 3 e primeira sessão do dia inexistente" com dedup interno (já existe dedup de 12h) e cap semanal
- `room_goal_reminder`: manter, mas adicionar segunda janela às 12h (só se progresso < 25% da meta)

### Frente 3 — Ampliar templates

Adicionar `friend_activity` e `chat_mentions` em `notif-templates.ts` nos 12 idiomas. Atualizar `NotifKind`. O `send-push` já respeita `notification_preferences` — só precisa mapear as duas chaves novas no `prefKey` (já existem lá).

### Frente 4 — Higiene / logs

- Toda vez que uma função scheduler pular um usuário, logar o `skipped` (já existe, mas escrever com `console.info` pra ver na aba de logs)
- Adicionar tabela `notification_dispatch_errors` opcional? **Não** — o `notification_log` já basta

---

## O que precisa vir de você antes de eu começar

1. **Confirma que quer remover mesmo o "Enviar teste"?** Uma vez removido, se um usuário reclamar "não recebo nada", só vamos ter logs do scheduler pra diagnosticar. Sugestão: manter o botão de teste escondido atrás de um clique longo no ícone 🔔 ou só pra admin. Me diz qual prefere:
   - (a) Remover completamente
   - (b) Manter escondido / só admin
2. **Menção no chat = `@usuario` no texto ou lista explícita de menções?** Hoje `room_messages` não tem coluna `mentions` — ou detectamos por regex ou criamos a coluna.
3. **`friend_activity` diário resumido (uma notificação com "3 amigos treinaram hoje") ou uma por amigo?** Diário resumido é o padrão saudável.

---

## Ordem de execução (quando aprovar)

1. Migração: adicionar coluna `mentions text[]` em `room_messages` (se você escolher essa opção) e trigger de `chat_mentions`
2. `notif-templates.ts`: adicionar `friend_activity`, `chat_mentions` + variação de `weekly_recap` com {{hours}}
3. `send-push`: incluir novas kinds no `prefKey`
4. `notification-scheduler`: adicionar `processWeeklyRecap`, `processFriendActivity`, afrouxar condições existentes
5. `PushNotificationsSection.tsx`: remover teste/diagnóstico/quiet-hours/max-per-day
6. `usePushSubscription.ts`: remover `sendTest` e `runDiagnostics` (opção a) ou manter escondido (opção b)
7. Testar cada job manualmente via `curl_edge_functions` na `notification-scheduler` (não afeta produção — o cron continua)

Nada quebra o que funciona hoje porque:
- Push infra (VAPID, service worker, endpoint) não é tocada
- Preferências existentes no BD já são compatíveis
- Templates novos são adição, não substituição
- Botão de teste continua funcionando durante o desenvolvimento; só removo do UI no passo 5

Confirma as 3 perguntas e eu implemento na sequência.
