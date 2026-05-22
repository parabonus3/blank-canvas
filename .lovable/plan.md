## Diagnóstico

Não é bug — é **leitura confusa do calendário**.

No `StreakDetailModal.tsx`, a timeline mostra os últimos 7 dias **do mais antigo (esquerda) ao mais recente (direita)**. Hoje é **sexta-feira (22/05/2026)**, então:

```text
sáb.   dom.   seg.   ter.   qua.   qui.   sex.
16/05  17/05  18/05  19/05  20/05  21/05  22/05  ← hoje
🛡️     ✅     ✅     ✅     ✅     ✅     ✅
```

O `sáb.` com escudo azul não é o sábado **de amanhã** — é **sábado, 16/05**, há 6 dias.

Confirmei no banco (`time_entries` do seu usuário):
- 15/05 (sex) — sessão registrada ✅
- **16/05 (sáb) — nenhuma sessão** → defensiva auto-aplicada (correto)
- 17/05 (dom) — sessão registrada ✅

Ou seja: a sexta que aparece no card (`sex.`) **é hoje** e está verde (estudou). A defensiva foi usada no sábado passado, quando de fato não houve atividade. A lógica está certa, mas o rótulo só com o nome do dia da semana cria a ilusão de que `sáb.` é o sábado mais próximo no futuro.

## Plano (apenas UI, sem mudar lógica)

Tornar a timeline auto-explicativa para nunca mais gerar essa confusão:

1. **Adicionar a data abreviada** abaixo do nome do dia em cada célula (`16/5`, `17/5`, …, `22/5`). Mantém os 7 dias na mesma largura, só vira `weekday` + `dd/mm` em duas linhas.
2. **Destacar "hoje"** explicitamente: rótulo `Hoje` em vez de `sex.` na última célula, com cor `primary` para deixar claro qual é o ponto de referência.
3. **Marcar "ontem"** com rótulo `Ontem` (mesma ideia, só na penúltima célula).
4. **Tooltip ao passar o mouse / tocar** em cada bolinha mostrando data completa + status (`Sábado, 16 de maio — Defensiva usada`). Reaproveita o `Tooltip` do shadcn já presente no projeto.
5. **Histórico (30 dias)**: quando expandido, separar em grupos por semana com cabeçalho `Semana de dd/mm` para evitar fila contínua difícil de ler.

### Arquivos a alterar
- `src/components/StreakDetailModal.tsx` — render das células + tooltip + agrupamento no histórico.
- `src/i18n/locales/*.json` (12 arquivos) — novas chaves `streak.today`, `streak.yesterday`, `streak.week_of`, `streak.tooltip_studied`, `streak.tooltip_freeze`, `streak.tooltip_missed`.

Sem alteração em hooks, RPCs ou lógica de defensiva — apenas apresentação. Mantém responsividade (as células passam de `w-8 h-8` para `w-9 h-9 sm:w-10 sm:h-10` para caber a data sem quebrar no mobile).
