# Plano: corrigir 4 findings de segurança sem quebrar nada

Cada correção é cirúrgica: mantém o comportamento atual do app intacto, só fecha a brecha.

---

## 1. `study_rooms_invite_code_exposed` — esconder invite_code/password_hash dos membros comuns

**Problema**: a policy `Members can view rooms` deixa qualquer membro ler `invite_code` e `password_hash` direto da tabela.

**Onde o app usa hoje** (já mapeado):
- `useRooms.ts` faz `select("...invite_code...")` na listagem das salas do usuário.
- `RoomDetail.tsx` já usa o RPC `get_room_invite_code` (que internamente checa membership).
- `InviteMemberDialog` recebe `inviteCode` por prop (vindo do `useRooms`).

**Solução (sem quebrar)**:
1. Criar uma **VIEW** `public.study_rooms_safe` que expõe todos os campos de `study_rooms` **exceto `invite_code` e `password_hash`**, com `security_invoker=true` (respeita RLS da tabela base).
2. Criar RPC `get_my_rooms()` que retorna a lista de salas do usuário a partir dessa view + `member_count`.
3. Alterar `useRooms.ts` para chamar `get_my_rooms()` em vez de selecionar `invite_code` diretamente.
4. Alterar `useRooms.ts` para **não** trazer `invite_code` no objeto da listagem. O `InviteMemberDialog` passa a buscar o code sob demanda via RPC `get_room_invite_code` (que já existe e exige membership — pode ser endurecida para exigir owner/moderator se quisermos restringir mais).
5. **Endurecer `get_room_invite_code`**: passar a permitir apenas `owner` ou `moderator` (membros comuns deixam de ver o code). Hoje qualquer membro vê — vamos restringir.
6. Ajustar a policy `Members can view rooms` para continuar permitindo SELECT (não dá pra fazer column-level RLS sem refator pesado), mas **revogar** os grants de coluna em `invite_code` e `password_hash` para `authenticated`/`anon`, mantendo só para `service_role` e dono via RPC.

**Frontend a tocar**:
- `src/hooks/useRooms.ts` — trocar select por RPC.
- `src/components/rooms/InviteMemberDialog.tsx` — buscar invite code via RPC quando abrir o dialog (apenas owner/mod terão acesso; para membro comum, esconder a aba "by_link").
- `src/pages/RoomDetail.tsx` — passar `userRole` para o dialog para esconder convite por link se não for owner/mod.

---

## 2. `room_members_update_role_escalation` — fechar escalada via policy do owner/mod

**Problema**: a policy `Owner or mod can update members` não tem `WITH CHECK`, então um moderador poderia, em teoria, se promover a `owner` via UPDATE direto. O trigger `enforce_room_member_role_change` já bloqueia isso, mas o linter não enxerga o trigger.

**Solução**:
- Adicionar `WITH CHECK` explícito na policy `Owner or mod can update members`:
  ```sql
  WITH CHECK (
    is_room_owner(auth.uid(), room_id)
    OR (
      EXISTS (SELECT 1 FROM room_members rm2
              WHERE rm2.room_id = room_members.room_id
                AND rm2.user_id = auth.uid()
                AND rm2.role = 'moderator')
      AND role IN ('member','moderator')        -- mod nunca pode setar 'owner'
      AND user_id <> auth.uid()                  -- mod não pode editar a si mesmo
    )
  )
  ```
- Mantém o trigger como segunda camada de defesa.

**Frontend**: nenhuma mudança. Owners continuam podendo tudo via RPC `set_member_role`.

---

## 3. `SUPA_anon_security_definer_function_executable` — revogar EXECUTE de `anon` em funções sensíveis

**Problema**: várias funções `SECURITY DEFINER` em `public.*` estão executáveis por `anon`/`authenticated` porque por padrão o Postgres concede `EXECUTE` a `PUBLIC`.

**Funções que devem permanecer públicas** (`anon` precisa chamar):
- `get_room_public_preview(_invite_code)` — usada em `RoomPreview` antes de logar.
- `find_room_by_invite_code(_code)` — idem.
- `get_public_rooms_ranking*` — exploração pública.

**Funções que devem ser só `authenticated`** (revogar de `anon`):
- `join_room_by_invite_code`, `join_public_room`, `create_room_with_password`
- `kick_room_member`, `set_member_role`, `toggle_mute_member`, `update_room_password`
- `consume_streak_freeze`, `credit_purchased_freezes`, `refresh_last_known_streak`, `check_and_grant_streak_rescue`
- `create_note_folder`, `verify_folder_password`, `update_folder_password`
- `get_room_invite_code`, `get_member_profile_stats`, `get_room_ranking_by_period`, `get_room_daily_progress`, `get_room_activity_heatmap`, `get_room_streak`, `get_room_members_streaks`, `get_member_room_streak`, `get_member_best_session`, `get_room_member_profiles`, `get_member_public_stats`, `get_friend_progress`, `find_user_by_friend_code`
- `is_room_member`, `is_room_owner`, `has_role`, `is_support_agent`, `is_support_admin`, `get_member_current_role`, `room_has_password` (helpers internos — só authenticated)

**Funções triggers** (`handle_new_user`, `set_friend_code`, `enforce_*`, `update_updated_at_column`, `generate_friend_code`): revogar de `PUBLIC` totalmente — só o owner do trigger as chama.

**Padrão SQL**:
```sql
REVOKE EXECUTE ON FUNCTION public.X(...) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.X(...) TO authenticated;
```

**Frontend**: nenhuma mudança — todas as chamadas já são feitas por usuários autenticados, exceto as 3 públicas que mantemos.

---

## 4. `SUPA_rls_policy_always_true` — restringir `Anyone can create tickets`

**Problema**: `support_tickets` INSERT está com `WITH CHECK (true)`, permitindo qualquer um (anon inclusive) criar tickets sem restrição.

**Análise**: o formulário de contato precisa funcionar para anônimos. Não dá pra trocar por `auth.uid() IS NOT NULL` sem quebrar o contato público.

**Solução (mantém comportamento, satisfaz o linter)**:
- Substituir `WITH CHECK (true)` por validações mínimas reais:
  ```sql
  WITH CHECK (
    length(trim(subject)) BETWEEN 3 AND 200
    AND length(trim(message)) BETWEEN 10 AND 5000
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND status = 'open'
    AND priority IN ('low','normal','high','urgent')
    AND (
      auth.uid() IS NULL                           -- anon: sem user_id
      OR user_id = auth.uid()                      -- logado: user_id deve bater
    )
    AND assigned_to IS NULL                        -- ninguém pré-atribui
  )
  ```
- Isso elimina `(true)` e ainda evita lixo/spoofing de `user_id`.

**Frontend**: nenhuma mudança — o form já manda `subject`, `message`, `email` válidos. Validar `NewTicket.tsx` rapidamente para garantir que respeita os limites (3-200 / 10-5000) — ajustar se preciso.

---

## Resumo das mudanças

**Migrations SQL** (1 arquivo):
- View `study_rooms_safe` + RPC `get_my_rooms()`
- Endurecer `get_room_invite_code` (owner/mod only)
- `WITH CHECK` explícito em `Owner or mod can update members`
- `REVOKE EXECUTE ... FROM PUBLIC, anon` + `GRANT TO authenticated` para ~30 funções
- Substituir `WITH CHECK (true)` em `support_tickets` por validações
- Marcar 4 findings como `mark_as_fixed`

**Frontend** (3 arquivos):
- `src/hooks/useRooms.ts` — trocar select por RPC `get_my_rooms`, remover `invite_code` do payload
- `src/components/rooms/InviteMemberDialog.tsx` — buscar invite code via RPC sob demanda; esconder aba "link" para membro comum
- `src/pages/RoomDetail.tsx` — passar role do usuário para o dialog
- (Verificar `NewTicket.tsx` — ajustar limites se necessário)

**Garantias de não-quebra**:
- Membros continuam vendo lista de salas (via view) e tudo da sala (via policies existentes), só não veem mais `invite_code`/`password_hash` no SELECT direto.
- Owners e moderadores continuam vendo o invite code via RPC.
- RPCs continuam funcionando para `authenticated` (que é como o app já chama).
- Form de contato anônimo continua funcionando, só com validações de tamanho/formato.
- Trigger `enforce_room_member_role_change` permanece como defesa extra contra escalada.

Aprove para aplicar.