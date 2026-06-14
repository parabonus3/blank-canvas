# Pause + Fullscreen no Timer da Sala + Bloco de Notas mais Dinâmico

Duas frentes pequenas e independentes.

## Parte 1 — Paridade do Timer da Sala com o Timer Normal

Hoje o `RoomTimerCard` só tem Iniciar / Parar. O timer normal (Dashboard) tem **Pause/Resume** (via `TimerContext`) e **Tela cheia** (via `FullscreenTimer`). Vamos trazer ambos para a sala.

**Mudanças em `src/components/rooms/RoomTimerCard.tsx`:**

- Importar `useTimerContext` (já existe e gerencia `isPaused`, `pause()`, `resume()`, `pausedElapsed`).
- Quando `isActiveInThisRoom`, exibir 3 botões em vez de só "Parar":
  - **Pause/Resume** (toggle com ícones `Pause` / `Play`)
  - **Tela cheia** (ícone `Maximize2`)
  - **Parar** (já existe, vermelho)
- Cálculo do `elapsed` passa a respeitar `isPaused` (congela quando pausado) e `pausedElapsed` (subtrai o tempo já pausado nesta sessão local). Mesma fórmula usada no SidebarMiniTimer/Dashboard.
- Visual quando pausado: dígitos viram cor `text-warning` e chip "Contando para esta sala" troca por "Pausado" amarelo. Quando retoma, volta ao normal.
- Botão de tela cheia abre `<FullscreenTimer mode="normal" elapsed={elapsed} onPause={pause} onResume={resume} onStop={handleStop} onClose={() => setFs(false)} streak={null} />` em estado local `fs`.
- O `FullscreenTimer` já tem toda a lógica de pause/resume/stop/som ambiente — só consumimos.

**Sem mudanças** em RPCs, schema, hooks de tempo ou cálculo persistido. `paused_seconds` no servidor continua sendo gerenciado por quem já gerencia (não mexer).

## Parte 2 — Bloco de Notas mais Dinâmico (emojis + ações no editor)

Foco em melhorar o **editor de notas** (dialog Create/Edit) sem mexer em schema ou na listagem.

**Mudanças em `src/pages/Notes.tsx`:**

a) **Picker de Emojis completo no editor**
- Adicionar um popover de emojis ao lado dos botões de formatação (`Bold`, `Italic`, `Heading`, `List`).
- Em vez de hardcodar uma lista pequena, usar a lib leve `emoji-picker-react` (já compatível com React 18, ~80kB lazy) com categorias completas, busca e seleção de skin tone.
- Insere o emoji escolhido na posição atual do cursor do `Textarea` (usar `selectionStart`/`selectionEnd` do textareaRef, não só `c => c + emoji`).
- Backup: lista curta de "emojis rápidos" (10 mais usados em notas: ✅ ⭐ 🔥 💡 📌 ⚠️ ❤️ 🎯 📚 🧠) acima do picker para inserção em 1 clique.

b) **Barra de formatação ampliada e funcional**
- Botões atuais (`Bold`, `Italic`, `Heading`, `List`) sempre concatenam no fim. Trocar por inserção no cursor, envolvendo seleção:
  - `Bold` envolve seleção em `**...**` (ou insere `**texto**` se nada selecionado).
  - `Italic` → `*...*`
  - `Heading` → adiciona `## ` no início da linha atual.
  - `List` → `\n- ` na linha atual.
- Adicionar botões novos:
  - **Checkbox** (`Square` icon) → `\n- [ ] `
  - **Citação** (`Quote` icon) → `\n> `
  - **Código** (`Code` icon) → `` `texto` ``
  - **Link** (`Link` icon) → `[texto](https://)`
  - **Divisor** (`Minus` icon) → `\n\n---\n\n`

c) **Contadores e atalhos úteis**
- Mostrar contagem de palavras + caracteres no rodapé do textarea (`123 palavras · 678 caracteres · ~2 min de leitura`).
- Suportar atalhos no textarea: `Ctrl/Cmd+B` (bold), `Ctrl/Cmd+I` (italic), `Ctrl/Cmd+K` (link).

d) **Textarea com mais "respiro"**
- Aumentar `min-h-[160px]` para `min-h-[240px]` e habilitar auto-grow simples (até `max-h-[60vh]` com scroll interno).

**Sem mudanças** em hooks de notas, schema, RLS, pastas, senhas, import/export — apenas o editor.

## Arquivos editados

- `src/components/rooms/RoomTimerCard.tsx` — pause/resume + fullscreen.
- `src/pages/Notes.tsx` — editor melhorado (emoji picker, barra rica, contadores, atalhos).
- `package.json` — adicionar `emoji-picker-react` (`bun add`).
- (opcional) `src/i18n/locales/pt-BR.json` + outros 11 — chaves novas usam `defaultValue` inline; não obrigatório editar.

## Verificação

- Mobile e desktop: iniciar timer na sala, pausar → dígitos amarelos, chip "Pausado"; retomar → contagem continua sem reset; tela cheia abre e os botões funcionam; parar fecha.
- Notas: abrir editor, selecionar trecho, clicar Bold → envolve com `**`; abrir picker de emojis, inserir no cursor; atalho Cmd+B funciona; contador atualiza.
