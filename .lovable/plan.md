## Problemas identificados

Confirmei no banco de dados da sala `afe650d0-...` (Oração):

### 1. Ordenação dos cards fica "aleatória" com muitos membros zerados
No `RoomChallengesMatrix` a ordenação padrão é **"Hoje"** e faz:
```ts
if (b.doneToday !== a.doneToday) return b.doneToday - a.doneToday;
return b.totalSecondsToday - a.totalSecondsToday;
```
Como a maior parte dos membros hoje está com `doneToday=0` e `totalSecondsToday=0`, **todos empatam** e o React mantém a ordem de inserção do `memberIndex` (que segue a ordem retornada pelo Supabase). Resultado: **Bielzinho aparece acima do Deyvid** mesmo o Deyvid tendo tempo real na semana. Não há nenhum critério de desempate por tempo semanal ou total.

### 2. Quase todo mundo aparece como "Novato"
Os títulos usam a função:
```ts
if (hours >= 500) legend
if (hours >= 200) master
if (hours >= 50)  veteran
if (hours >= 10)  dedicated
else              novice
```
Consultando `room_members` desta sala, o **top 1 tem só 15,7h** e a maioria está entre 1h e 8h. Ou seja, membros com 30+ dias na sala e várias horas reais continuam "Novato" porque a barreira de 10h é muito alta para o tempo local da sala. A escala foi desenhada para tempo global, não para tempo por sala.

## Plano de correção

Ambas as mudanças são só de front-end (nada de migration, nada de RPC nova). Alteram só a lógica de ordenação e a escala de títulos.

### Mudança A · Ordenação inteligente (arquivo `src/components/rooms/RoomChallengesMatrix.tsx`)

1. **Adicionar `allTimeTotals` como prop** vinda do card (já existe lá em `memberExtras.total_seconds`). Vou usar `extra.total_seconds` que já chega por membro.
2. **Novo critério de ordenação encadeado (ambos os modos)**, aplicado após os critérios primários existentes:
   - Modo `today`: `doneToday` desc → `totalSecondsToday` desc → **`weekSeconds` desc** → **`allTimeInRoom` desc** → `display_name` asc.
   - Modo `week`: `weekSeconds` desc → `doneToday` desc → `totalSecondsToday` desc → **`allTimeInRoom` desc** → `display_name` asc.
3. **Trocar o default para `week`** quando houver dados de semana. Faz muito mais sentido "quem está mandando bem esta semana" ficar no topo, e casa com o que o usuário espera (Deyvid > Biel).
4. Passar `allTimeTotals` para dentro do `rows` incluindo `allTimeSeconds` (lido de `memberExtras.get(user_id)?.total_seconds ?? 0`).

Resultado: dois membros com "0 hoje" nunca mais ficam em ordem aleatória — quem tem mais tempo na semana/na sala aparece primeiro.

### Mudança B · Escala de títulos calibrada para tempo por sala

Reescrever `getMemberTitle(totalSeconds)` em **três lugares** que usam a mesma escala:
- `src/components/rooms/RoomChallengesMatrix.tsx` (linha 48-55)
- `src/components/rooms/RoomMemberGrid.tsx` (linha 48-55)
- `src/components/rooms/MemberProfileModal.tsx` (linha 229-235)
- `src/components/friends/FriendProfileModal.tsx` (linha 118-124) — este continua usando total global do usuário, então **NÃO** entra na mudança (mantém escala atual).

Nova escala (baseada em `total_seconds` **desta sala**):

| Horas na sala | Título              | i18n key                | Cor          |
| ------------- | ------------------- | ----------------------- | ------------ |
| `>= 200`      | Lenda               | `level_legend`          | yellow-500   |
| `>= 80`       | Mestre              | `level_master`          | purple-500   |
| `>= 30`       | Veterano            | `level_veteran`         | blue-500     |
| `>= 10`       | Dedicado            | `level_dedicated`       | green-500    |
| `>= 3`        | Regular *(novo)*    | `level_regular` *(nova key)* | cyan-500 |
| `>= 0.5`      | Iniciante *(novo)*  | `level_starter` *(nova key)* | orange-400 |
| `< 0.5`       | Novato              | `level_novice`          | muted        |

Com isso, quem já acumulou 30+ min na sala sai de "Novato" para "Iniciante"; quem tem 3h+ vira "Regular"; e as faixas superiores continuam existindo mas ficam mais alcançáveis (10h já é "Dedicado" hoje, mantido).

### Mudança C · i18n para os dois novos títulos

Adicionar as chaves `rooms.level_starter` ("Iniciante") e `rooms.level_regular` ("Regular") em todos os 13 arquivos de locale (`src/i18n/locales/*.json`), imediatamente ao lado das outras `level_*`. Traduções:

- pt-BR: Iniciante / Regular
- en-US: Starter / Regular
- es-ES: Principiante / Regular
- fr-FR: Débutant / Régulier
- de-DE: Anfänger / Regelmäßig
- it-IT: Iniziante / Regolare
- ja-JP: 初級 / 常連
- ko-KR: 입문자 / 정기
- zh-CN: 入门 / 常规
- ru-RU: Начинающий / Постоянный
- ar-SA: مبتدئ / منتظم
- id-ID: Pemula / Reguler

## Fora de escopo
- Não altero nenhuma tabela nem RPC.
- Não altero `FriendProfileModal` (usa tempo global, não local).
- Não mexo em cores/design geral dos cards — só na ordenação e no texto/threshold do título.
- Não altero o ranking lateral direito (RoomRankingSidebar), que já usa `get_room_ranking_by_period`.

## Arquivos alterados
- `src/components/rooms/RoomChallengesMatrix.tsx` — nova função de tier, novo tie-break, default sort = `week`.
- `src/components/rooms/RoomMemberGrid.tsx` — mesma nova função de tier.
- `src/components/rooms/MemberProfileModal.tsx` — mesma nova função de tier.
- `src/i18n/locales/*.json` (13 arquivos) — duas novas chaves `rooms.level_starter` e `rooms.level_regular`.