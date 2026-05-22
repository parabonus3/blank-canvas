## Problema identificado

O widget de streak na sidebar mostra "Estude hoje para manter sua sequência" em laranja mesmo quando o usuário já estudou hoje.

**Causa raiz:** em `src/components/SidebarStreakWidget.tsx` (linhas 63-70), a consulta que decide `studiedToday` filtra por `start_time >= todayStart` (meia-noite local).

No caso atual o usuário fez uma sessão que **começou às 23:41 de 21/05 e terminou às 00:06 de 22/05**. O `end_time` é hoje, mas o `start_time` é ontem — então a query devolve `count = 0` e o widget acha que ele não estudou hoje, ficando laranja com `atRisk = true`.

## Correção

1. **`SidebarStreakWidget.tsx`** — trocar o filtro para considerar uma sessão como "estudou hoje" se **qualquer parte dela** cair em hoje no fuso local:
   - filtrar por `end_time >= todayStart` (já é `not null`), em vez de `start_time >= todayStart`.
   - Isso cobre sessões que atravessam a meia-noite e mantém o comportamento normal (sessões iniciadas e finalizadas hoje continuam contando).

2. **`StreakDetailModal.tsx`** — aplicar a mesma lógica na query `streakStudiedDates`: marcar como "studied" tanto o dia do `start_time` quanto o dia do `end_time` (em horário local), para que o calendário fique consistente com o widget e mostre o quadradinho verde no dia em que a sessão terminou.

3. Usar o fuso do usuário (`useTimezone`) ao calcular o dia local em vez de `toISOString()` (UTC), evitando que sessões noturnas fiquem registradas em outro dia para quem está em fusos distantes do UTC.

## Sem mudanças de UI

Cores, copy, layout e i18n permanecem iguais. Apenas a lógica de detecção de "estudou hoje" é ajustada. Mobile e desktop herdam a correção automaticamente (o widget é o mesmo).
