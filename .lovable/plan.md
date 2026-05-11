## Problema

A streak do Nicky aparece como **0**, mas deveria ser **8** dias.

Dados reais (hoje = 2026-05-11):
- Estudou: 04, 05, 06, 07/mai
- Freezes consumidos: 03, 08, 09, 10/mai
- Hoje (11/mai): ainda não estudou

A streak esperada cobre 03→10/mai (8 dias contínuos entre estudo + freeze). Hoje está "em andamento" — não deveria zerar nada.

## Causa raiz

A função `get_member_room_streak` tem dois bugs combinados:

1. **Hoje sem atividade não é tratado como "em andamento"**: o loop começa em `CURRENT_DATE` e, se hoje não tem atividade nem freeze, o `_streak` fica em 0 e o loop avança para ontem com `_streak = 0`.

2. **Freeze não consegue iniciar a streak**: o ramo `ELSIF _has_freeze` só incrementa se `_streak > 0`. Se `_streak = 0` e a data é anterior a hoje, faz `EXIT` — descartando o freeze que o `auto_consume_pending_freezes` já tinha aplicado.

Resultado: a função consome corretamente os freezes pendentes, mas depois ignora todos eles ao calcular o número da streak.

A lógica também era incompatível com a UI: o modal pinta o dia de azul (freeze usado), mas o contador grande mostra 0.

## Solução

Reescrever `get_member_room_streak` com regra simples e consistente com o que o usuário vê na timeline:

```text
Se HOJE tem atividade  → conta hoje, anda para trás
Se HOJE não tem nada   → hoje está "em andamento", começa a contar a partir de ONTEM

A partir desse ponto, andando para trás:
  dia tem atividade OU freeze consumido  →  +1 na streak
  dia não tem nem um nem outro            →  EXIT
```

Isso garante:
- Freezes (mensais e comprados) preservam a streak igual a estudar.
- Não estudar hoje não zera a streak (continua "em andamento" como o Duolingo).
- O número exibido bate exatamente com a contagem de bolinhas verdes + azuis contínuas na timeline.

## Mudanças

### 1. Migração SQL

Substituir o corpo de `public.get_member_room_streak(_user_id uuid)`:

- Continua chamando `auto_consume_pending_freezes(_user_id)` no início (já está correto).
- Verifica atividade de hoje. Se não houver, recua `_check_date` para ontem antes do loop.
- Loop único: para cada `_check_date`, se houver atividade OU se a data estiver em algum `streak_freezes.auto_used_dates` daquele usuário, soma 1 e recua um dia; senão, sai.
- Mantém cap de 365 e `SECURITY DEFINER` + `search_path = public`.

### 2. Sem mudanças de código frontend

A UI (`SidebarStreakWidget`, `StreakDetailModal`) e o hook `useStreakFreeze` já estão corretos — eles só consomem o valor retornado pela RPC. Assim que a função for corrigida, o widget volta a aparecer (hoje some quando streak = 0) e o modal mostra o número certo.

### 3. Validação pós-migração

- Rodar `SELECT get_member_room_streak('ef2c00f0-b986-47e3-887f-80b2c3527723')` → deve retornar **8**.
- Conferir um usuário que estudou hoje (deve incluir hoje no total).
- Conferir um usuário sem atividade há > 60 dias (deve retornar 0, sem erro).

Posso aplicar a migração?