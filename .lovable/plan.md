Diagnóstico atualizado:

- A correção anterior já foi aplicada: o "Esqueci minha senha" no `Auth.tsx` agora usa `supabase.auth.resetPasswordForEmail` (envio nativo do Supabase), sem CORS e sem Edge Function customizada.
- O erro nas capturas atuais (`Failed to send a request to the Edge Function` / CORS para `send-email`) vem do bundle JS antigo em cache no navegador (`index--Co7SCEs.js`). O domínio `timezoni.com` ainda está servindo a versão antiga porque o app publicado precisa ser republicado e o Service Worker do PWA precisa atualizar.
- Há ainda um ponto residual no painel admin (`admin-users` → `reset_password`) que continua chamando `send-email`. Se essa Edge Function quebrar (chave Resend ausente), o reset disparado por admin também falha silenciosamente.

Plano para garantir que "Esqueci minha senha" funcione de forma 100% nativa pelo Supabase, em todos os idiomas e países, sem quebrar nada:

1. Publicar a correção já feita
   - O fluxo público em `/auth` (e `/{lang}/auth`) já usa o envio nativo. Basta publicar o app para que `timezoni.com` pare de carregar o bundle antigo que chamava `send-email`.
   - Garantir cache-bust do Service Worker (PWA) para o usuário receber a nova versão sem precisar limpar o navegador manualmente.

2. Migrar o reset de senha do admin para o fluxo nativo
   - Em `supabase/functions/admin-users` (ação `reset_password`), substituir a chamada para `send-email` por `supabaseAdmin.auth.resetPasswordForEmail`.
   - Isso elimina toda dependência da função `send-email` no fluxo de recuperação, tanto público quanto admin.

3. Aposentar com segurança a função `send-email` para recuperação
   - Não vou deletar a função (pra não quebrar nada que ainda use signup), mas vou deixá-la fora de qualquer caminho de recuperação de senha.
   - Adicionar um fallback defensivo na função para evitar que falte de chave externa derrube o boot e quebre CORS para outras chamadas (resposta clara 503 ao invés de crash no carregamento).

4. Confirmar configuração de e-mail do Supabase Auth
   - O Supabase já envia o e-mail de "Reset Password" automaticamente quando chamamos `resetPasswordForEmail`. Vou verificar se o template padrão e a URL de redirecionamento estão liberados no projeto (Auth → URL Configuration → Site URL / Redirect URLs incluindo `https://timezoni.com/reset-password`, `https://www.timezoni.com/reset-password` e variantes de idioma como `/pt-BR/reset-password`).
   - Se necessário, pedir ao usuário para adicionar as URLs de redirecionamento na configuração de Auth do Supabase (única ação manual possível, fora do código).

5. Localização do link de redefinição
   - Manter o que já foi feito: se o usuário estiver em `/pt-BR/auth`, `/en-US/auth`, `/ja-JP/auth` etc., o link de recuperação aponta para `/{lang}/reset-password`.
   - Se estiver na rota padrão `/auth`, manter `/reset-password`.

6. Mensagens traduzidas em todos os 12 idiomas
   - A chave `auth.reset_rate_limited` já foi adicionada em todos os locales.
   - Reusar as chaves existentes (`reset_email_sent`, `reset_email_sent_desc`, `invalid_email`, `common.error`) para sucesso, erro de e-mail inválido e erro genérico.

7. Verificação ao final
   - Testar `/auth` (PT) e `/en-US/auth` no app publicado e confirmar que a requisição de reset vai para `auth/v1/recover` do Supabase e não para `functions/v1/send-email`.
   - Confirmar que o console não exibe mais o erro de CORS / Edge Function.
   - Confirmar recebimento real do e-mail e que o link abre `/reset-password` (ou variante localizada) com a tela de nova senha funcional.

Fora do escopo:

- Não vou trocar provedor de e-mail.
- Não vou configurar Resend nem domínio customizado.
- Não vou alterar tabelas, RLS, login ou cadastro.
- Não vou apagar a Edge Function `send-email` para não afetar o fluxo de confirmação de cadastro.