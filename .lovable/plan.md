# Corrigir "Esqueci a senha" (erro 403 na Edge Function)

## Diagnóstico

No console aparece:
- `POST .../functions/v1/send-email → 403`
- `CORS: Response to preflight ... does not have HTTP ok status`
- Toast: "Failed to send a request to the Edge Function"

Fluxo atual:
1. `src/pages/Auth.tsx` (handleForgotPassword) chama `supabase.functions.invoke('send-email', { type: 'recovery', ... })`.
2. O usuário está deslogado (esqueceu a senha), então não há JWT de usuário — apenas a anon key.
3. Por padrão, o gateway das Edge Functions do Supabase exige um JWT válido de usuário. Como o `supabase/config.toml` **não** declara `verify_jwt = false` para `send-email`, o gateway rejeita o preflight/POST com **403 antes mesmo de executar o código** da função. Isso também derruba o CORS (sem headers na resposta de erro do gateway).

A função `send-email` já faz autenticação interna (exige Bearer só para `type: 'signup'` e aplica rate-limit por e-mail para `type: 'recovery'`), então é seguro desativar o `verify_jwt` no gateway.

## Mudanças

### 1. `supabase/config.toml`
Adicionar bloco para a função:

```toml
[functions.send-email]
verify_jwt = false
```

Isso permite que o gateway aceite chamadas anônimas; a função continua validando internamente:
- `recovery`: valida formato de e-mail + rate-limit persistente (3/10min por e-mail).
- `signup`: continua exigindo `Authorization: Bearer <user_jwt>` e checando que o e-mail bate com o usuário autenticado.

### 2. Redeploy da função
Após o ajuste de config, redeployar `send-email` para o gateway aplicar a nova flag.

### 3. Pequena melhoria de robustez em `supabase/functions/send-email/index.ts`
- Garantir headers CORS também em qualquer caminho de erro precoce (já está OK, mas revisar `OPTIONS` para retornar `status: 204`).
- Não muda comportamento funcional.

## Verificação

1. Em `https://timezoni.com/auth` → "Esqueci a senha" → inserir e-mail → enviar.
2. Esperado: toast de sucesso + e-mail recebido com link para `/reset-password`.
3. Console sem 403/CORS na chamada para `/functions/v1/send-email`.
4. Testar também o caminho de signup (que exige JWT) continua funcionando para usuário autenticado.

## Fora de escopo

- Não trocar provedor de e-mail (continua Resend com `noreply@timezoni.com`).
- Não mexer no template do e-mail nem na página `/reset-password` (já funcionais).
- Não alterar rate-limit nem regras de signup.
