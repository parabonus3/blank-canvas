## Diagnóstico (o que descobri investigando)

Investiguei a infraestrutura de push de ponta a ponta e o problema **é nosso, não dos usuários**:

1. **`push_subscriptions` tem ZERO linhas no banco.** Nenhum usuário, em nenhum dispositivo, conseguiu salvar a inscrição — mesmo aqueles que clicaram em "Ativar" e que o navegador mostrou o popup de permissão.
2. **Causa raiz:** as três tabelas do sistema de push (`push_subscriptions`, `notification_log`, `notification_preferences`) foram criadas **sem `GRANT` para `authenticated` / `service_role` / `anon`**. RLS está OK, mas o PostgREST barra antes mesmo da RLS por falta de privilégio de tabela. Resultado: o `upsert` do navegador devolve erro de permissão.
3. **Por que ninguém percebeu:** o `subscribe()` do `usePushSubscription.ts` tem `if (error) throw error`, mas o `PushNotificationsSection` não mostra toast em caso de falha — só mostra sucesso. O `Notification.permission` fica como `granted` no navegador, então a UI marca o usuário como "inscrito" mesmo sem ter gravado nada.
4. **Consequência em cascata:** o cron `tz-notification-scheduler` (rodando de hora em hora, OK) consulta `push_subscriptions`, encontra 0 usuários elegíveis e não dispara nada. `notification_log` está vazio. `send-push` nunca recebeu chamada.
5. Tudo o mais está correto: VAPID keys configuradas, `push-sw.js` registrado via `importScripts` no workbox, cron ativo, edge functions com `verify_jwt` certo.

## O Plano

### 1. Corrigir os GRANTs (migration)
Sem isso nada mais funciona.

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
```

### 2. Tornar falhas visíveis (UX)
No `PushNotificationsSection.tsx`, envolver `subscribe()`/`unsubscribe()` em `try/catch` com `toast.error(err.message)`. No `usePushSubscription.ts`, logar com `console.error` antes de propagar e devolver mensagens claras para os casos comuns:
- permissão negada
- iOS sem instalar à tela inicial
- erro de gravação no banco
- VAPID inválida

### 3. Reconciliar o estado real do navegador com o banco
O hook `refresh()` hoje confia no `pushManager.getSubscription()` local. Vou adicionar uma verificação cruzada: se o navegador tem subscription mas o banco não tem o `endpoint`, refaz o `upsert` automaticamente. Isso recupera todos os usuários que "ativaram" antes do fix sem pedir nada a eles.

### 4. Saneamento de inscrições mortas
Manter o tratamento de `404/410` no `send-push` (já existe). Adicionar um job leve no `notification-scheduler` que apaga inscrições com `failure_count >= 5` e `last_error_at` há mais de 7 dias.

### 5. Endpoint de diagnóstico para o admin
Pequena rota em `Settings → Notificações` que mostra:
- Permissão do navegador
- Existe ServiceWorker registrado? Qual scope?
- Existe PushSubscription local? Endpoint truncado.
- Existe linha em `push_subscriptions` para este endpoint?
- Último envio em `notification_log`.

Isso transforma cada usuário em um auto-diagnóstico, sem precisar de logs.

### 6. Validar com o botão "Enviar teste"
Depois do deploy: clicar em "Enviar teste" em pelo menos um dispositivo desktop e um mobile instalado. Confirmar linha em `notification_log` e notificação chegando. Sem isso não declaro resolvido.

### Detalhes técnicos
- Arquivos: nova migration SQL; `src/hooks/usePushSubscription.ts`; `src/components/pwa/PushNotificationsSection.tsx`; `supabase/functions/notification-scheduler/index.ts` (limpeza); pequeno componente `PushDiagnosticsCard.tsx`.
- Sem mudanças em VAPID, no `push-sw.js`, no `vite.config.ts` ou no `send-push`.
- Sem mudanças de schema, só privilégios e código cliente.

### O que NÃO vou mexer
- Templates de notificação (já em 12 idiomas).
- Horários do scheduler.
- Workbox / Service Worker.
- Conteúdo de outras funcionalidades.
