## Problema

No modal de Ofensiva, o saldo "Do plano" aparece como `-1 / 6`. Isso é matematicamente impossível e indica corrupção de dados em `streak_freezes`.

## Diagnóstico (já investigado)

Consulta no banco confirmou o caso da Nicky:

```
user_id: 134a8997-...  month_year: 2026-05
total_granted: 6   used: 7   auto_used_dates: 3 datas (2026-05-02/03/04)
```

`used` (7) é maior que `total_granted` (6) — daí `remaining = 6 - 7 = -1`. E `used` (7) também é maior que o número real de datas (3), o que confirma que houve incrementos duplicados.

### Causas-raiz identificadas

1. **`consume_streak_freeze` não é idempotente sob corrida**: a checagem `_date = ANY(_row.dates)` é feita sem `FOR UPDATE` na linha de `streak_freezes`. Se o hook `useStreakFreeze` dispara o RPC duas vezes em paralelo (duas abas, StrictMode, ou re-render), ambas leem `dates` sem o `_date`, ambas passam pelo branch `used < total_granted` e ambas incrementam `used` — gravando a mesma data só uma vez no array (por causa do `DISTINCT`), mas somando `+1` duas vezes em `used`.
2. **`useStreakFreeze` no cliente** chama `consume_streak_freeze` de dentro de um `useEffect` com guard `autoUsedRef.current`, mas o guard é por instância de hook. Em StrictMode (dev) ou se o componente que usa o hook monta em dois lugares simultaneamente (sidebar + modal), dispara em paralelo.
3. **Sem constraint no banco** que impeça `used > total_granted`.
4. **UI não protege**: `remaining = total_granted - used` é exibido cru, sem `Math.max(0, …)`.

## Solução (em camadas, sem quebrar o que funciona)

### 1. Migration SQL — corrigir dados + blindar a função

**1a. Reconciliação retroativa** (one-shot): para toda linha de `streak_freezes` onde `used > total_granted` OU `used > array_length(auto_used_dates,1)`, recalcular:
```sql
UPDATE streak_freezes
SET used = LEAST(total_granted, COALESCE(array_length(auto_used_dates,1), 0))
WHERE used > total_granted
   OR used > COALESCE(array_length(auto_used_dates,1), 0);
```
Isso reespelha `used` no que de fato existe em `auto_used_dates`, sem inventar consumo.

**1b. Constraint de sanidade**:
```sql
ALTER TABLE streak_freezes
  ADD CONSTRAINT streak_freezes_used_within_granted
  CHECK (used >= 0 AND used <= total_granted);
```

**1c. `consume_streak_freeze` idempotente**:
- Adicionar `SELECT ... FOR UPDATE` na leitura inicial da linha de `streak_freezes` (lock pessimista).
- Adicionar advisory lock por usuário (`pg_advisory_xact_lock(hashtext('freeze:'||_user_id::text))`) para serializar chamadas concorrentes do mesmo usuário.
- Após o lock, **re-checar** se `_date = ANY(dates)` antes de incrementar — se já estiver, retornar `already_used` sem mexer.
- Mesmo tratamento no branch de `purchased_streak_freezes` (`FOR UPDATE` já existe lá, manter).

### 2. Cliente — `src/hooks/useStreakFreeze.ts`

- Trocar o guard `autoUsedRef` (por instância) por um guard global por dia em `localStorage` (`timezoni-freeze-checked-YYYY-MM-DD`) para impedir que múltiplas montagens do hook disparem em paralelo no mesmo dia.
- Manter o RPC como fonte da verdade — a função idempotente protege caso o guard falhe.

### 3. UI — clampar exibição

Em `src/hooks/useStreakFreeze.ts` retornar `remaining = Math.max(0, total_granted - used)`. Isso garante que mesmo se algum dia houver inconsistência, nunca aparece `-1`. (Fix defensivo, não substitui o fix de raiz.)

## Arquivos afetados

- `supabase/migrations/<nova>.sql` — reconciliação + constraint + função idempotente
- `src/hooks/useStreakFreeze.ts` — guard via localStorage + clamp do `remaining`

Sem mudanças em `StreakDetailModal.tsx`, `BuyFreezesDialog.tsx`, ou na lógica de compras/missões.

## Validação após aplicar

1. Re-rodar a query: `SELECT user_id, used, total_granted FROM streak_freezes WHERE used > total_granted` deve retornar 0 linhas.
2. Modal da Nicky deve mostrar `3/6` (datas reais) em vez de `-1/6`.
3. Tentar disparar `consume_streak_freeze` duas vezes seguidas para a mesma data: a segunda deve retornar `already_used` sem alterar `used`.
