
# Fix Explore (Salas + Usuários)

## Diagnóstico

Investiguei o banco e o código. Existem **3 problemas distintos** causando o que você está vendo:

### 1. Sala "Leitura" não aparece em Explorar → Salas
- A única sala criada (`Leitura`, dona do `nickygameroficial`) tem `is_public = false` no banco.
- A RPC `get_public_rooms_ranking_by_period` filtra por `is_public = true`, então corretamente esconde salas privadas.
- No `CreateRoomDialog`, a regra é `isPublic = !password.trim()` — ou seja, a sala só vira pública se for criada **sem senha**. Provavelmente a sala foi criada com senha, então virou privada para sempre. Não há UI para alternar isso depois (só existe em `RoomSettingsTab`, mas não está claro/visível).

### 2. Usuário `nickymenezes15@gmail.com` não aparece em Explorar → Usuários → Agora
- Ele tem um `time_entry` aberto (timer rodando), mas **não está em nenhuma sala** (`room_members` vazio para ele).
- A RPC `get_global_user_ranking` no modo `now` exige `EXISTS (... room_members rm WHERE rm.is_timer_active = true)`. Ou seja, só conta quem está estudando **dentro de uma sala**.
- Resultado: timers solo são invisíveis no ranking "Agora", mesmo estando online estudando.

### 3. `is_online` em `room_members` fica desatualizado
- O flag `is_online` só é setado para `true` quando o usuário abre a página da sala, e volta a `false` no `beforeunload`.
- Quem está com timer ativo mas não está com a aba da sala aberta aparece como offline. Por isso `online_count` subestima na Explore.
- O `studying_count` (que usa `is_timer_active + last_active_at < 2h05min`) é o indicador confiável de "estudando agora".

---

## Plano de correção

### A. Ranking de usuários "Agora" — incluir timers solo
Atualizar `get_global_user_ranking` (`_period = 'now'`) para considerar **qualquer** `time_entry` aberto e não pausado nas últimas 24h, independentemente de pertencer a uma sala. Mantém o respeito a `is_stats_public` (anonimizado quando privado).

Resultado: `nickymenezes15` passa a aparecer no ranking "Agora".

### B. Salas em Explore — mostrar salas com estudo ativo, mesmo privadas (anonimizadas)
Duas mudanças na RPC `get_public_rooms_ranking_by_period`:

1. **Modo "Agora"**: incluir também salas privadas que tenham pelo menos 1 membro com `is_timer_active = true` nas últimas 2h05min — mas exibindo apenas nome genérico ("Sala privada"), sem descrição, sem permitir entrada (front decide).
2. Adicionar coluna `is_public` ao retorno para o front diferenciar.

No front (`Explore.tsx`):
- Salas privadas no período "Agora" exibem nome ofuscado, ícone de cadeado, contagem de pessoas estudando, e botão "Entrar" desativado (ou substituído por "Sala privada — peça convite").
- Para os outros períodos (Hoje/Semana/Total) mantém só públicas.

### C. Permitir tornar sala pública sem deletar
- Garantir que `RoomSettingsTab` exponha o toggle "Sala pública" de forma clara para o dono. Verificar se está visível e funcionando; ajustar copy se necessário.
- Adicionar atalho/aviso no `CreateRoomDialog` deixando explícito: "Sala com senha = privada (não aparece em Explorar)".

### D. Sincronizar `is_online` com timer ativo
Para refletir presença real no contador `online_count`:
- No `useRoomMembers`, manter `is_online = true` enquanto o usuário tiver qualquer aba do app aberta (não só a página da sala). Mover o ping de presença para um nível superior (ex: `MainLayout` ou `AuthContext`), atualizando todas as filiações de sala do usuário.
- Adicionar heartbeat a cada ~60s atualizando `last_active_at` para todas as `room_members` do usuário, e marcar `is_online = false` apenas após inatividade real (timeout) — não no `beforeunload`, que é pouco confiável.
- Alternativa mais simples (recomendada): usar `is_timer_active = true OR last_active_at recente` como definição de "online" diretamente nas RPCs e nos componentes, sem mexer no schema.

### E. Correção pontual na sala existente
Após aprovar o plano, dar opção ao usuário de:
- Tornar manualmente a sala "Leitura" pública (UPDATE pontual via migration, com confirmação), **ou**
- Deixar como está e só corrigir o fluxo daqui para frente.

---

## Detalhes técnicos

**Arquivos a editar**
- `supabase/functions` → migration SQL para recriar:
  - `public.get_global_user_ranking` (modo `now` sem exigir room_members)
  - `public.get_public_rooms_ranking_by_period` (incluir privadas com estudo ativo + coluna `is_public`)
- `src/pages/Explore.tsx` — renderização condicional para salas privadas/anonimizadas; usar `studying_count` como destaque do período "Agora"
- `src/hooks/useRoomMembers.ts` ou novo `usePresenceHeartbeat.ts` — heartbeat global de presença
- `src/components/rooms/CreateRoomDialog.tsx` — copy explicando senha=privada
- `src/components/rooms/RoomSettingsTab.tsx` — verificar toggle público/privado

**Sem breaking changes** no schema; somente novas migrations de `CREATE OR REPLACE FUNCTION` e (opcional) UPDATE pontual da sala existente.

**Verificações pós-deploy**
1. `nickymenezes15` aparece em Explorar → Usuários → Agora.
2. Sala "Leitura" aparece em Explorar → Salas → Agora (anonimizada se mantida privada, ou normal se for tornada pública).
3. `online_count` reflete usuários realmente ativos.
