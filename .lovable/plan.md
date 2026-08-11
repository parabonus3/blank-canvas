# Desafios encerrados: sumir do timer + histórico com ranking

## O que está errado hoje (verificado no banco)

Na sala "ORAÇÃO" existem 3 desafios com `is_active = true`, mas dois já passaram do prazo:

- "Oração diária" (10 min) — terminou em 08/08
- "Leitura bíblica" (10 min) — terminou em 05/08
- "Oração diária" (15 min) — ativo de verdade (termina em 10/09)

O cálculo de encerrado já existe no banco (`is_ended`) e o seletor de desafio (grid de cards) já respeita isso — por isso só aparece 1 card. O que ainda aparece são os **avisos de "Faltam Xmin para a meta da sala"**, porque esse componente filtra apenas por "ativo" e ignora o "encerrado". O mesmo acontece na lista de desafios da sala e no layout da sala.

Também não existe hoje nenhuma tela de histórico: quando um desafio termina, os dados de cada dia continuam salvos no banco, mas não há nenhum lugar no app para ver quanto cada pessoa fez.

## Parte 1 — Desafio encerrado não aparece mais no Timer

- Os avisos no Timer passam a ignorar desafios encerrados (mesma regra do seletor de cards).
- A lista de desafios da sala separa "Em andamento" de "Encerrados", em vez de mostrar tudo junto como ativo.
- O layout da sala volta a considerar "sem desafios ativos" quando todos terminaram.
- Verificar no banco se tempo registrado depois do fim do desafio ainda é somado nele; se sim, bloquear no servidor para o histórico não ficar sujo.

## Parte 2 — Histórico do desafio (mobile-first)

Novo bloco recolhível **"Desafios encerrados"** dentro da seção de Desafios da sala. Fechado por padrão, com contador (ex.: "3").

Cada desafio encerrado vira um cartão compacto:

- emoji + título, período (diário/semanal), meta por período e faixa de datas ("09/jul – 08/ago");
- selo "Encerrado";
- resumo da sala: total de horas somadas por todos e % média de conclusão;
- botão "Ver ranking".

Ao abrir o ranking (modal, uma coluna no mobile):

```text
🙏 Oração diária · 09/jul – 08/ago · meta 10min/dia
─────────────────────────────────────────
🥇  Deyvid      28/30 dias   93%   5h10m
🥈  Nicky       21/30 dias   70%   3h45m
🥉  Bielzinho   12/30 dias   40%   2h05m
    João         3/30 dias   10%   0h30m
```

- Ordenado por dias concluídos, com desempate por tempo total.
- Barra de progresso por pessoa com a mesma linguagem de cor já usada (verde concluído, laranja parcial, vermelho baixo).
- Tocar numa pessoa abre o calendário de dias que já existe, agora também para desafios encerrados.
- Quem não participou nenhum dia aparece no fim, discreto, como "não participou".

## Detalhes técnicos

- Nova RPC `get_room_challenge_history(_room_id)`: `SECURITY DEFINER`, valida `is_room_member(auth.uid(), _room_id)`, retorna os desafios com `is_ended = true` ou `is_active = false`, com agregação por membro de `room_challenge_progress` (soma de `seconds_in_period`, contagem de `completed`, total de períodos do desafio) e perfil limitado a `display_name`, `avatar_url`, `avatar_flair`, `avatar_flair_color`.
- Hook `useRoomChallengeHistory(roomId)` em `src/hooks/useRoomChallenges.ts`.
- Novos componentes `src/components/rooms/RoomChallengeHistoryCard.tsx` e `RoomChallengeRankingModal.tsx`; `ChallengeCalendarModal` passa a aceitar a faixa de datas do desafio encerrado em vez de fixar as últimas 6 semanas.
- Ajustes de filtro em `RoomChallengeBanner.tsx`, `RoomChallengesCard.tsx` e `RoomDetail.tsx`.
- Todas as novas strings adicionadas nos 12 idiomas.
