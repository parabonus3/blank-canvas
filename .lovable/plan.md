## Causa raiz

`src/contexts/TimerContext.tsx` → função `resume()` chama `setPausedElapsed(...)` **dentro** do updater function de `setPauseStartTime(...)`. Em React 18 StrictMode (dev) o updater é executado duas vezes, então a duração da pausa é somada **2×** em `pausedElapsed`. Resultado: `elapsed = grossSinceStart - pausedElapsed` vira ≤ 0 → cronômetro mostra 00:00:00 → ao parar, salva `duration=0` e o tempo é perdido.

Também é frágil em produção (qualquer re-execução do updater duplica). Esse é o caminho exato que o usuário relatou: "pausa funciona, mas no resume zera".

## Correções (mínimas, cirúrgicas, sem mudar o fluxo de servidor)

### 1. `src/contexts/TimerContext.tsx` — `resume()` sem side-effect aninhado

Calcular a duração da pausa **fora** dos updaters e disparar cada `setState` independentemente:

```text
resume():
  const start = pauseStartTime;            // leitura direta do state
  if (start) {
    const dur = max(0, floor((Date.now() - start) / 1000));
    setPausedElapsed(p => p + dur);        // updater puro
  }
  setPauseStartTime(null);
  setIsPaused(false);
```

Isso elimina a dupla-soma em StrictMode e em qualquer re-render. Mantém comportamento idêntico em produção quando o updater roda 1×.

### 2. Guarda anti-regressão no cálculo de `elapsed` (Index.tsx)

Em `src/pages/Index.tsx` no `useEffect` de cálculo (linhas ~267-303), no ramo **não pausado**, adicionar a mesma defesa que já existe no ramo pausado: se `pausedElapsed > grossSinceStart` (sinal de dessincronia/double-count futuro), **não zerar** — manter o último `elapsed` conhecido e logar warn. Garante que mesmo se outra regressão aparecer, o usuário nunca vê 00:00:00 magicamente.

### 3. Fallback no stop já existe — só validar

`handleStopConfirm` (linhas 388-405) já recalcula via servidor quando `clientSeconds <= 0`. Manter como rede de segurança final. Nenhuma mudança necessária.

### 4. Não mexer

- RPCs `pause_time_entry` / `resume_time_entry` no servidor — funcionam corretamente.
- `hydrateFromServer` — o fix recente está correto, não tocar.
- `pause()`, `resetPause()`, `addPausedSeconds()` — sem alterações.
- Lógica de stop, salvamento, sala, streak — intocados.
- Nenhum locale precisa de chave nova (bug puramente de cálculo).

## Arquivos a modificar

- `src/contexts/TimerContext.tsx` — reescrever `resume()` (≈8 linhas).
- `src/pages/Index.tsx` — adicionar guarda de não-zeramento no ramo running do `useEffect` de elapsed (≈4 linhas).

## Verificação após implementar

1. Start → trabalhar 30s → pause 60s → resume → conferir que cronômetro continua de ~30s (não zera).
2. Repetir com pausa de 5min → resume → continuar contando corretamente.
3. Parar e confirmar que `duration` salvo bate com o que estava no visor.
4. Console: verificar ausência do warn `[timer] pausedElapsed > grossSinceStart`.

## Fora de escopo

- Dashboard, PDF, i18n, filtros — nada disso é tocado.
- Servidor / migrations — nenhuma.
