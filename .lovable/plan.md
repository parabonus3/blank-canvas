## Causa raiz confirmada pela imagem

Console mostra:
```
Access to fetch at '.../send-push' from origin 'https://timezoni.com' has been blocked
by CORS policy: Response to preflight request doesn't pass access control check:
It does not have HTTP ok status.
POST .../send-push  net::ERR_FAILED
```

Ou seja, o navegador dispara um `OPTIONS` (preflight) antes do `POST`, e o Supabase está respondendo com não-2xx. Há dois culpados, ambos vamos corrigir:

1. **Boot crash da function** — `webpush.setVapidDetails(...)` roda no escopo de módulo. Se os secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` não estiverem definidos no projeto Supabase (só estão no `.env` local), o worker quebra antes do `Deno.serve`, e qualquer request — inclusive o preflight `OPTIONS` — vira erro de rede. É exatamente o sintoma da imagem.
2. **CORS preflight + `verify_jwt`** — quando uma function tem `verify_jwt = true`, o gateway Supabase exige token também no `OPTIONS`, e o navegador nunca envia Authorization em preflight. Algumas regiões/configs respondem 401 no `OPTIONS` → preflight fail.

Bônus visível na imagem: o botão de diagnóstico mostra a key crua `push.diagnostics` — falta tradução em pt-BR (e provavelmente outras).

## Plano de correção

### A. `supabase/functions/send-push/index.ts` (resiliência + CORS)

- Mover `webpush.setVapidDetails` para `initWebPush()` **lazy**, dentro de try/catch. Se faltar key, retornar `503 { error: "push-not-configured" }` em vez de derrubar o worker.
- Expandir CORS headers:
  ```ts
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
  ```
- Garantir que o handler `OPTIONS` responda **sempre** `200 ok` antes de qualquer outra lógica (já faz, mas confirmamos que não há código que possa lançar antes).
- Log defensivo no boot (sem expor valores): `console.log("[send-push] boot", { hasPub: !!VAPID_PUBLIC, hasPriv: !!VAPID_PRIVATE, hasSR: !!SERVICE_ROLE });`

### B. `supabase/config.toml` — destravar preflight

Trocar:
```toml
[functions.send-push]
verify_jwt = false
```
e validar o JWT manualmente dentro da function (já lemos `Authorization` e chamamos `userClient.auth.getUser(token)`, então a autenticação continua segura — só removemos a verificação dupla no gateway que está rejeitando o preflight).

### C. Secrets

Verificar via `fetch_secrets` se `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` existem no projeto Supabase. Se não, definir com os valores do `.env` local usando `set_secret`. Sem eles, mesmo com tudo certo, o envio real falha (mas pelo menos retorna 503 amigável).

### D. Frontend — UX dos erros

`src/hooks/usePushSubscription.ts` — em `sendTest`, distinguir:
- `FunctionsFetchError` / "Failed to send a request" → mensagem traduzida `push.errors.unreachable`
- 503 `push-not-configured` → `push.errors.not_configured`
- 4xx → mensagem do servidor

`src/components/pwa/PushNotificationsSection.tsx` — mostrar painel de diagnóstico automaticamente em caso de falha.

### E. i18n faltando (12 locales)

Adicionar:
```json
"push": {
  "diagnostics": "Diagnóstico",
  "errors": {
    "unreachable": "Servidor de notificações indisponível. Tente novamente em instantes.",
    "not_configured": "Notificações push ainda não foram configuradas neste ambiente."
  }
}
```
Em todos os 12 arquivos `src/i18n/locales/*.json`, traduzidos.

### F. PDF de Anotações — redesign profissional (mantido do plano anterior)

Reescrever apenas `exportNoteToPDF` em `src/lib/pdfExport.ts` com paleta azul-marinho da marca:
- `navy #0B1E3F`, `accent #1E40AF`, `ink #0F172A`, `muted #64748B`, `surface #F8FAFC`, `border #E2E8F0`.
- Cabeçalho sólido único (sem faixa dupla), linha accent fina.
- Título 24pt; metadados em pílulas chave/valor; H1/H2/H3 com cor `accent` e barra lateral no H1; listas com marcador `accent`; citações com barra + fundo `surface`; code box `surface`; rodapé refinado com paginação `accent`.
- Estado vazio: texto i18n "Esta anotação está vazia." em vez de `—`.
- Header compacto nas páginas seguintes.
- `exportHistoryToPDF` e `exportDashboardStructuredPDF` ficam intocados.
- Adicionar `notes.pdf.empty` em todos os 12 locales.

## Arquivos afetados

```text
supabase/config.toml                              # send-push: verify_jwt = false
supabase/functions/send-push/index.ts             # CORS expandido + boot lazy + logs
src/hooks/usePushSubscription.ts                  # mapeamento de erros
src/components/pwa/PushNotificationsSection.tsx   # abrir diagnóstico em falha
src/lib/pdfExport.ts                              # redesign exportNoteToPDF
src/i18n/locales/*.json (12)                      # push.diagnostics, push.errors.*, notes.pdf.empty
```

Secrets (se ausentes): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Sem migrations. Segurança mantida — JWT continua validado dentro da function.
