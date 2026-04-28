
## Análise dos 3 avisos

### 1. `study_rooms_invite_code_public_exposure` — REAL e precisa correção

Testei como `anon` na API REST:
```
GET /rest/v1/study_rooms?is_public=eq.true&select=invite_code,password_hash
→ [{"invite_code":"687823","password_hash":null}]
```

**Confirmado vazamento.** A policy `Anyone can view public rooms` (SELECT para anon/authenticated com `is_public = true`) não restringe colunas, e os REVOKEs antigos de coluna não estão mais em vigor (foram perdidos em alguma migração posterior, provavelmente um `GRANT ALL` recriou).

**Impacto:** qualquer pessoa sem login pode listar todas as salas públicas e obter `invite_code` + `password_hash` (bcrypt). O invite_code permite entrar via `join_room_by_invite_code` (mas RPC ainda exige senha se houver). Mesmo assim, é dado sensível que não deve ser exposto — quebra o controle de quem pode convidar.

**Correção segura:** redefinir a policy para excluir as colunas sensíveis via VIEW + reaplicar REVOKE de coluna que persista. A forma mais robusta e que **não quebra nada** é manter a policy mas reaplicar REVOKE de coluna no role `anon` (e idealmente `authenticated`, já que o frontend autenticado usa `get_my_rooms` RPC, não SELECT direto nessas colunas).

Análise de uso no frontend (verificada):
- `useRooms.ts` → usa RPC `get_my_rooms` (não retorna invite_code/password_hash) ✅
- `RoomDetail.tsx` → usa RPC `get_room_invite_code` (owner/mod) ✅
- `Rooms.tsx` → usa RPC `find_room_by_invite_code` ✅
- `RoomPreview.tsx` → usa RPC `get_room_public_preview` ✅
- `CreateRoomDialog`, `EditGoalDialog`, `RoomSettingsTab`, `PinnedMessage`, `RoomFocusSession`, `useRoomInvitations` → fazem `INSERT`/`UPDATE` ou SELECT por `id` em colunas que **não são** `invite_code`/`password_hash` ✅
- `Explore.tsx` → usa RPC `get_public_rooms_ranking_by_period` (já retorna `NULL::text` no campo invite_code) ✅

**Conclusão:** nenhum SELECT direto do frontend lê `invite_code` ou `password_hash`. Pode revogar com segurança de `anon` E `authenticated`.

### 2. `profiles_missing_public_select_for_rooms` — FALSO POSITIVO (já protegido)

Testei: `GET /rest/v1/profiles?select=is_banned,plan_tier` como anon → `[]` (RLS bloqueia, só dono vê).

As funções SECURITY DEFINER que retornam dados de profile (ex: `get_room_member_profiles`, `get_member_public_stats`) só expõem campos públicos curados (`display_name`, `avatar_url`, `plan_tier`, `avatar_flair`) — **não** retornam `is_banned`, `banned_reason`, `trial_ends_at`, `last_known_streak`. O `plan_tier` é exibido publicamente como badge (intencional) e não é considerado sensível.

**Decisão:** marcar como **ignored** com justificativa. Nenhuma mudança de código.

### 3. `SUPA_auth_leaked_password_protection` — Configuração do Supabase Auth

Recurso do Supabase que checa senhas vazadas no HaveIBeenPwned no signup/reset. **Não pode ser ativado via SQL** — precisa ser ligado pelo usuário no Dashboard. Vou apenas documentar e deixar instruções; nada quebra.

---

## Plano de execução

### Migração SQL única

```sql
-- Revogar leitura das colunas sensíveis para anon e authenticated.
-- Frontend só lê essas colunas via RPCs SECURITY DEFINER (que não usam role do caller).
REVOKE SELECT (invite_code, password_hash) ON public.study_rooms FROM anon, authenticated;

-- Garantir que GRANT futuro implícito não devolva acesso: como GRANT ALL na tabela
-- não inclui privilégios de coluna se já houver REVOKE explícito de coluna,
-- isto persistirá. Mas para reforçar, removemos qualquer GRANT ALL pendente:
-- (não fazemos REVOKE ALL na tabela porque quebraria SELECT das outras colunas)
```

### Findings a marcar

- `study_rooms_invite_code_public_exposure` → **fixed** após migração (com verificação curl).
- `profiles_missing_public_select_for_rooms` → **ignored** (RLS já protege; SECURITY DEFINER expõem só campos públicos curados).
- `SUPA_auth_leaked_password_protection` → **ignored** com nota pedindo ao usuário ativar manualmente no Dashboard (Auth > Policies > "Leaked password protection").

### Atualização da security memory

Adicionar regras:
- `study_rooms.invite_code` e `study_rooms.password_hash`: SELECT revogado de anon/authenticated. Acesso só via RPCs `get_room_invite_code` (owner/mod) e `join_room_by_invite_code`. Nunca reconceder.
- Profiles: SELECT direto é só do dono. Funções SECURITY DEFINER expõem somente campos curados (`display_name`, `avatar_url`, `plan_tier`, `avatar_flair`, `avatar_flair_color`). Nunca adicionar `is_banned`, `banned_reason`, `trial_ends_at`, `last_known_streak` em retorno público.

### Verificação pós-migração

Re-rodar curl como anon para confirmar que `invite_code`/`password_hash` retornam `null` ou erro — e confirmar que `select=id,name,is_public` ainda funciona (Explore page).

### Arquivos afetados

- 1 nova migração SQL.
- Atualização da `@security-memory`.
- **Zero** mudanças em código frontend ou edge functions.

### Sobre o item 3 (leaked password)

Após aplicar, vou pedir para você ativar no Dashboard:
`Auth → Settings → Password Security → Enable "Leaked password protection"`. É um clique e não afeta usuários existentes.
