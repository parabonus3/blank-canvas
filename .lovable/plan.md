## Objetivo

Garantir que toda a UI da sala (e áreas relacionadas) esteja traduzida profissionalmente em todos os 12 idiomas suportados. Hoje, várias `t("chave", "default PT")` caem no default porque a chave não existe no arquivo do idioma — por isso o japonês mostra "Timer da Sala", "Iniciar nesta sala", "Líder da semana", "a fazer / em andamento / feito", etc.

## Escopo — o que será corrigido

### A. Strings hardcoded (sem `t()`) que precisam ser convertidas

**`src/components/rooms/RoomChallengesMatrix.tsx`** — função `filterLabel()` retorna PT fixo:
- `"Todos"` → `t("rooms.challenges.filter_all")`
- `"Bateram hoje"` → `t("rooms.challenges.filter_done_today")`
- `"Faltam bater"` → `t("rooms.challenges.filter_missing")`
- `"Não começaram"` → `t("rooms.challenges.filter_not_started")`

### B. Chaves faltantes nos 12 locales (mesmo tendo `t()` no código, o valor não existe → cai no default PT)

Grupos a preencher em **pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ja-JP, ko-KR, zh-CN, ru-RU, ar-SA, id-ID**:

1. **Timer da Sala** (`RoomTimerCard`): `rooms.room_timer_title`, `room_timer_desc`, `room_timer_sounds`, `room_timer_paused`, `room_timer_counting_here`, `room_timer_counts_challenge`, `room_timer_stop`, `room_timer_elsewhere_title`, `room_timer_go_to_other_room`, `room_timer_go_to_dashboard`, `room_timer_start`, `room_timer_pick_sound`
2. **Ranking** (`RoomRankingSidebar`): `rooms.week_leader`, `rooms.in_this_room`
3. **Picker de desafio** (`RoomChallengePicker`): `rooms.challenges.pick_hint_single`, `pick_hint_multi`, `required_badge`, `legend_todo`, `legend_progress`, `legend_done_short`, `done_short`, `remaining_min_short`, `selected_badge`
4. **Matriz de desafios** (`RoomChallengesMatrix`): `rooms.challenges.sort_label`, `sort_today`, `sort_week`, `search_member`, `legend`, `legend_done`, `legend_in_progress`, `legend_at_risk`, `legend_not_started`, `no_results`, `ended_badge`, `pos_week_short`, `total_today`, `see_less`, `see_more`, `filter_all`, `filter_done_today`, `filter_missing`, `filter_not_started`
5. **Chat** (`RoomChatComposer`, `RoomChat`): `chat.bold`, `italic`, `strike`, `code`, `quote`, `list`, `link`, `link_url`, `link_text`, `edit`, `preview`, `preview_empty`, `send`, `new_messages`
6. **Timer geral**: `timer.pause`, `timer.resume` (faltando em vários locales)
7. **Admin freezes** (aparece na tela admin): bloco `admin.streak_freezes.*` (11 chaves) — completar

### C. Método de tradução

- Traduções feitas com terminologia natural e idiomática de cada idioma, não literal.
- Consistência com termos já existentes no locale (ex.: "sala"/"room"/"部屋"/"방").
- Chinês simplificado, japonês, coreano, árabe recebem termos culturalmente adequados (ex.: 週間ランキング, 오늘의 리더, قائد الأسبوع).
- Placeholders `{{n}}` preservados.
- Direção RTL do árabe já é tratada globalmente; só o texto muda.

## Execução

1. Editar `RoomChallengesMatrix.tsx` para trocar os 4 returns hardcoded em `filterLabel()` por `t(...)`.
2. Script Python único que carrega os 12 JSONs, faz `deep merge` com o dicionário de novas chaves (uma tabela por idioma) e regrava mantendo ordem e indentação de 2 espaços.
3. Verificação: re-rodar o diff de chaves ausentes por idioma — deve resultar em 0 faltas para as chaves listadas.
4. Spot-check em ja-JP e ko-KR abrindo `/rooms/:id` no preview.

## Fora de escopo

- Reordenar/renomear níveis, badges de rank, ícones ou cores.
- Alterar layouts, componentes, filtros, ou lógica.
- Novas features. Somente tradução + a pequena refatoração do `filterLabel`.

## Arquivos alterados

- `src/components/rooms/RoomChallengesMatrix.tsx` (1 função)
- `src/i18n/locales/*.json` (12 arquivos)
