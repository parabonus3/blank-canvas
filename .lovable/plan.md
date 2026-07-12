## Objetivo

Eliminar o scroll horizontal do `RoomChallengePicker` no mobile e tornar visualmente óbvio o estado de cada desafio via cores semânticas.

## Arquivo alterado

`src/components/timer/RoomChallengePicker.tsx` (somente frontend/presentation).

## Mudanças

### 1. Layout empilhado (sem scroll horizontal)

Trocar o container atual:
```
flex overflow-x-auto snap-x snap-mandatory ...  sm:grid sm:grid-cols-2 xl:grid-cols-3
```
por um grid compacto que empilha bem em mobile:
```
grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3
```

- Card único (`isSingle`): continua `grid-cols-1`.
- 2 desafios: um abaixo do outro no mobile, lado a lado em `sm+`.
- Remover classes `min-w-[220px]`, `w-[80%]`, `snap-*`, `shrink-0`, `overflow-x-auto`.
- Reduzir padding dos cards (`p-2` em vez de `p-2.5`) e tamanho da fonte do título para caber compacto em mobile.

### 2. Estados de cor (borda + fundo)

Definir 3 estados derivados dos dados existentes (`me?.completed_current`, `me?.seconds_current`):

| Estado | Condição | Cor da borda | Fundo | Barra de progresso |
|---|---|---|---|---|
| `done` | `completed_current === true` | verde (`border-green-500/70`) | `bg-green-500/10` | verde |
| `in_progress` | `seconds_current > 0` e não `done` | laranja (`border-orange-500/70`) | `bg-orange-500/5` | laranja |
| `not_started` | `seconds_current === 0` | vermelho suave (`border-red-500/50`) | `bg-red-500/5` | vermelho/40 |

Selecionado ganha ring extra (`ring-2 ring-primary/50 shadow-sm`) sobreposto ao estado de cor — a cor de borda semântica é mantida para que o usuário reconheça o estado mesmo quando selecionado.

Ajustar também a cor do check "Selecionado" (fica azul do primary) e do ícone `CheckCircle2` do done (verde).

### 3. Legenda mínima

Adicionar micro-legenda opcional (dot vermelho / laranja / verde) ao lado do header quando houver `mine.length > 1`, para reforçar a leitura das cores. Texto curto:
- 🔴 a fazer · 🟠 em andamento · 🟢 feito

Usando dots CSS (`h-1.5 w-1.5 rounded-full`), não emoji.

### 4. i18n

Adicionar chaves em `pt-BR.json` e `en-US.json`:
- `rooms.challenges.legend_todo` = "a fazer" / "to do"
- `rooms.challenges.legend_progress` = "em andamento" / "in progress"
- `rooms.challenges.legend_done` = "feito" / "done"

## Não muda

- Lógica de seleção, persistência em `localStorage`, auto-seleção do 1º.
- Hooks, RPCs, queries.
- Nenhuma alteração em `RoomChallengesMatrix`, `RoomChallengesCard` ou backend.

## Verificação

- Preview em 390px: 2 desafios empilhados verticalmente, sem scroll horizontal.
- Card sem progresso → contorno vermelho; com progresso parcial → laranja; concluído → verde.
- Selecionar um card mantém a cor de estado + ring do primary.
