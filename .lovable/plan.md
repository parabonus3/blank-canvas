## Diagnóstico

Confirmei no banco. O usuário "Anônimo" (Felipe — `a5ff890f...`) tem **uma única time_entry** com:

- `start_time`: 27/04 16:27
- `end_time`: 29/04 22:20
- `duration`: **53.88h** (193986s)
- `paused_seconds`: **3** (zero pausa real)
- wall time = duration → ou seja, o timer correu ininterrupto por 2 dias e 6 horas e foi finalizado normalmente, sem o modal de inatividade nunca ter aparecido / cortado o tempo.

### Causa raiz (bug no `InactivityCheckModal`)

O modal de inatividade depende de **3 mecanismos do navegador, todos falíveis**:

1. **`setTimeout` agendado** para daqui a 2h (`linha 113`). Quando a aba fica em background por horas, browsers mobile e desktop **suspendem timers** (Chrome congela após ~5min em background, iOS Safari mata após bloqueio de tela). O timeout simplesmente **nunca dispara**.
2. **`visibilitychange` / `focus`** (`linha 137`). Só roda se o usuário **voltar à aba**. Se ele fechou a aba/dormiu o computador/saiu do navegador sem voltar até o stop, nunca executa.
3. **Sem heartbeat de servidor.** Toda a contagem de "inatividade" vive em `localStorage`. Não há nada server-side cortando sessão zumbi.

Resultado: usuário começou timer, fechou a aba/saiu, e dias depois voltou e clicou Stop. O `stopTimer` calculou `end_time - start_time - paused_seconds` = 53.88h e gravou no banco como tempo legítimo.

Adicionalmente: **não existe limite máximo de duração** ao salvar a entry, nem no client (`useTimeEntries.stopTimer`) nem no banco. Qualquer valor passa.

---

## Plano de correção

### 1. Limpeza dos dados (migration)

Truncar a entry inflada. Política: cap de 12h por sessão contínua sem confirmação. Vou setar `duration` = 12h (43200s) e ajustar `end_time` para `start_time + 12h`, mantendo a entry para o usuário ver, mas com valor razoável. Adicionar `notes` indicando ajuste automático.

```sql
UPDATE time_entries
SET duration = 43200,
    end_time = start_time + interval '12 hours',
    notes = coalesce(notes,'') || ' [auto-ajustada: sessão sem verificação de presença]'
WHERE id = 'c1ad41a4-23e0-4563-a851-b5d7b61ffd3d';
```

### 2. Defesa em profundidade — server-side cap (migration)

Trigger `BEFORE INSERT OR UPDATE` em `time_entries` que rejeita / clampa qualquer `duration` líquido > **12h** (limite hard configurável). Razão: mesmo se o client falhar, o banco protege ranking e métricas.

```text
duracao_liquida = end_time - start_time - paused_seconds
if duracao_liquida > 12h: clampa para 12h e ajusta end_time
```

### 3. Correções no client

**`src/components/InactivityCheckModal.tsx`**
- Adicionar **checagem por `setInterval` curto** (a cada 30s) além do `setTimeout`. `setInterval` curto é menos suspendido em foreground e, ao voltar do background, dispara em catch-up.
- No `visibilitychange` ao voltar, **se o gap for > 2h, descontar TODO o gap** como tempo fantasma (hoje só desconta o excedente além de 2h — lógica correta, mas só roda se o usuário voltar à aba). Já está OK aqui — o problema é não rodar nunca.
- Adicionar listener no `beforeunload` / `pagehide` para **gravar timestamp de "última atividade visível"** no servidor (`time_entries.updated_at` via heartbeat).

**`src/hooks/useTimeEntries.ts` (stopTimer)**
- Antes de gravar, calcular `duration` final e **clampar a 12h** se exceder, registrando em `notes`. Mostrar toast avisando o usuário.
- Se `now - last_heartbeat > 2h` ao parar, descontar o gap.

**Heartbeat periódico (novo)**
- A cada 60s enquanto `isRunning && !isPaused && !document.hidden`, dar UPDATE em `time_entries.updated_at`. Isso vira a "presença real" server-side.
- Ao dar Stop, se `(end_time - last_updated_at) > 5min`, considerar tempo fantasma e descontar.

### 4. Recompute de rankings/conquistas

Após a UPDATE da entry, qualquer cache derivado (room rankings, user_achievements totals) é recomputado via RPCs já existentes na próxima query — não exige ação manual.

---

## Detalhes técnicos

- **Arquivos editados**: `src/components/InactivityCheckModal.tsx`, `src/hooks/useTimeEntries.ts`, `src/pages/Index.tsx` (registrar heartbeat).
- **Migration nova**: trigger `enforce_time_entry_max_duration()` + UPDATE pontual da entry corrompida.
- **Limite escolhido**: 12h por sessão contínua (cobre maratonas reais como concurso/dia de revisão extrema, mas barra zumbis de dias).
- **Sem breaking change**: usuários com sessões ≤12h não são afetados.

Após aprovação eu implemento tudo em uma rodada.