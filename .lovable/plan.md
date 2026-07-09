## Diagnóstico

Confirmei olhando os dados do Nicky (`ef2c00f0…`) na sala:

- Hoje (09/07 no fuso da sala) ele tem **3 sessões** em `time_entries` com `challenge_id = ffbddd36…` ("Desafio de Oração"), totalizando ~20 min.
- Em `room_challenge_progress` **não existe linha para 09/07** desse desafio — só a de "Leitura bíblica".
- O trigger `time_entries_room_progress` está correto e chama `record_room_challenge_progress` com o `challenge_id` da sessão.
- **Causa raiz:** o desafio "Desafio de Oração" tem `start_date = 2026-06-09` e `duration_days = 30`. A RPC filtra por `(start_date + duration_days) > hoje`, ou seja `2026-07-09 > 2026-07-09` = **false**. O desafio já expirou (dia 31), então nada é creditado — mesmo com o desafio aparecendo ativo na UI.

A função `get_room_challenges_with_status` (usada pelo hook) **não aplica esse mesmo filtro de janela**, por isso a UI segue mostrando o desafio como se estivesse rodando e o membro tenta contabilizar em vão. Isso afeta **todos os membros** desse desafio, não só o Nicky.

A queixa "só está contabilizando um desafio" tem outra causa: desde a migração anterior, cada sessão credita apenas o `challenge_id` selecionado no picker. Um único timer não pode alimentar dois desafios ao mesmo tempo. Vou tratar isso separado (ver passo 3).

## Plano

### 1) Alinhar janela de validade entre UI e backend
Migração única alterando duas funções:

- **`get_room_challenges_with_status`**: adicionar coluna `is_ended boolean` e filtrar/marcar desafios encerrados. Critério idêntico ao da RPC de crédito: `duration_days IS NULL OR (start_date + duration_days) > today_in_room_tz`. Manter no retorno os encerrados só se ainda estiverem `is_active = true`, marcados com `is_ended = true` (para o histórico do último dia continuar visível por 24h) — mas ordenados por último e sem entrar em fluxos ativos.
- **`record_room_challenge_progress`**: manter o filtro atual (correto).

### 2) UI: refletir "encerrado"
- `RoomChallenge` interface ganha `is_ended?: boolean`.
- `ChallengeSummaryChips` mostra badge "Encerrado" cinza no chip quando `is_ended`.
- `RoomChallengePicker` remove desafios com `is_ended` da lista selecionável (e reseleciona o primeiro válido restante).
- `MemberCard`/`ChallengeRow`: exibe barra em cinza e desabilita o clique quando `is_ended`.

### 3) Auto-desativar desafios expirados (limpeza)
Na mesma migração, um `UPDATE` one-shot: `UPDATE room_challenges SET is_active = false WHERE duration_days IS NOT NULL AND (start_date + duration_days) <= (now() AT TIME ZONE get_room_timezone(room_id))::date AND is_active = true;`
Isso limpa o estado atual e evita confusão retroativa.

### 4) Contabilizar em múltiplos desafios simultâneos (opcional — decisão do usuário)
Hoje: 1 sessão = 1 desafio (o selecionado). Para permitir 1 sessão contar em Leitura **e** Oração ao mesmo tempo, teríamos que:
- trocar `challenge_id` (uuid) em `time_entries` por `challenge_ids` (uuid[]) **ou**
- deixar o picker multi-select e o trigger iterar creditando cada um.

Isso é uma mudança maior e muda a semântica pedida na iteração passada ("obrigar escolha, auto-selecionar o 1º"). **Vou perguntar antes de implementar** — não entra automaticamente neste plano.

### Arquivos afetados
- Nova migração Supabase (funções `get_room_challenges_with_status`, update de limpeza).
- `src/hooks/useRoomChallenges.ts` (tipo `RoomChallenge`).
- `src/components/rooms/RoomChallengesMatrix.tsx` (badge encerrado, estilo desabilitado).
- `src/components/timer/RoomChallengePicker.tsx` (filtrar `is_ended`).

### Detalhes técnicos
- Nenhuma mudança em RLS, políticas ou grants.
- A RPC continua `SECURITY DEFINER` com `search_path = public`.
- Coluna `is_ended` é derivada (não persistida além do `is_active` que já cobre pós-limpeza).
- Sem mudanças em `time_entries` nem no trigger.

Pergunta que faço junto com a implementação: quer que eu já habilite **multi-seleção de desafios por sessão** (passo 4), ou mantemos o modelo atual de 1 desafio por vez?
