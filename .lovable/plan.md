## Análise dos 3 avisos

### 1. `SUPA_anon_security_definer_function_executable` (anon pode executar)
Atualmente apenas **3 funções** estão executáveis por `anon`:
- `find_room_by_invite_code` — **não é usada por anon no app** (todos os call-sites estão em páginas autenticadas: `Rooms.tsx`). Pode revogar de `anon`.
- `get_public_rooms_ranking` — **não é chamada em lugar nenhum** no frontend (só `get_public_rooms_ranking_by_period` é usada). Pode revogar de `anon` (e até de `authenticated`, mas mantemos para não arriscar).
- `get_public_rooms_ranking_by_period` — usada em `Explore.tsx`. Explore é página acessível sem login? Precisa ser pública.
- `get_room_public_preview` — usada em `RoomPreview.tsx` (página de preview de convite, **acessível sem login**). Deve continuar pública.

**Decisão segura:** revogar `anon` de `find_room_by_invite_code` e `get_public_rooms_ranking`. Manter `get_public_rooms_ranking_by_period` e `get_room_public_preview` acessíveis a `anon` (são intencionalmente públicas — o linter vai continuar avisando sobre essas duas, mas vamos marcar como "ignored" com justificativa, pois são features públicas legítimas).

### 2. `SUPA_authenticated_security_definer_function_executable` (authenticated pode executar)
Esse aviso é **informativo/genérico** — o linter sinaliza qualquer SECURITY DEFINER que `authenticated` possa executar. Praticamente todas as nossas RPCs precisam ser executáveis por usuários logados (é o padrão de uso do app: `get_my_rooms`, `join_public_room`, `consume_streak_freeze`, etc.). Cada função já valida `auth.uid()` e permissões internamente.

**Decisão segura:** **ignorar este aviso** com justificativa registrada. Revogar a execução quebraria o app inteiro. As funções têm verificações internas adequadas.

### 3. `SUPA_public_bucket_allows_listing` (bucket avatars permite listagem)
A política atual em `storage.objects` para o bucket `avatars`:
```
SELECT: bucket_id = 'avatars'  → roles {anon, authenticated}
```
Isso permite `supabase.storage.from('avatars').list()` enumerar todos os arquivos. O app **só usa `getPublicUrl` e `upload`** (em `Settings.tsx`), nunca `.list()`. URLs públicas continuam funcionando mesmo sem permissão de SELECT na tabela `storage.objects` (servidas via CDN público).

**Decisão segura:** substituir a política SELECT por uma que permita apenas o dono ver/listar os próprios arquivos:
```sql
DROP POLICY "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Users can list own avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```
URLs `getPublicUrl` continuam funcionando (servidas pelo endpoint `/storage/v1/object/public/...` que não exige RLS). Avatares continuam visíveis no app via `<img src={url}>`.

---

## Plano de execução

### Migração SQL única

```sql
-- 1. Revogar EXECUTE de anon em funções SECURITY DEFINER que não precisam ser públicas
REVOKE EXECUTE ON FUNCTION public.find_room_by_invite_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_public_rooms_ranking(text, text, text) FROM anon;

-- 2. Fechar listagem do bucket avatars (mantendo getPublicUrl funcionando)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users can list own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Marcar findings com justificativa

- `SUPA_anon_security_definer_function_executable`: depois da migração restará apenas `get_public_rooms_ranking_by_period` e `get_room_public_preview` acessíveis por anon — **intencional** (Explore e RoomPreview são páginas públicas). Marcar como **ignored** com justificativa registrada na security memory.
- `SUPA_authenticated_security_definer_function_executable`: **ignored** — todas as RPCs precisam ser chamáveis por usuários logados; cada função valida `auth.uid()` e regras de negócio internamente.
- `SUPA_public_bucket_allows_listing`: marcar como **fixed** após a migração.

## Verificação de não-regressão

- ✅ `Settings.tsx` (upload de avatar): `upload` (INSERT) e `getPublicUrl` (não exige SELECT na tabela) continuam ok.
- ✅ Exibição de avatares no app: usa `avatar_url` salva no profile via `<img>` apontando para `/storage/v1/object/public/...` — não depende de RLS de SELECT.
- ✅ `RoomPreview.tsx` (anon): usa `get_room_public_preview` e `get_member_public_stats`. A primeira continua pública. **Atenção:** `get_member_public_stats` hoje **não está acessível por anon** — verificar se RoomPreview é realmente acessível sem login. Se sim, é uma quebra preexistente, não causada por esta mudança.
- ✅ `Explore.tsx`: usa `get_public_rooms_ranking_by_period` (continua acessível por anon) e `get_global_user_ranking` (apenas authenticated). Se Explore exige login, ok; se não, `get_global_user_ranking` já estava quebrada para anon.
- ✅ Nenhum call-site usa `find_room_by_invite_code` ou `get_public_rooms_ranking` como anon.

## Arquivos afetados

- Nova migração SQL (única).
- Atualização da `@security-memory` documentando as ignorâncias justificadas.
- Nenhuma mudança em código frontend ou edge functions.
