# Diagnóstico — Por que está contabilizando 12h sem o usuário ter estudado

Confirmei o bug analisando o banco. Caso do Nicky (entry `c2f2adda`):
- `start_time`: 06/05 21:17 UTC
- `end_time`: 07/05 09:25 UTC
- `duration`: 43200s (12h, **truncado pelo trigger** que limita a 12h — sem ele teria sido ainda maior)
- `paused_seconds`: apenas **523s (~8min)**
- `paused_at`: **NULL** no momento do STOP

## Causa raiz (3 falhas combinadas)

1. **Pause no servidor é fire-and-forget**. Em `src/pages/Index.tsx` (linha 105-112), o `handlePause` envia `update paused_at` sem `await` e sem retry. Se o usuário pausa e fecha a aba 1 segundo depois (ou perde rede), o servidor **nunca registra a pausa**. O cliente acha que está pausado (localStorage), o servidor acha que está rodando.

2. **InactivityCheckModal só funciona com aba aberta**. Toda a lógica de "você ainda está aí?" vive no client (`InactivityCheckModal.tsx`). Se a aba está fechada / dispositivo desligado, **nada protege o servidor** contra horas fantasmas.

3. **`stop_time_entry` confia cegamente em `paused_at`/`paused_seconds`**. Quando o usuário volta no dia seguinte e clica STOP, a RPC calcula `duration = (now - start_time) - paused_seconds`. Como `paused_at` está NULL e `paused_seconds=523`, vira ~12h+ → o trigger clampa em 12h e ainda escreve "[auto-ajustada: excedeu 12h]" como se o usuário tivesse estudado 12h reais.

Resultado: o ranking de Explorar mostra horas que nunca aconteceram.

---

# Plano da solução

A ideia central é tornar o **servidor a fonte da verdade da presença** via heartbeat, e fazer o STOP descontar qualquer gap em que o usuário sumiu.

## 1. Heartbeat server-side em `time_entries`

Migration adicionando coluna e função:

- `time_entries.last_heartbeat_at timestamptz` (default = `start_time` na criação, via trigger).
- RPC `heartbeat_time_entry(_entry_id uuid)` que apenas faz `UPDATE time_entries SET last_heartbeat_at = now() WHERE id = _entry_id AND user_id = auth.uid() AND end_time IS NULL AND paused_at IS NULL`.
- Index parcial em `(user_id) WHERE end_time IS NULL` para varreduras rápidas.

## 2. Cliente: ping a cada 60s + on-pause/visibility

Em `src/pages/Index.tsx`:
- Enquanto `activeEntry` existe e **não está pausado**, chamar `heartbeat_time_entry` a cada 60s, e também em `visibilitychange→visible` e em `beforeunload`.
- Tornar `handlePause` confiável: trocar `.then(() => {})` por `await` com retry simples (até 2 tentativas) e, se falhar, gravar flag `pending_pause_at` em localStorage para reenviar no próximo carregamento.

## 3. Reconciliação no STOP (servidor decide tudo)

Reescrever `stop_time_entry(_entry_id)`:
- Calcular `_pause_now = paused_at ? (now - paused_at) : 0` (já existe).
- **Novo**: calcular `_ghost = GREATEST(0, (now - last_heartbeat_at) - INTERVAL '2 minutes')` quando o STOP acontece e a sessão estava ativa (não pausada). Esse gap = tempo em que ninguém confirmou presença.
- `_effective_paused = paused_seconds + _pause_now + _ghost`.
- `duration = GREATEST(0, (end - start) - _effective_paused)`.
- Anotar em `notes` se `_ghost > 5 min`: `[ajustada: -Xh sem heartbeat]`.

Tolerância de 2 min absorve o intervalo normal entre pings.

## 4. Auto-pausa server-side de sessões abandonadas

Função `auto_pause_stale_entries()` SECURITY DEFINER:
- Para todo `time_entries` com `end_time IS NULL`, `paused_at IS NULL` e `last_heartbeat_at < now() - INTERVAL '15 minutes'`:
  - Setar `paused_at = last_heartbeat_at + INTERVAL '2 minutes'` (congela o cronômetro no momento real do sumiço).
  - Acumular nada extra em `paused_seconds` (a próxima ação resolve via fórmula do item 3).

Disparada de duas formas:
- **Lazy**: chamada no início de `useActiveTimeEntry` (uma RPC barata) e no `handleResume`/`handleStopConfirm`.
- **Opcional (futuro)**: pg_cron a cada 5 min se disponível — não bloqueante para esta entrega.

## 5. Hidratação ao reabrir a aba

Em `src/pages/Index.tsx`, no efeito que carrega `activeEntry`:
- Se `last_heartbeat_at < now() - 15 min` e não há `paused_at`, **forçar pausa local + chamar `auto_pause_stale_entries`** antes de exibir o tempo. O usuário vê "Pausado" e pode resumir, sem que o cronômetro continue acumulando ghost time visualmente.

## 6. Correção retroativa (não destrutiva)

Migration única que percorre `time_entries` finalizadas com:
- `duration >= 39600` (≥11h) **e** `paused_seconds < 600` (pausa registrada quase nula) **e** sem heartbeat (NULL).

Para cada uma:
- Marcar `notes += ' [revisada: possível inatividade]'`.
- Recalcular `duration = LEAST(duration, 7200)` (2h conservador) **somente** quando o usuário não tem nenhuma outra entrada cobrindo esse intervalo (evita zerar sessão real).
- Recalcular `total_seconds` em `room_members` para os usuários afetados.

Esse passo é o único que altera dados históricos — fica isolado em uma migration própria, com comentário explicando para auditoria.

## 7. Sem mudanças em UI visível

Nada muda visualmente para o usuário comum. O modal de inatividade continua existindo (camada extra). A diferença é que mesmo sem o modal, o servidor agora protege a contabilidade.

---

# Arquivos afetados

```text
supabase/migrations/<novo>_heartbeat_and_stop_fix.sql
  - ALTER TABLE time_entries ADD COLUMN last_heartbeat_at
  - trigger default last_heartbeat_at = start_time
  - CREATE FUNCTION heartbeat_time_entry
  - CREATE FUNCTION auto_pause_stale_entries
  - CREATE OR REPLACE FUNCTION stop_time_entry  (com _ghost)
  - índice parcial

supabase/migrations/<novo>_retroactive_ghost_fix.sql
  - UPDATE time_entries afetadas + recálculo room_members.total_seconds

src/pages/Index.tsx
  - handlePause: await + retry + flag de pause pendente
  - novo useEffect heartbeat (60s + visibility + beforeunload)
  - hidratação: chamar auto_pause_stale_entries e detectar staleness

src/hooks/useTimeEntries.ts
  - useActiveTimeEntry: chamar auto_pause_stale_entries antes do select
  - tipos: adicionar last_heartbeat_at em TimeEntry
```

# O que NÃO muda

- Lógica do PomodoroContext (sessões curtas, baixo risco).
- UI do timer, FullscreenTimer, ranking, conquistas.
- RLS existentes — apenas RPCs novas com SECURITY DEFINER validando `auth.uid()`.
- Trigger de clamp de 12h continua como rede de segurança final.
