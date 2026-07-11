## Problema

Ao abrir uma sala, o erro `(s || []).map is not a function` derruba a tela toda.

## Causa raiz

Duas queries diferentes estão usando **exatamente a mesma queryKey**, o que faz o TanStack Query compartilhar o mesmo cache entre elas — mas cada uma armazena **um formato de dado diferente**:

- `src/components/rooms/RoomRankingSidebar.tsx` (linha 71): `queryKey: ["roomRanking", roomId, period]` → guarda um **array** `[{ user_id, display_name, total_seconds, ... }]`.
- `src/components/rooms/RoomChallengesCard.tsx` (linha 41, adicionada na iteração anterior): `queryKey: ["roomRanking", roomId, "all"]` → guarda um **`Map<string, number>`**.

Quando o período selecionado no sidebar é `"all"` (default), as duas queries colidem. A que roda primeiro escreve seu formato no cache; a outra lê e explode:

- Se o `RoomChallengesCard` escrever primeiro (Map), o sidebar faz `(periodData || []).map(...)` → `.map is not a function` (Map é truthy, então o `|| []` não protege).
- Se o sidebar escrever primeiro, o `memberExtras` do card recebe um array em vez de Map e o `.get()` falha.

## Correção

Mudar a queryKey do `RoomChallengesCard` para um namespace próprio e retornar um formato explícito, sem competir com o sidebar.

### Passo único

Em `src/components/rooms/RoomChallengesCard.tsx`, trocar a query:

```ts
// antes
queryKey: ["roomRanking", roomId, "all"],

// depois
queryKey: ["roomAllTimeTotalsMap", roomId],
```

Nenhuma outra mudança é necessária — o `queryFn` já converte para `Map<string, number>` e o consumidor (`memberExtras`) já espera Map.

## Detalhes técnicos

- TanStack Query trata queryKeys como identidade estrutural. Duas queries com a mesma key são consideradas a mesma; a segunda a montar reutiliza o `data` da primeira sem rodar o `queryFn` (até o `staleTime` expirar).
- Fallbacks do tipo `x || []` só protegem contra `null`/`undefined`, não contra tipos errados como `Map` ou `{}`. Não vou trocar por `Array.isArray(x) ? x : []` porque isso só mascara o bug — a raiz é o conflito de key.
- Não altero nada no sidebar; ele continua sendo a "fonte" natural da key `roomRanking`.

## Verificação

- Abrir uma sala e conferir que o erro sumiu e o card de desafios + ranking renderizam normalmente.
- Trocar o período do ranking (all → today → week) e conferir que os títulos de nível dos membros no card de desafios continuam corretos (não devem depender do período selecionado no sidebar).
