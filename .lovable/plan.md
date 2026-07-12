## Objetivo

Refinar o `RoomChallengePicker` para:
1. Mostrar **2 desafios por linha já no mobile** (grid compacto, sem scroll horizontal).
2. Dar **muito mais destaque** ao card selecionado.
3. Layout profissional e escalável (funciona bem de ~320px até desktop wide).

## Arquivo alterado

`src/components/timer/RoomChallengePicker.tsx` — apenas frontend/presentation. Nenhum hook, RPC, i18n key nova ou backend muda.

## Mudanças

### 1. Grid 2 colunas desde o mobile

Trocar:
```
grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3
```
por:
```
grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-3 xl:grid-cols-4
```

- Caso `isSingle` (1 desafio): usar `grid-cols-1` para ocupar largura toda.
- Cards passam a ser **compactos verticais** (não mais layout horizontal emoji+título+badge numa linha só, que quebra em 2 col mobile).

### 2. Card compacto vertical (novo layout interno)

Estrutura por card (em vez do row atual com emoji+título+badge lado a lado):

```
┌─────────────────────────┐
│ [emoji]        [✓ done] │  ← linha 1: emoji grande + ícone estado
│ Título em 2 linhas      │  ← linha 2: title (line-clamp-2, text-xs)
│ 6/10m · faltam 4min     │  ← linha 3: progresso textual (text-[10px])
│ ▓▓▓▓░░░░░░              │  ← barra fina
│ [ SELECIONADO ]         │  ← linha 5: só aparece se selecionado
└─────────────────────────┘
```

- Padding `p-2`, `min-h-[112px]` para consistência entre cards.
- Título: `text-xs font-semibold leading-tight line-clamp-2` (sem truncate — 2 linhas).
- Remover `truncate` do título (causa cortes feios em col estreita).

### 3. Destaque MUITO mais forte do selecionado

Hoje o selecionado só ganha `ring-2 ring-primary/50 shadow-sm` — quase imperceptível ao lado das bordas coloridas de estado.

Novo tratamento em camadas:

**Não selecionado:**
- Borda de estado (verde/laranja/vermelho) com opacidade reduzida: `border`, não `border-2`.
- Fundo bem sutil, `opacity-70`.
- `hover:opacity-100 hover:border-{state}`.

**Selecionado:**
- `border-2` na cor do estado em opacidade cheia (`border-green-500`, `border-orange-500`, `border-red-500`).
- `ring-2 ring-primary ring-offset-2 ring-offset-background`.
- `shadow-lg shadow-primary/20`.
- `scale-[1.02]` com `transition-transform`.
- `opacity-100` fixo.
- Badge "SELECIONADO" reformulada: barra inferior full-width com `bg-primary text-primary-foreground text-[9px] font-bold tracking-wider uppercase py-1 rounded-b-md -mx-2 -mb-2 mt-1.5 flex items-center justify-center gap-1` (bem visível, ancorada no rodapé do card, com ícone `Check`).

**Resultado visual:** o selecionado "salta" do grid — ring azul + escala + shadow + barra inferior azul sólida. Impossível confundir.

### 4. Header e legenda ajustados

- Header continua com `Target` + hint + badge "Obrigatório".
- Legenda (`mine.length > 1`) mantida, mas em `text-[10px]` e com `flex-wrap`.
- Em telas ≥`sm`, header e legenda ficam na mesma linha (`sm:flex sm:items-center sm:justify-between`) para economizar vertical no desktop.

### 5. Responsividade validada

| Largura | Colunas | Observação |
|---|---|---|
| 320-374px | 2 | cards ~140px, título em 2 linhas cabe |
| 375-639px | 2 | folgado |
| 640-1023px | 2 | mais respiro |
| 1024-1279px | 3 | |
| ≥1280px | 4 | |

Padding externo do container pai (`RoomChallengeBanner`/timer card) não muda — o grid se adapta à largura recebida.

## Não muda

- Lógica de seleção, `localStorage`, auto-seleção do 1º desafio.
- Estados semânticos (`done` / `in_progress` / `not_started`) e suas cores base.
- Cores do progress bar por estado.
- Hooks, RPCs, queries, i18n keys existentes.
- Nenhum outro componente (`RoomChallengesMatrix`, `RoomChallengesCard`, `RoomChallengeBanner`).

## Verificação

- Preview 320px, 390px, 768px, 1440px: 2 / 2 / 2 / 4 colunas respectivamente, sem overflow horizontal.
- Card selecionado claramente destacado: ring azul + scale + barra inferior "SELECIONADO".
- Cores de estado (verde/laranja/vermelho) permanecem legíveis em selecionado e não-selecionado.
- Título de 2 linhas não é truncado nem estoura o card.
