## Opção C — Corrigir Dashboard (timezone) + Ajustar lógica de Streak (freeze)

Dois problemas serão resolvidos juntos:

1. **Dashboard** usa o horário do navegador (`new Date()`, `startOfDay`, `startOfWeek`, `startOfMonth`) para calcular Hoje / Esta semana / Este mês. Isso diverge das telas de Conquistas e Streak, que usam o `timezone` do perfil. Resultado: cards mostrando totais diferentes para o mesmo usuário dependendo de onde estão.

2. **Streak** considera um dia coberto por *streak freeze* como dia de streak. Hoje, um usuário sem **nenhum** `time_entry` pode aparecer com streak = 1 só porque um freeze foi consumido automaticamente. Streak deve **preservar** uma sequência existente, nunca **iniciar** uma do zero.

---

### Parte 1 — Dashboard respeitando o timezone do perfil

Arquivo: `src/pages/Dashboard.tsx`

- Substituir o uso direto de `new Date()` / `startOfDay` / `startOfWeek` / `startOfMonth` pelo timezone do perfil via `useTimezone()` (já importado).
- Calcular os limites de período convertendo "agora" para o timezone do usuário e gerando os cortes "início do dia/semana/mês" naquele timezone, depois reconvertendo para UTC para comparar com `start_time` (que é UTC no banco).
- Aplicar essa lógica em:
  - `todayEntries`, `weekEntries`, `monthEntries` (cards Hoje / Semana / Mês)
  - `getEntriesByDateRange()` (filtro de período "today/week/month/custom")
  - `todayPomodoros`, `weekPomodoros`
- Adicionar um helper local (ou em `src/lib/timezone.ts`) `startOfDayInTz(date, tz)` / `startOfWeekInTz` / `startOfMonthInTz` que retorna um `Date` UTC representando o início do dia/semana/mês **no timezone do usuário**.
- Custom range (`customStartDate`/`customEndDate`) também passa a interpretar as datas selecionadas como dia inteiro no timezone do perfil.

Resultado: Hoje/Semana/Mês do Dashboard ficam consistentes com Conquistas, Streak e RPCs do servidor.

### Parte 2 — Streak não pode "nascer" de um freeze

Migration nova alterando `public.get_member_room_streak(_user_id uuid)`.

Nova regra:

```text
percorre dias de hoje para trás:
  has_activity = existe time_entry concluído nesse dia
  has_freeze   = freeze auto-usado nesse dia

  se has_activity -> conta dia, segue
  senão se has_freeze:
        se streak atual já > 0  -> conta dia (preserva), segue
        senão                   -> para (freeze não pode INICIAR)
  senão -> para
```

Ou seja: um freeze só conta se já existir pelo menos um dia anterior com atividade real na sequência.

Também é avaliado o caso "hoje": se hoje não tem atividade nem freeze, o loop pula hoje e começa em ontem (comportamento atual já é assim — manter).

### Parte 3 — Limpeza dos dados afetados

Após aplicar a função, qualquer "ghost streak" (usuários cujo streak atual só existe por causa de freezes sem nenhuma atividade real) automaticamente passa a retornar 0 — sem `UPDATE` necessário, já que a função é calculada on-the-fly.

Para `profiles.last_known_streak` (cache usado para detectar perdas de streak), recalcular para todos os usuários e atualizar para o valor real retornado pela nova função, evitando que o sistema dispare alertas falsos de "streak perdido".

### Detalhes técnicos

**Arquivos a alterar:**
- `src/pages/Dashboard.tsx` — passar a usar timezone do perfil em todos os cortes de período
- `src/lib/timezone.ts` — adicionar helpers `startOfDayInTz`, `startOfWeekInTz`, `startOfMonthInTz`
- Nova migration SQL:
  - `CREATE OR REPLACE FUNCTION public.get_member_room_streak(...)` com a regra "freeze não inicia streak"
  - `UPDATE public.profiles SET last_known_streak = public.get_member_room_streak(user_id)` para recalcular o cache

**Sem mudanças em:** `useStreakFreeze`, `SidebarStreakWidget`, RPCs de salas (que usam outras funções), schema do banco.

**Compatibilidade:** A função mantém a mesma assinatura `(uuid) -> integer`, então nenhum chamador precisa ser ajustado.

### Validação após aplicar

- Conferir no banco: usuários com streak >0 que **não** possuem nenhum `time_entry` devem retornar 0 pela função.
- Conferir Dashboard: para um usuário em fuso diferente de São Paulo, "Hoje" deve bater com o dia local dele, não com o do navegador.
