## Problema confirmado

Você está certo: a usuária tinha **4/6 defensivas mensais + 4 compradas** (8 defensivas disponíveis) e mesmo assim a ofensiva foi para **0**. As defensivas não foram usadas para proteger a streak nos dias em falta.

## Diagnóstico

Investiguei o sistema. A streak é calculada por `get_member_room_streak` (RPC server-side): ela anda de hoje pra trás dia a dia — se um dia tem atividade, conta; se tem freeze gravado em `streak_freezes.auto_used_dates`, conta; **se não tem nenhum dos dois, encerra**.

O problema está em **quem grava o freeze nas datas vazias**: hoje é só o cliente (`useStreakFreeze.ts`), e ele só verifica **1 dia** — o de ontem:

```ts
const yesterday = getYesterday();
if (autoUsedDates.includes(yesterday)) return;
// chama RPC só pra "yesterday"
```

### Consequência

Se o usuário fica **2+ dias sem entrar no app**:

1. Volta no dia D. O cliente verifica só D-1 e gasta 1 freeze para ele.
2. Os dias D-2, D-3, ... ficam **sem atividade e sem freeze**.
3. Quando a streak é calculada, ela quebra no primeiro buraco — D-2 — e zera, **mesmo com 7 freezes ainda no saldo**.

Foi exatamente o que aconteceu na captura: o modal mostra defensivas usadas em alguns domingos isolados (os dias em que ela voltou e D-1 caiu num domingo), mas os outros dias vazios não foram protegidos. A streak quebrou no buraco mais recente.

Há também o caso menor: se o usuário **nunca abre o app por dias seguidos**, nenhum freeze é gasto e a streak some — mesmo com saldo cheio.

## Solução proposta (backend, sem quebrar nada)

A correção precisa estar no **servidor**, não no cliente, porque a verdade da streak é server-side e o cliente só roda quando o usuário abre o app.

### 1. Nova função `auto_consume_pending_freezes(_user_id)`

SECURITY DEFINER, com `pg_advisory_xact_lock` por usuário (mesmo padrão do `consume_streak_freeze` atual).

Lógica:
- Pega a data do último dia com atividade (`MAX(start_time::date)` em `time_entries` com `end_time` not null) — chame de `_last_active`.
- Se `_last_active` é hoje ou ontem → nada a fazer.
- Se houver gap (`_last_active < CURRENT_DATE - 1`): para cada dia entre `_last_active + 1` e `CURRENT_DATE - 1` (não inclui hoje, pois o usuário ainda pode estudar hoje):
  - Se a data já está em `auto_used_dates` → pula.
  - Se há saldo mensal (`used < total_granted` no mês daquela data) → consome 1 mensal e adiciona a data.
  - Senão se há saldo comprado (`balance > 0`) → consome 1 comprada e adiciona a data.
  - Senão → para o loop (sem saldo, streak vai quebrar mesmo).
- Tudo reaproveitando exatamente as mesmas operações do `consume_streak_freeze` atual (não duplicar lógica — internamente pode chamar `consume_streak_freeze(_d)` num loop).
- Limite de segurança: no máximo `total_granted_no_mês + balance_comprado` iterações, e cap de 60 dias para evitar loops longos em contas inativas há meses (não faz sentido reviver streak antiga de 2 meses atrás).

### 2. Chamar antes de calcular a streak

Em `get_member_room_streak`, no início, chamar `PERFORM auto_consume_pending_freezes(_user_id);`. Assim, **sempre que a streak for lida** (sidebar, modal, ranking), os freezes pendentes são aplicados primeiro.

Isso garante:
- Quem volta após N dias tem N-1 freezes consumidos automaticamente (até esgotar saldo).
- Quem nunca abre o app: na próxima leitura da streak (por ele ou por qualquer feature que a leia), os freezes são aplicados.
- O ranking de salas, que usa a mesma RPC, também fica correto.

### 3. Cliente — simplificar

`useStreakFreeze.ts` pode parar de tentar aplicar freeze diretamente — basta invalidar `personalStreak` no mount (a leitura da streak já dispara o auto-consume server-side). Manter o toast `freeze_used` comparando `auto_used_dates` antes/depois.

### 4. Backfill one-shot

Migration roda `auto_consume_pending_freezes(user_id)` para todos os usuários com gap recente (últimos 30 dias) e saldo > 0. Isso **restaura a streak da Nicky e de todos os outros afetados** sem invenção: usa o saldo real que cada um tinha.

### 5. Idempotência e segurança

- A função é idempotente: re-rodar não consome de novo (já checa `_date = ANY(dates)`).
- Constraint `used <= total_granted` (já existe da migration anterior) impede excesso.
- Lock por usuário impede corrida.
- Cap de 60 dias evita "ressuscitar" streak antiga absurda.

## Por que essa abordagem

- **Não muda comportamento de quem entra todo dia** (gap = 0, função sai imediatamente).
- **Não inventa dias estudados** — só gasta freeze que o usuário realmente tinha.
- **Single source of truth no servidor** — elimina o problema estrutural de depender do cliente abrir o app.
- **Conserta o ranking** — como o ranking lê a mesma RPC, fica coerente.
- **Reaproveita** `consume_streak_freeze` (lógica já testada e idempotente).

## Arquivos afetados

- `supabase/migrations/<nova>.sql` — função `auto_consume_pending_freezes` + chamada dentro de `get_member_room_streak` + backfill one-shot.
- `src/hooks/useStreakFreeze.ts` — simplificar (invalidar query em vez de chamar RPC direto).

Sem mudanças em `StreakDetailModal.tsx`, compras, missões, ou no schema.

## Validação após aplicar

1. Streak da Nicky deve voltar para o valor correto (último estudo + freezes disponíveis preenchendo o gap).
2. `SELECT used FROM streak_freezes` deve refletir os novos consumos.
3. Tentar ler a streak duas vezes seguidas: a segunda chamada não deve gastar nada.
4. Usuário sem saldo e com gap: streak permanece 0 (comportamento correto).
