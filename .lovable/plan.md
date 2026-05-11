## Diagnóstico: por que mostrou 28:02 mas salvou 28:36

A diferença de ~34s vem de uma desconexão entre o pause do cliente e o pause no servidor. O fluxo atual é assim:

```text
clica Pause   → contextPause() congela display em 28:02 (instantâneo, local)
              → dispara UPDATE paused_at = now() em time_entries (assíncrono, fire-and-forget)
              → user lê 28:02 no cronômetro
              → clica Stop ainda olhando 28:02
              → stop_time_entry roda no servidor
                 - se o UPDATE de paused_at AINDA NÃO foi commitado, ou falhou,
                   ou foi parar no localStorage "pending-pause",
                   o servidor lê paused_at = NULL
                 - duration = end_time - start_time = 28:36
```

Resumindo, o display é “travado” no cliente no instante do clique, mas o servidor depende do UPDATE que pode chegar segundos depois (ou nunca, em caso de falha de rede). Como `stop_time_entry` reconstrói tudo do zero a partir de `paused_at`/`paused_seconds`, qualquer atraso/perda nesse update vira tempo a mais no salvo.

Outros cenários onde o mesmo bug aparece:
- Clicou Pause → Stop em sequência rápida (race entre os dois requests).
- Pause caiu na rede → ficou em `localStorage` pendente → Stop foi mais rápido que o retry.
- Várias pausas/resumes seguidas: cada resume soma `now - paused_at` no servidor, mas `now` no servidor é diferente do `Date.now()` que o cliente usou no `pauseStartTime`. Cada operação adiciona alguns segundos de drift.

## Plano de correção

Princípio: o número que o usuário vê no cronômetro no instante em que clica Stop tem que ser exatamente o que é salvo. O servidor continua sendo a autoridade final para anti-fraude, mas usando o valor do cliente como “teto” confiável.

1. Tornar o stop autoritativo a partir do display
   - Frontend calcula `display_seconds` no exato clique em Stop (mesma fórmula que mostra na tela).
   - Passa esse valor para `stop_time_entry(_entry_id, _client_seconds)`.
   - O servidor calcula `wall = end_time - start_time` e usa:
     `duration = LEAST(wall, GREATEST(0, _client_seconds))`
     Assim o salvo é exatamente o que estava no cronômetro, e nunca pode ultrapassar o tempo real decorrido (limite anti-fraude).

2. Garantir consistência do estado de pausa antes do stop
   - No `handleStopConfirm`, antes do `stop_time_entry`, fazer flush:
     - Se houver pausa pendente em `localStorage`, aplicar agora (await).
     - Se acabou de pausar, aguardar a Promise do `paused_at` UPDATE concluir.
   - Implementar via uma ref `pausePromiseRef` que guarda a última operação pendente; `handleStopConfirm` faz `await pausePromiseRef.current` antes de mutar o stop.

3. Tornar o pause realmente confiável
   - Trocar o `update().then()` por `await` dentro de uma Promise armazenada na ref.
   - Manter o retry + fallback localStorage que já existe, mas devolvendo a Promise para quem precisar aguardar.
   - Mesmo tratamento para resume.

4. Backfill defensivo no servidor
   - Atualizar `stop_time_entry` para aceitar `_client_seconds` opcional (default NULL).
   - Quando `_client_seconds` vier preenchido: usar a fórmula nova (LEAST/GREATEST).
   - Quando vier NULL: cair na lógica atual (compatibilidade com chamadas antigas, tipo SidebarMiniTimer/Pomodoro).
   - Atualizar também `SidebarMiniTimer` para passar o display.

5. Validação
   - Pausa em 28:02 → Stop imediato → salvo: 28:02.
   - Pausa, espera 1min, Stop → salvo: 28:02 (pausa conta como pausa).
   - Sem pausa, Stop em 17:30 → salvo: 17:30.
   - Várias pausas/resumes: salvo bate com display.
   - Stop com rede ruim no pause: salvo bate com display, não infla.

## Arquivos a alterar

```text
src/pages/Index.tsx              -- await pause antes do stop, passar display_seconds
src/hooks/useTimeEntries.ts      -- useStopTimer aceita clientSeconds
src/components/SidebarMiniTimer.tsx -- passar display_seconds no stop
public.stop_time_entry            -- novo parâmetro opcional _client_seconds
```

Resultado: o tempo salvo é sempre exatamente o que o cronômetro mostrava no clique de Stop, dentro do limite físico do tempo real decorrido.