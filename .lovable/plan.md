# Plano: organizar layout sem scroll horizontal

## 1. Modal "Criar desafio" — categorias (`ChallengeTemplatePicker.tsx`)

Trocar a faixa de categorias rolável por um **grid responsivo que quebra para a próxima linha**:

- Remover `overflow-x-auto` + `snap-x` + `flex` da barra de categorias.
- Usar `flex flex-wrap gap-1.5` (chips pequenos que envolvem naturalmente).
  - Mobile: 2–3 chips por linha.
  - Desktop (sm+): todos cabem em 1–2 linhas.
- Manter o pill design atual (ícone + label), apenas tirando `shrink-0`/`snap-start`.
- Sem mudança de cores/tokens — só layout.

Resultado: nada de barra cinza de scroll horizontal embaixo das categorias.

## 2. Timer — strip de metas ativas (`ActiveGoalsStrip.tsx`)

Hoje renderiza `overflow-x-auto` causando scroll lateral no mobile (visível na imagem com "Leitura Pq tarda…" + "Check-up anual").

Mudanças:

- Substituir o container `flex … overflow-x-auto` por **`flex flex-wrap gap-2`** na variante `default` (página Timer).
- Reduzir o número de chips visíveis no mobile e usar o popover `+N` para o resto:
  - Mobile (`< sm`): mostrar **1 chip** + botão `+N`.
  - Desktop (`sm+`): mostrar até **3 chips** + `+N` (comportamento atual).
  - Implementar via `useIsMobile()` já existente em `src/hooks/use-mobile.tsx`.
- Aumentar `max-w` do título do chip no desktop, manter compacto no mobile (`max-w-[100px]`).
- Variante `fullscreen` permanece com scroll horizontal (faz sentido no overlay), apenas reduzir paddings se necessário — sem alterações funcionais.

## 3. Verificação

- Conferir visualmente em 390px (mobile atual do preview) e 1280px:
  - Modal de criar desafio: chips de categoria em múltiplas linhas, sem barra horizontal.
  - Página `/timer`: chips de metas envolvem, sem scroll lateral; o `+N` abre popover com os restantes.

## Arquivos a editar

- `src/components/rooms/ChallengeTemplatePicker.tsx` — categorias em wrap.
- `src/components/timer/ActiveGoalsStrip.tsx` — wrap + limite menor no mobile.

Sem mudanças de i18n, dados, hooks ou estilos globais.
