## Causa raiz confirmada (não é código, é deploy)

Testei o preflight direto no gateway do Supabase:

```
curl -X OPTIONS https://iukwvfyhforubyqgguwl.supabase.co/functions/v1/send-push
→ HTTP/2 404
{"code":"NOT_FOUND","message":"Requested function was not found"}
```

Ou seja: **a Edge Function `send-push` não está publicada no projeto Supabase**. Todas as correções anteriores (CORS expandido, `verify_jwt = false`, init lazy do web-push, mapeamento de erros no frontend) estão corretas no código-fonte, mas nunca chegaram ao runtime — o gateway responde 404 no `OPTIONS`, o navegador interpreta como "preflight sem HTTP ok" e mostra o erro de CORS que aparece na screenshot. Por isso o usuário continua vendo "Servidor de notificações indisponível" mesmo depois das mudanças.

Confirmei também via `fetch_secrets` que `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` **já existem** como secrets do projeto. Então, uma vez publicada, a função deve subir sem 503.

## Plano de correção (mínimo, sem quebrar nada)

### 1. Publicar `send-push`
- Rodar `deploy_edge_functions(["send-push"])`.
- Como a função `notification-scheduler` importa `sendPushToUser` do `send-push` e também está no `config.toml`, publicar as duas juntas para manter compatibilidade: `deploy_edge_functions(["send-push", "notification-scheduler"])`.

### 2. Verificar deploy no gateway
- Repetir o `curl -X OPTIONS .../send-push` e conferir:
  - status `200`
  - header `access-control-allow-headers` inclui `content-type` (vem do nosso `corsHeaders`, não do fallback do gateway)
  - header `access-control-allow-methods: POST, OPTIONS`
- Ler `edge_function_logs("send-push")` e confirmar a linha `[send-push] boot { hasPub: true, hasPriv: true, hasSR: true }`.

### 3. Executar chamada real de teste
- `curl_edge_functions POST /send-push { kind: "test" }` autenticado como o usuário do preview.
- Esperado: `{ sent: >=1, skipped: null }` e uma linha nova em `notification_log`.
- Se `sent = 0` com `skipped = "no-subs"`, o problema restante é só o navegador do usuário não ter subscription salva — o botão "Enviar teste" precisa dela; nesse caso a UI deve pedir para reativar as notificações (já cobrimos isso no `refresh` que reconcilia a subscription).

### 4. Nenhuma mudança de código adicional
- Não mexer em `send-push/index.ts`, `usePushSubscription.ts`, `PushNotificationsSection.tsx`, i18n, nem `config.toml`. O código atual já está preparado para o cenário; o único bloqueio era o deploy ausente.
- Nenhuma migration, nenhum novo secret, nenhuma alteração de RLS ou `verify_jwt`.

## Riscos e por que isso não quebra nada
- Publicar uma função que hoje responde 404 só pode melhorar: qualquer outro fluxo que dependia dela já estava quebrado silenciosamente (ex.: `notification-scheduler` chamando `sendPushToUser`).
- Como `notification-scheduler` já está listada no `config.toml` com `verify_jwt = false`, republicar mantém o mesmo contrato.
- Se por algum motivo o deploy falhar (ex.: lockfile), o fallback é remover `supabase/functions/send-push/deno.lock` (se existir) e redeployar; sem tocar no código de aplicação.

## Arquivos afetados
Nenhum arquivo do repositório é editado. Apenas ações de infraestrutura:

```text
deploy: supabase/functions/send-push
deploy: supabase/functions/notification-scheduler
verify: OPTIONS preflight + POST test
```
