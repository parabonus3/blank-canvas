# Diagnóstico e plano de correção

## Bug 1 — Pausa não foi contabilizada ao parar o cronômetro

### O que aconteceu (confirmado no banco)

A entry ativa do usuário mostrada na tela tem:
- `start_time = 22:35:19`
- `paused_at = 22:54:37` (foi pausada ~19min depois)
- `paused_seconds = 550` (~9min de pausa anterior já acumulados)
- `end_time = null` (ainda não foi parada)

Ou seja, a pausa **está sendo registrada no servidor**. O problema é o que acontece quando o usuário clica em "Parar" enquanto ainda está pausado.

### A causa raiz

Em `src/pages/Index.tsx` (`handleStopConfirm`), após minha última alteração, a ordem ficou:

```
1. playStopSound()          ← OK
2. calcula totalPausedSeconds (incluindo pausa atual)
3. stopTimer.mutate({ pausedSeconds: totalPausedSeconds })
4. resetPause()              ← limpa o context local
```

Mas o `useStopTimer` (em `src/hooks/useTimeEntries.ts`) já tem fallback do servidor:

```ts
const effectivePaused = Math.max(pausedSeconds, serverPaused + liveServerPause);
```

Então o cálculo no `mutate` está correto **se o cliente enviar o valor certo**.

O problema real é que **`pausedElapsed` no contexto não é incrementado em tempo real enquanto está pausado** — ele só é incrementado quando o usuário clica em "Resume". Se o usuário pausar e clicar direto em "Parar" sem retomar, o cliente envia apenas `pausedElapsed` (valor antigo) — mas o `Math.max(pausedSeconds, serverPaused + liveServerPause)` deveria pegar o `liveServerPause` (`now - paused_at`) corretamente.

**Investigando mais a fundo**: o `handleStopConfirm` calcula `currentPauseDuration = (Date.now() - pauseStartTime) / 1000` e soma. Isso já está correto. Então por que o usuário viu o tempo cheio?

### Hipótese real

O bug está no `SidebarMiniTimer.handleStop` e no `Index.handleStopConfirm`: quando o stop acontece **dentro do estado pausado**, o `displayedElapsed` mostra o valor congelado correto, mas:

1. `formatTime(elapsed)` no toast/dialog mostra o elapsed **descontando o pausedElapsed**, mas **não desconta a pausa atual em andamento** — porque o `useEffect` que calcula `elapsed` faz `pausedElapsed` (o estado salvo), não inclui o tempo decorrido desde `pauseStartTime`.

Olhando o `useEffect`:
```ts
if (isPaused) {
  const frozenTime = pauseStartTime
    ? Math.floor((pauseStartTime - startTime) / 1000) - pausedElapsed
    : ...
}
```

Isso está correto — congela em `pauseStartTime`. Mas o `duration` salvo no DB usa `endTime - startTime - effectivePaused`. Se `effectivePaused` for menor que o esperado, a duration fica inflada.

**O verdadeiro bug**: no `useStopTimer`, `serverPaused = paused_seconds` (550) e `serverPausedAt = paused_at`. O `liveServerPause = now - paused_at` ≈ tempo desde a pausa atual. Mas o valor enviado pelo cliente (`pausedSeconds`) inclui `pausedElapsed (já acumulado) + currentPauseDuration (pausa atual)`. Se `pausedElapsed` no contexto **não foi sincronizado com o `paused_seconds` do servidor** (550), o cliente envia só, digamos, 0 + 1140 = 1140, enquanto o servidor calcula 550 + 1140 = 1690. O `Math.max` pega 1690 → certo.

**Mas se houver problemas de sincronização de hidratação** (`hydrateFromServer` só roda se `pausedElapsed === 0`), e o estado inicial vier do localStorage com valor errado, a pausa antiga pode não ser contabilizada. Isso explicaria o comportamento.

### Reprodução provável
- Usuário pausa (servidor: paused_seconds=0, paused_at=T1)
- Usuário retoma (cliente acumula em pausedElapsed local; servidor: paused_seconds=X, paused_at=null)
- Usuário pausa de novo (servidor: paused_at=T2, paused_seconds=X)
- **Usuário fecha aba / muda de dispositivo / cache limpo**
- Volta, abre o timer
- `pausedElapsed` no contexto é 0 (localStorage vazio); `hydrateFromServer` restaura `pausedElapsed = X` e `pauseStartTime = T2`
- Usuário clica em parar **sem retomar**
- Cliente envia: `pausedElapsed (X) + (now - T2)` ✓
- Servidor faz: `Math.max(X + (now-T2), X + (now - T2))` ✓

OK, nesse caso funciona. Mas se o `hydrateFromServer` não roda (porque o `useEffect` depende do `activeEntry?.id` e algum re-render sobrescreve), o cliente envia 0 — e o `Math.max` pega o valor do servidor. **Isso já está protegido.**

### Conclusão sobre o bug 1

Após análise minuciosa, o cálculo está logicamente correto na maioria dos caminhos. Os pontos de falha possíveis:

1. **Stop pelo dialog enquanto pausado**: o `currentPauseDuration` é calculado, mas só se `isPaused && pauseStartTime` ambos verdadeiros. Se o `isPaused` for `true` mas `pauseStartTime` for `null` (estado corrompido), a pausa atual não é somada. O `Math.max` no servidor então pega só `pausedSeconds` antigo — **bug**.

2. **Toast mostra duração cheia**: o `toast` em `useStopTimer.onSuccess` mostra `data.duration` (vindo do servidor), então se o backend gravou errado, o toast também fica errado.

### Correções para Bug 1

**a) Tornar o cálculo do servidor sempre autoritativo** em `useStopTimer`:
   - Em vez de `Math.max(client, server)`, calcular tudo no servidor com base em `paused_at`/`paused_seconds`.
   - O cliente envia apenas `entryId` e `roomId`. O servidor calcula `effectivePaused = paused_seconds + (paused_at ? now - paused_at : 0)`.

**b) Adicionar uma função RPC `stop_time_entry`** que faz o cálculo atomicamente no Postgres, evitando race conditions client/server e simplificando o código.

**c) Garantir hidratação correta**: ajustar `hydrateFromServer` para sobrescrever `pausedElapsed` quando o servidor tiver valor maior (não só quando o local for 0).

## Bug 2 — Ranking "Agora" mostra usuários que não confirmaram a verificação de 2h

### O que está acontecendo (confirmado no banco)

Existe um registro:
- `id = c1ad41a4...` 
- `start_time = 16:27` (hoje)
- `end_time = null`, `paused_at = null`, `paused_seconds = 0`
- Última atualização: `16:27` (ou seja, **nunca foi tocado depois disso**)

O usuário começou um timer às 16:27, **fechou a aba** (ou abandonou), nunca confirmou a verificação de 2h, e agora aparece no ranking "Agora" com 6h25m de "estudando agora" — porque a função `get_global_user_ranking` com `_period='now'` filtra apenas:

```sql
WHERE te.end_time IS NULL AND te.paused_at IS NULL
  AND te.start_time >= (now() - INTERVAL '24 hours')
```

Não há checagem de `last_active_at` ou de heartbeat real.

### Por que isso acontece

A verificação de 2h (`InactivityCheckModal`) **só roda no cliente, com a aba aberta**. Se o usuário fecha a aba ou perde foco prolongado, ninguém pausa a entry no servidor — ela fica "ativa" para sempre (ou até o usuário voltar).

### Correções para Bug 2

**a) Filtrar `get_global_user_ranking` (period='now')** para considerar somente entries com atividade recente:
   - Critério proposto: `te.updated_at >= now() - INTERVAL '15 minutes'` OU exigir que exista um `room_member.last_active_at >= now() - INTERVAL '15 minutes'` para o usuário.
   - Como o heartbeat de `room_members.last_active_at` roda a cada 5min quando o timer está rodando (ver `Index.tsx` linha 150-162), 15 min é uma margem segura.

**b) Mesmo critério para `get_public_rooms_ranking_by_period` `studying_count`**: já usa `last_active_at >= now() - INTERVAL '2 hours 5 minutes'`. Reduzir essa janela para 15 min para ser mais preciso (ou manter 2h5min e adicionar cap).

**c) Job de limpeza (opcional, futuro)**: criar uma função SQL `auto_close_stale_entries()` que roda via cron e fecha entries com mais de 2h sem `updated_at`. Por agora, vamos só filtrar na consulta — sem alterar dados existentes.

## Resumo das mudanças propostas

### Backend (uma migration)
1. Atualizar `get_global_user_ranking(_period='now')` para exigir `te.updated_at >= now() - INTERVAL '15 minutes'`.
2. Atualizar `get_public_rooms_ranking_by_period` `studying_count` para usar a mesma janela de 15 min.
3. Criar RPC `stop_time_entry(_entry_id uuid, _room_id uuid default null)` que calcula `effective_paused` no servidor (`paused_seconds + COALESCE(now() - paused_at, 0)`), grava `end_time` e `duration`, atualiza `room_members`, retorna a entry.

### Frontend
4. `src/hooks/useTimeEntries.ts` — `useStopTimer` passa a chamar a RPC `stop_time_entry`. Remove o cálculo client-side de `effectivePaused`.
5. `src/pages/Index.tsx` `handleStopConfirm` — simplifica: só envia `entryId` e `roomId`. Mantém `playStopSound` antes da mutação.
6. `src/components/SidebarMiniTimer.tsx` `handleStop` — mesma simplificação.
7. `src/contexts/TimerContext.tsx` `hydrateFromServer` — sobrescrever `pausedElapsed` quando o valor do servidor for maior (não só quando for 0), evitando dessincronização visual.

### Sem mudança de dados
- Não vamos fechar entries antigas em massa. O filtro de 15 min na query basta para "Agora".
- Entries órfãs continuam no DB; o usuário pode pará-las manualmente se quiser.

## Por que isso é seguro

- A RPC `stop_time_entry` é `SECURITY DEFINER` mas verifica `auth.uid() = user_id`, igual ao padrão atual.
- O filtro de 15 min em "Agora" é mais restritivo (não menos): nenhum usuário que está realmente ativo será removido (heartbeat roda a cada 5 min).
- O cálculo de pausa no servidor elimina dependência do estado do cliente (mais robusto a cache limpo, multi-dispositivo, etc).
