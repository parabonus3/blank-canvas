## Diagnóstico

Pelos logs do Supabase Auth + console do navegador:

1. **`429 Too Many Requests` em `/signup`** — rate limit de envio de email atingido.
2. **`400 email_address_invalid` em `nicky@gmail.com`** — o Supabase desse projeto está rejeitando esse email específico (provavelmente validação anti-spam ativa). Não é bug do código; é necessário usar um email real.
3. **Duplicação de email de confirmação** no `AuthContext.signUp`: além do email padrão que o Supabase já dispara automaticamente no `signUp`, o código chama **mais uma vez** a edge function `send-email` para mandar outro email. Resultado: 2 emails por cadastro → bate no rate limit muito rápido (foi o que aconteceu nos logs).
4. **Falta `emailRedirectTo` no `signUp`** — sem isso, quando o usuário clica no link de confirmação no email, ele não volta para o app corretamente. É um requisito obrigatório.
5. **Fluxo de signup navega para `/timer` mesmo sem confirmação** — se a confirmação de email estiver ativa no projeto Supabase, o usuário "se cadastra" mas não tem sessão; o `navigate('/timer')` fica em loop voltando para `/auth`, dando impressão de bug.

## Correções

### 1. `src/contexts/AuthContext.tsx` — corrigir `signUp`
- Adicionar `options.emailRedirectTo: ${window.location.origin}/`.
- **Remover** a chamada manual à edge function `send-email` no signup. O Supabase já envia o email padrão automaticamente. Manter chamada manual estava causando o rate limit 429.
- Retornar também `data` para a UI saber se a sessão foi criada (auto-login) ou se requer confirmação por email.

### 2. `src/pages/Auth.tsx` — melhorar UX do signup
- Após signup bem-sucedido: se `data.session` existir → `navigate('/timer')`. Se não existir (confirmação pendente) → mostrar toast "Confirme seu email para entrar" e ficar na página de login.
- Mensagens de erro mais claras quando o Supabase rejeita o email (ex: "Esse email não foi aceito. Use um email real.").
- Tratar erro `over_email_send_rate_limit` (429) com mensagem amigável: "Muitas tentativas. Aguarde alguns minutos e tente novamente."

### 3. Recomendação ao usuário (não é mudança de código)
- Para teste imediato, usar **um email real** (não `nicky@gmail.com`).
- Se quiser testar sem precisar confirmar email, desabilitar "Confirm email" no painel do Supabase Auth → permite cadastro com login automático imediato.

## Risco
**Mínimo.** Apenas remoção de chamada duplicada e adição de `emailRedirectTo` (boa prática obrigatória). Sem mudanças de schema/backend.
