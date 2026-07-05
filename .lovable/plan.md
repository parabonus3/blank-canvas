## Diagnóstico (por que hoje não vai pro final)

Li `RoomChat.tsx` e `useRoomMessages.ts`. Três coisas explicam tudo:

1. **Auto-scroll está quebrado.** O `ref` está no `<ScrollArea>` do shadcn/Radix, mas o elemento realmente rolável é um `<div data-radix-scroll-area-viewport>` interno. `scrollRef.current.scrollTop = scrollHeight` não faz nada — o container externo tem overflow hidden. Por isso ao abrir o chat você não é levado às mensagens mais recentes.
2. **Enter envia hoje**, e você quer o oposto: Enter = quebra de linha, botão "Enviar" (ou atalho Ctrl/Cmd+Enter) = envia. Isso é fundamental pra virar bloco de notas coletivo.
3. **Input é `<Input>` single-line**, sem toolbar de formatação e sem renderização de markdown. Texto longo fica horrível.

Além disso o `content` no BD é `text` simples — dá pra guardar markdown nele sem migração alguma. E `react-markdown` **já está instalado** no projeto. Nenhuma dependência nova precisa entrar.

---

## Plano — mais inteligente do que só "adicionar negrito"

### 1. Composer novo — bloco de escrita, não input de bate-papo

**Componente `RoomChatComposer.tsx` novo**, isolado, com:

- **Textarea autosize** (min 1 linha, max 8) usando `<Textarea>` do shadcn com `field-sizing: content` + fallback JS pra Safari
- **Enter = nova linha** (comportamento padrão do textarea). Envio só via botão "Enviar" ou **Ctrl/Cmd+Enter** (padrão universal Slack/Discord/Linear)
- **Toolbar de formatação** acima do textarea, com botões que envolvem a seleção com markdown:
  - **B** (Ctrl+B) → `**texto**`
  - **I** (Ctrl+I) → `*texto*`
  - **S̶** → `~~texto~~`
  - `<>` código inline → `` `texto` ``
  - `""` citação → `> texto` (linha)
  - `•` lista → `- texto` (por linha selecionada)
  - `🔗` link → `[texto](url)` (abre mini popover pra colar url)
- **Contador discreto** (aparece só quando >800/1000 chars) — limite educacional, não bloqueia
- **Emoji picker** compacto em popover (substitui a fileira fixa de 6 emojis que ocupa espaço); mantém os 6 favoritos como "recentes" logo abaixo
- **@menções com autocomplete**: ao digitar `@`, popover flutuante com membros da sala (usa `memberProfiles` já disponível). Insere `@display_name` — o trigger `dispatch_chat_mentions` no BD já dispara push (confirmado)
- **Ctrl/Cmd+Z e Y** funcionam nativamente no textarea. Nada especial.
- **Enviar**: botão largo em mobile ("Enviar" com texto), ícone-only em desktop se preferir; sempre `variant="default"` bem visível; disabled quando `content.trim().length === 0`
- **Preview toggle** (ícone 👁️): alterna entre textarea e preview markdown renderizado, útil pra revisar antes de enviar textos longos

### 2. Renderização das mensagens — markdown seguro

Substituir o `{msg.content}` cru por `<MessageBody content={msg.content} />`:

- Usa `react-markdown` (já instalado) com whitelist: `strong`, `em`, `del`, `code`, `pre`, `blockquote`, `ul/ol/li`, `a`, `p`, `br`
- Sem `img`, sem `iframe`, sem HTML raw (`skipHtml`)
- Links: `target="_blank" rel="noopener noreferrer nofollow"` + ícone externo
- Code blocks com fundo `bg-muted/50` e wrap
- @menções destacadas visualmente (regex depois do render → span com `bg-primary/10 text-primary`)
- Mensagens só-emoji (até 3) ganham `text-4xl` (padrão iMessage/Telegram)

### 3. Auto-scroll que realmente funciona

Reescrever a lógica:

- Trocar `<ScrollArea>` por um `<div ref={viewportRef} className="overflow-y-auto">` — sem Radix. Radix ScrollArea é bom pra listas curtas mas complica scroll programático em chat.
- **Ao montar** e **quando `messages.length` passa de 0**: forçar `viewportRef.current.scrollTop = scrollHeight` (dupla RAF pra garantir layout aplicado). Isso resolve "ao abrir vejo as últimas".
- **Quando chega mensagem nova**: só auto-scroll se o usuário já está a ≤120px do fundo (variável `nearBottom`). Se estiver rolando pra cima lendo histórico, **não** roubar o scroll.
- **Se não estiver perto do fundo e chegar mensagem nova**: mostrar pill flutuante **"↓ Novas mensagens (N)"** no canto inferior. Clicar rola pro fim e zera o contador.
- **Ao enviar sua própria mensagem**: sempre rolar pro fim (você é a origem, quer ver).

### 4. Mobile-first (prioridade explícita)

- **Toolbar**: em telas `<640px` colapsa em popover único com todos os botões (ícone `Type`), pra não roubar altura vertical
- **Textarea**: `text-base` em mobile (16px+ evita zoom do iOS ao focar) — regra crítica
- **Composer sticky ao teclado**: usar `env(safe-area-inset-bottom)` + `inset-block-end: 0` no wrapper do composer, sem `position: fixed` (fica dentro do card da sala)
- **Botão Enviar em mobile**: full-width abaixo do textarea, altura `h-11` (44px, mínimo Apple HIG). Ctrl+Enter é bônus desktop
- **Emoji quick-bar** vira grid `grid-cols-6` compacto dentro do popover em mobile
- **Bolhas**: em mobile subir `max-w-[85%]` (era 75%), reduzir avatar pra `h-6 w-6` em bolhas consecutivas
- **Header do chat**: em mobile mostrar contagem de mensagens novas na aba (se o chat estiver em tabs) — depende de como `RoomDetail` monta isso; verificar

### 5. Extras "além do que você falou" (por que fazem sentido)

- **Editar mensagem própria** (últimos 15 min): ícone lápis no hover; envia com sufixo "(editado)". Requer coluna `edited_at` — **migração pequena** proposta.
- **Apagar mensagem própria**: ícone lixeira no hover; soft delete via `content = "[mensagem apagada]"` — sem migração adicional se aceitarmos isso, ou hard delete via RLS existente.
- **Preservar rascunho**: `localStorage[`draft-${roomId}`]` — se você fecha o chat/troca de aba sem enviar, ao voltar o texto tá lá. Útil pra textos longos.
- **"Enviando..." otimista**: mensagem aparece imediatamente com opacidade 60% até o realtime confirmar. React-Query optimistic update.
- **Sons já existem** (`playMessageSent`/`playMessageReceived`) — mantidos.
- **Copiar texto da mensagem**: menu de contexto (long-press mobile, right-click desktop) via Radix ContextMenu.
- **Timestamp completo em hover/long-press**: hoje mostra só HH:mm; adicionar `title` com data/hora completa.
- **Realtime que hoje refaz o fetch inteiro**: manter (invalidateQueries), mas adicionar dedup no cliente pra otimista não duplicar.

### 6. O que não vou mexer (pra não quebrar o que funciona)

- Permissões (`chatMode`, `myRole`, `isMuted`) — lógica atual está correta
- `useRoomMessages` — só adiciono optimistic update, não muda contrato
- Trigger `dispatch_chat_mentions` no BD — continua funcionando (regex `@nome` no `content`)
- `RoomDetail.tsx` — não toco
- Sons, sound effects, notification browser API — mantidos

---

## Perguntas antes de eu programar

1. **Migração pra editar/apagar mensagem**: quer que eu adicione `edited_at timestamptz` + `deleted_at timestamptz` em `room_messages` pra habilitar os extras (5), ou prefere deixar de fora nessa primeira leva?
2. **Menções com autocomplete**: hoje o trigger casa `@nome` exato com `lower(display_name)`. Se o nome tiver espaço tipo "João Silva", o `@` só pega até o espaço. Sugestão: no autocomplete, inserir o nome com underscore (`@joão_silva`) e atualizar o regex do trigger pra aceitar espaço opcional dentro de `@[...]`. Alternativa: armazenar mentions numa coluna `mentions uuid[]` populada pelo cliente (mais robusto). Prefere:
   - (a) Regex + underscore (zero mudança de schema, funciona hoje)
   - (b) Coluna `mentions uuid[]` + atualizar trigger (mais robusto, migração pequena)
3. **Toolbar visível fixa** ou **escondida atrás de um botão "Aa"** que expande? Sugestão minha: fixa em desktop, escondida atrás de "Aa" em mobile.

---

## Ordem de execução (quando aprovar)

1. (Se você aprovar a migração) `ALTER TABLE room_messages ADD COLUMN edited_at timestamptz, ADD COLUMN mentions uuid[]` + policy de UPDATE só para o próprio user + trigger updated de mentions
2. Criar `src/components/rooms/MessageBody.tsx` (render markdown seguro)
3. Criar `src/components/rooms/RoomChatComposer.tsx` (textarea + toolbar + menções + emoji + preview)
4. Reescrever `src/components/rooms/RoomChat.tsx`:
   - trocar `<ScrollArea>` por div rolável simples
   - lógica `nearBottom` + pill "novas mensagens"
   - usar `MessageBody` e `RoomChatComposer`
   - draft em localStorage
   - optimistic update
5. Atualizar `useRoomMessages`/`useSendMessage` com optimistic mutation
6. Testar em viewport mobile (375×667) e desktop, verificar: scroll ao abrir vai pro fim, Enter faz newline, Ctrl+Enter envia, negrito/itálico/menção renderizam, autocomplete de menção aparece

Nada quebra o restante da sala porque só toco em `RoomChat.tsx`, `useRoomMessages.ts`, e crio dois arquivos novos. O contrato do componente pra `RoomDetail.tsx` continua igual (mesmas props).

Confirma as 3 perguntas e eu implemento.
