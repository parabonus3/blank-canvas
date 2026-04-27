## Objetivo

Tocar 4 sons MP3 enviados em eventos específicos da app, sempre respeitando o toggle global de som do usuário (já existente em `profile.reminder_sound`, controlado via `setSoundEnabled` em `src/hooks/useSoundEffects.ts`). Nenhum som toca se o usuário desativou notificações.

## Mapeamento som → evento

| Som | Arquivo | Quando toca |
|-----|---------|-------------|
| `live-chat.mp3` | `/sounds/live-chat.mp3` | Cada vez que um membro fica "online na live" da sala (entra na sessão de foco compartilhada — `focus_session_joined` muda de `false`→`true`). Se 5 pessoas entram, tocará 5 vezes (com pequeno debounce/throttle anti-spam de 150 ms entre disparos para não sobrepor). |
| `page.mp3` | `/sounds/page.mp3` | Iniciar cronômetro normal (Index.tsx `handleStart`) **e** iniciar pomodoro (`PomodoroContext.start` + `RoomFocusSession.startSession` quando começa imediatamente / quando `autoStartSession` dispara o início real após o countdown). Substitui as chamadas atuais de `playFocusStart()` nesses pontos. |
| `pause.mp3` | `/sounds/pause.mp3` | Pausar em qualquer lugar: cronômetro normal (`handlePause` em Index.tsx), pomodoro (`PomodoroContext.pause`), e mini-timer da sidebar (já dispara via mesmas funções). Substitui `playTimerPause()`. |
| `stop.mp3` | `/sounds/stop.mp3` | Concluir/parar tempo em qualquer lugar: cronômetro normal (`handleStopConfirm`), pomodoro (`PomodoroContext.stop` + fim de fase de trabalho), `SidebarMiniTimer.handleStop`, e fim de sessão de foco compartilhada da sala (`RoomFocusSession` quando `remaining===0`). Substitui `playFocusEnd()` / `playSuccess()` nesses pontos específicos. |

## Implementação técnica

**1. Copiar arquivos para `public/sounds/`**
- `live-chat.mp3`, `page.mp3`, `pause.mp3`, `stop.mp3`.

**2. Criar player leve em `src/lib/uiSounds.ts`**
- Pool de elementos `HTMLAudioElement` pré-carregados (1 instância por som, clonada via `audio.cloneNode()` para permitir disparos sobrepostos sem travar — ex.: vários joins seguidos).
- Respeita o flag global `soundEnabled` (mesmo já usado em `soundEffects.ts`, exportar/compartilhar via `getSoundEnabled()`).
- Volume vinculado ao `globalVolume` já existente.
- Throttle por som (150 ms) para evitar empilhar disparos no mesmo tick.
- Funções exportadas: `playLiveChat()`, `playPageStart()`, `playPauseSound()`, `playStopSound()`.

**3. Refatorar `src/lib/soundEffects.ts`**
- Expor um getter `getSoundEnabled()` e `getGlobalVolume()` para `uiSounds.ts` reutilizar (sem duplicar estado).

**4. Substituições nos arquivos**

- `src/pages/Index.tsx`
  - `handleStart` → trocar `playFocusStart()` por `playPageStart()`.
  - `handlePause` → trocar `playTimerPause()` por `playPauseSound()`.
  - `handleResume` → manter como está (não foi pedido um som específico para retomar; manter `playTimerResume` atual evita regressão silenciosa). 
  - `handleStopConfirm` → trocar `playFocusEnd()` por `playStopSound()`.

- `src/contexts/PomodoroContext.tsx`
  - `start()` → adicionar `playPageStart()`.
  - `pause()` → adicionar `playPauseSound()`.
  - `resume()` → manter silencioso (sem som específico solicitado).
  - `stop()` → adicionar `playStopSound()` (substituindo notificação atual de fim).
  - Fim de fase de trabalho (transição automática) → `playStopSound()` no lugar de `playFocusEnd` quando a fase de trabalho conclui.

- `src/components/SidebarMiniTimer.tsx`
  - `handleStop` (cronômetro normal) → `playStopSound()`.
  - Botão de stop do mini-pomodoro → `playStopSound()`.

- `src/components/rooms/RoomFocusSession.tsx`
  - `startSession` (início imediato) → trocar `playFocusStart()` por `playPageStart()`.
  - `autoStartSession` (quando countdown chega a zero) → adicionar `playPageStart()`.
  - Fim da sessão (effect com `remaining===0`) → trocar `playSuccess()` por `playStopSound()`.

- `src/pages/RoomDetail.tsx` (detecção de "online na live")
  - Adicionar canal Realtime extra escutando `UPDATE` em `room_members` filtrado por `room_id=eq.${id}`. Quando o payload mostrar transição `focus_session_joined: false → true` para qualquer usuário (inclusive quando `id !== user.id` — ou seja, alguém **diferente de mim** entra na live), disparar `playLiveChat()`.
  - Respeita `notificationsOn` (toggle de notificações do membro atual na sala, igual ao já feito em `playMemberJoined`).
  - Throttle interno do `playLiveChat` permite múltiplos disparos consecutivos sem clipping.

**5. Configurações do usuário**
- Nada a adicionar na UI: o toggle "som de notificação" já existe em Settings (`reminder_sound`) e é o mesmo flag usado por `setSoundEnabled` via `useSoundEffects`. Quando desligado, **todos** os 4 sons novos ficam mudos automaticamente.

## Diagrama de fluxo

```text
profile.reminder_sound ──► setSoundEnabled() ──► soundEnabled (global)
                                                     │
                          ┌──────────────────────────┼───────────────┐
                          ▼                          ▼               ▼
                    soundEffects.ts            uiSounds.ts      (todos os sons
                    (Web Audio gerados)        (MP3 do user)     respeitam o flag)
```

## Arquivos alterados

- `public/sounds/live-chat.mp3` (novo)
- `public/sounds/page.mp3` (novo)
- `public/sounds/pause.mp3` (novo)
- `public/sounds/stop.mp3` (novo)
- `src/lib/uiSounds.ts` (novo)
- `src/lib/soundEffects.ts` (expor getters)
- `src/pages/Index.tsx`
- `src/contexts/PomodoroContext.tsx`
- `src/components/SidebarMiniTimer.tsx`
- `src/components/rooms/RoomFocusSession.tsx`
- `src/pages/RoomDetail.tsx`

## Garantias de fluidez

- Áudios pré-carregados no import do módulo (`new Audio(url); audio.preload = 'auto'`) → zero atraso na 1ª reprodução.
- `cloneNode` para sobreposições (vários joins simultâneos não cortam o som anterior).
- Throttle de 150 ms por tipo de som evita CPU/áudio empilhados.
- Nenhuma alteração no banco, nenhuma migração, nenhum risco de quebra de fluxo existente.
