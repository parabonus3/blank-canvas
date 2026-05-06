# Correção do Modo Tela Cheia do Cronômetro

## Problemas identificados

Olhando os prints enviados e o código de `src/components/FullscreenTimer.tsx`:

1. **Não preenche a tela toda (desktop e mobile)**
   - O componente usa `fixed inset-0` mas no desktop a sidebar/topbar do app continuam aparecendo por trás (visível no print 2). O motivo é que o `MainLayout` cria um stacking context que limita o `fixed`, ou o `z-[100]` não está acima de algum elemento com z-index maior.
   - No mobile o navegador deixa barras de URL/sistema visíveis porque usamos `inset-0` (100vh) em vez das novas unidades dinâmicas (`100dvh` / `100svh`).
   - Falta também tratar `safe-area-inset` (notch / home indicator do iOS).

2. **Botões pequenos e desproporcionais no mobile**
   - Os botões pause/stop/skip ficam minúsculos no centro de uma tela enorme (print 1). O timer ocupa muito espaço vertical e os controles ficam apertados.
   - O badge de streak e o botão X ficam grudados nos cantos sem respiro.
   - Faltam estados visuais (hover/active) e tamanhos realmente generosos para "touch targets".

## O que vou fazer

### 1. Garantir que ocupe 100% da viewport real

- Renderizar o `FullscreenTimer` via **React Portal** em `document.body`, escapando de qualquer stacking context da `MainLayout`/sidebar.
- Usar `position: fixed; inset: 0; height: 100dvh; width: 100vw;` com fallback para `100vh`.
- Aumentar `z-index` para `z-[9999]` (acima de toasts/sheets/dialogs do shell).
- Adicionar `padding` com `env(safe-area-inset-*)` para iOS (notch e home bar).
- Bloquear scroll do body enquanto aberto (`overflow: hidden` no `<html>` / `<body>`).

### 2. Layout responsivo inteligente (flex column dividido)

Estrutura com 3 zonas verticais que se adaptam:

```text
┌─────────────────────────────┐
│  [streak]            [X]    │  ← topbar (safe-area aware)
├─────────────────────────────┤
│                             │
│        00:56                │  ← centro flex-1, timer fluido com clamp()
│      • Em andamento         │
│                             │
├─────────────────────────────┤
│   ⏸    ⏹    ⏭              │  ← controles (sticky bottom em mobile)
│      🎵 ambient             │
└─────────────────────────────┘
```

- Tamanho do timer com `clamp(4rem, 22vw, 18rem)` em retrato e `clamp(4rem, 18vh, 14rem)` em landscape — escala suavemente em qualquer tela sem números gigantes/quebrados.
- Container central com `flex-1 flex items-center justify-center` para ficar verdadeiramente centralizado em qualquer altura.

### 3. Botões bonitos e maiores

- Pause/Skip: `h-16 w-16` mobile → `h-20 w-20` desktop, ícone `h-7 w-7`/`h-8 w-8`.
- Stop (ação principal): destaque visual maior — `h-20 w-20` mobile → `h-24 w-24` desktop, com gradiente sutil `from-destructive to-destructive/80`, sombra `shadow-lg shadow-destructive/30`, e animação leve no hover (`scale-105`).
- `gap-6 sm:gap-8` entre eles.
- Adicionar `active:scale-95 transition-transform` para feedback tátil.
- Tooltips em desktop (Pausar / Parar / Próximo).
- Botão X e badge de streak ganham `bg-card/40 backdrop-blur` e padding maior.

### 4. Detalhes finos

- Usar `useIsMobile()` para ajustar densidade.
- Ambient mini-player no `bottom` respeitando `safe-area-inset-bottom`.
- Animação de entrada (fade + scale) via `framer-motion` (já está no projeto).

## Arquivos afetados

- `src/components/FullscreenTimer.tsx` — refatoração completa do layout (sem mudar lógica de pause/stop/skip nem nenhuma regra de negócio).
- `src/index.css` — adicionar utility opcional `.h-dvh` se ainda não existir (Tailwind v3 não tem por padrão).

Nada de banco de dados, nada de hooks novos, nada que afete timer/pomodoro/streak. Só camada de apresentação.
