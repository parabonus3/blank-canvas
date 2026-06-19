## Diagnóstico

O status "Online" hoje vem do campo `room_members.is_online`, que é setado como `true` quando o usuário abre a sala e só vira `false` no evento `beforeunload` do navegador (`src/hooks/useRoomMembers.ts`).

Isso falha em praticamente todos os cenários reais:
- Fechar a aba pelo gestor de tarefas, celular indo pra background, perda de conexão, crash do browser, sair do Wi-Fi: o `beforeunload` não dispara.
- PWA/mobile raramente entrega `beforeunload`.
- Resultado: o flag `is_online=true` fica "preso" por dias, exatamente como na imagem (Nicolas marcado como Online mas sem entrar há dias).

## Plano (sem quebrar nada que já funciona)

A correção é usar **presença derivada de heartbeat**, não um booleano persistente. O campo `last_active_at` já existe e é confiável — vamos passar a confiar nele.

### 1. Heartbeat no cliente (sala aberta)
Em `useRoomMembers.ts`:
- Ao entrar na sala: atualizar `last_active_at = now()` e `is_online = true` (como já faz).
- Iniciar um `setInterval` de **60s** que atualiza só `last_active_at` enquanto a aba existir.
- Pausar o heartbeat quando `document.visibilityState === "hidden"` e retomar quando voltar a "visible".
- Ao sair da sala / desmontar / `beforeunload` / `pagehide`: tentar marcar `is_online = false` (best-effort, como hoje).

### 2. Online "real" derivado de frescor
A verdade passa a ser: **online = `last_active_at` nos últimos 2 minutos**, independente do flag.

- No `useRoomMembers` (mapeamento dos membros), calcular:
  - `is_online_effective = last_active_at && (now - last_active_at) < 120s`
  - Sobrescrever `member.is_online` com esse valor antes de devolver.
- Assim, `RoomMemberGrid`, `MemberProfileModal` e `RoomStatsHeader` continuam lendo `member.is_online` sem mudança nenhuma — não quebra nada.

### 3. Auto-refresh do grid
A frescura muda com o tempo, então o React precisa reavaliar:
- Adicionar um `refetchInterval` de 60s no `useQuery` de `roomMembers` (ou um `setInterval` que invalida a query a cada 60s).
- Isso garante que alguém que ficou inativo passe de verde para cinza sem precisar recarregar.

### 4. Limpeza no servidor (defesa em profundidade)
Sem isso, registros antigos com `is_online=true` continuam até alguém abrir/fechar a sala. Adicionar uma rotina leve para zerar:

- Migration com função `mark_stale_members_offline()` (SECURITY DEFINER) que faz:
  ```sql
  UPDATE public.room_members
     SET is_online = false
   WHERE is_online = true
     AND (last_active_at IS NULL OR last_active_at < now() - interval '3 minutes');
  ```
- Agendar via `pg_cron` a cada 2 minutos (`SELECT cron.schedule(...)`).
- Isso só corrige o lixo histórico; a UI já é confiável pelo passo 2.

### 5. Mesma correção para "estudando agora"
`is_timer_active` tem o mesmo risco quando o timer é interrompido por crash. Como já existe `timer_started_at` e existe lógica de inatividade dedicada (InactivityCheckModal), **não vamos mexer agora** para não acoplar a esse outro fluxo. Fica de melhoria futura se aparecer relato semelhante.

## O que NÃO muda
- Schema público: nenhum campo novo no front. Continuamos lendo `member.is_online`.
- Componentes de UI (`RoomMemberGrid`, `MemberProfileModal`, `RoomStatsHeader`): **zero alteração**.
- Lógica de chat, timer, conquistas, ranking, atividade: intocadas.
- Apenas `useRoomMembers.ts` ganha heartbeat + derivação de online, mais uma migration de cron de limpeza.

## Detalhes técnicos
- Janela de frescor: 2 minutos no cliente, 3 minutos no servidor (margem para evitar flicker entre tick do heartbeat e job do cron).
- Heartbeat pausa em `visibilitychange` para não consumir bateria/quota em abas em background.
- Tudo client-side é best-effort: se a chamada falhar, ignora silenciosamente (sem toast).
- `pg_cron` e `pg_net` já são extensões padrão no Supabase; só precisamos do `cron.schedule`.

<presentation-actions>
<presentation-link url="https://supabase.com/dashboard/project/iukwvfyhforubyqgguwl/database/extensions">Verificar extensões (pg_cron) no Supabase</presentation-link>
</presentation-actions>