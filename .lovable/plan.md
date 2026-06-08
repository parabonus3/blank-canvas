# Plano: responsividade do "Criar Sala" + atalho de entrada no Explorar

## 1. Dialog "Criar Sala" totalmente responsivo (mobile)

**Problema:** em telas pequenas (~360–400 px de altura útil) o `DialogContent` de `CreateRoomDialog` ultrapassa a viewport. Como não há área de scroll interna nem altura máxima, o usuário não enxerga o campo "Nome da sala" no topo nem o botão "Criar" no rodapé — fica preso no meio do formulário.

**Solução:** reestruturar o `DialogContent` em três zonas (header fixo / corpo rolável / footer fixo) com altura máxima atrelada ao viewport.

Mudanças em `src/components/rooms/CreateRoomDialog.tsx`:

- `DialogContent` recebe classes:
  - `max-h-[92dvh] sm:max-h-[85vh]` (usa `dvh` para respeitar barras dinâmicas do mobile)
  - `flex flex-col gap-0 p-0`
  - `w-[calc(100%-1rem)] sm:max-w-md` (margem lateral em mobile)
- `DialogHeader` envolto em `<div class="px-6 pt-6 pb-2 shrink-0">`.
- Corpo do formulário (atual `<div class="space-y-4">` e o bloco de `limit_reached`) envolvido em um wrapper rolável:
  - `<div class="flex-1 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain">`
- `DialogFooter` envolto em `<div class="px-6 py-4 border-t bg-background shrink-0">` para grudar no fundo e nunca sumir; em mobile usar `flex-col-reverse gap-2` para o botão "Criar" ficar acima de "Cancelar" e em destaque.
- O `ScrollArea` da lista de amigos passa a `max-h-32` já existente, mas com `min-h-0` no pai para não quebrar o flex.
- Pequenos ajustes de densidade em mobile: `space-y-3` ao invés de `space-y-4` em telas `<sm`.

Resultado esperado: em qualquer aparelho (inclusive iPhone SE / Android pequenos com teclado aberto), o título e o botão "Criar" permanecem visíveis, e o restante do formulário rola dentro do dialog.

> Observação: a mesma estrutura (header fixo + corpo scroll + footer fixo) pode ser reaproveitada depois em outros dialogs grandes, mas neste plano só corrigimos o de Criar Sala, conforme pedido.

## 2. Entrada direta no Explorar quando já sou membro

**Problema:** na página `/explore`, ao clicar em "Entrar" numa sala da qual o usuário já é membro, o fluxo chama `room_has_password` + `join_public_room` novamente, e em salas privadas o botão fica "Privada" mesmo se a pessoa já participar. O usuário precisa ir até `/rooms` para acessar.

**Solução:** usar a lista de salas do próprio usuário (`useRooms()`) como fonte de verdade para identificar se ele já é membro e, nesse caso, navegar direto para `/rooms/:id`.

Mudanças em `src/pages/Explore.tsx`:

- Importar `useRooms` de `@/hooks/useRooms` e montar `const myRoomIds = useMemo(() => new Set((myRooms ?? []).map(r => r.id)), [myRooms])`.
- Em `handleJoin(room)`:
  - Se `myRoomIds.has(room.room_id)` → `navigate(`/rooms/${room.room_id}`)` e retornar (sem checar senha, sem RPC de join).
- Renderização do botão na linha da sala:
  - Calcular `const isMember = myRoomIds.has(room.room_id)`.
  - Se `isMember` → renderizar botão "Entrar na sala" (texto `t("rooms.open") || t("rooms.enter")`) que chama `navigate(`/rooms/${room.room_id}`)`. Isso vale **inclusive para salas privadas** (substitui o botão desabilitado "Privada" quando o usuário já é membro). Pode receber um leve destaque visual (`variant="secondary"`) para diferenciar de "Entrar".
  - Se não for membro → comportamento atual (botão "Entrar" para públicas, "Privada" desabilitado para privadas).
- Tornar o card inteiro clicável também: adicionar `onClick` no wrapper externo do item que, quando `isMember`, navega para a sala (mantendo `stopPropagation` no botão para não duplicar).

Chaves de tradução novas (em todos os locales `src/i18n/locales/*.json`, dentro de `rooms`):
- `enter_room`: "Entrar na sala" / "Open room" / equivalentes nas 12 línguas.

## 3. Validação

- Abrir `/rooms` no preview em viewport mobile (375×667 e 360×640) → clicar "Criar sala" → confirmar que título + botão Criar estão visíveis sem rolar a página e que o formulário rola por dentro.
- Em `/explore`, com uma conta que já é membro de uma sala listada (pública e privada), confirmar que o botão muda para "Entrar na sala" e leva direto a `/rooms/:id` sem passar pelo fluxo de join.
- Verificar que para salas das quais não sou membro o comportamento atual continua igual (join público pede senha quando aplicável, privadas seguem com botão "Privada" desabilitado).

## Arquivos afetados

- `src/components/rooms/CreateRoomDialog.tsx` (estrutura responsiva)
- `src/pages/Explore.tsx` (detecção de membro + navegação direta)
- `src/i18n/locales/*.json` (12 arquivos, nova chave `rooms.enter_room`)
