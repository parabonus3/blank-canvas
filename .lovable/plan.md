# Linguagem genérica + Desafios traduzidos + Tooltips

A plataforma é usada para estudar, ler, orar, trabalhar, etc. Hoje a UI assume "estudando" em vários pontos e o módulo de Desafios da Sala está em inglês fixo em 10 dos 12 idiomas. Também faltam tooltips explicativos no diálogo "Novo desafio".

## 1. Trocar "estudando" por linguagem neutra (apenas textos de UI)

Vocabulário novo por idioma — usar "em foco / em sessão / focando agora" no lugar de "estudando agora". Aplicar nas chaves já existentes nos 12 locales:

- `rooms.studying_now` → "Em foco agora" / "Focusing now" / "Concentrándose ahora" / etc.
- `rooms.live_studying_count` → "{{count}} pessoa(s) em foco agora"
- `rooms.more_studying` → "mais em foco"
- `rooms.profile_studying` → "Em foco"
- `rooms.activity_study_started` → "{{name}} iniciou uma sessão"
- `rooms.profile_activity_started` → "Iniciou sessão"
- `explore.studying_now` → "Em foco agora"
- `explore.user_ranking_desc` → "Usuários com mais horas em foco" (remover "de estudo")
- `explore.subtitle` → "Descubra salas públicas e entre para focar junto com outras pessoas"
- `rooms.room_timer_desc` (hardcoded em `RoomTimerCard.tsx`) → trocar fallback "Estude com a sala..." por "Use o timer junto com a sala e conte para o ranking e desafios"
- `timer.inactivity_desc` → "Confirme que ainda está em sessão"
- `rooms.join_and_start` → "Entrar e começar sessão"

Sem mudar nomes de chaves nem schema/RPC. Apenas valores dos JSONs e o fallback hardcoded do RoomTimerCard.

Idiomas atualizados: pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ru-RU, ja-JP, ko-KR, zh-CN, ar-SA, id-ID.

## 2. Traduzir o bloco `rooms.challenges.*` em todos os idiomas

Hoje só pt-BR e en-US estão traduzidos. Os outros 10 idiomas têm strings em inglês fixas (ko-KR, zh-CN, ru-RU, fr-FR, de-DE, it-IT, ja-JP, es-ES, ar-SA, id-ID).

Traduzir todas as chaves de `rooms.challenges`:
section_title, new, empty_owner, create_title, edit_title, create_desc, emoji, title_label, title_placeholder, description_label, description_placeholder, period_label, period_daily, period_weekly, period_daily_short, period_weekly_short, target_minutes, duration_days, duration_optional, create_btn, delete_confirm, min_per_period_short, member, completed_today, status_on_track, status_not_started, status_missed_short, status_missed_days, missed, legend_done, legend_partial, legend_missed, banner_remaining, banner_done.

Mais: novas chaves de tooltip (ver item 3) também traduzidas em todos os idiomas.

## 3. Tooltips explicativos no `CreateChallengeDialog`

Adicionar um ícone de ajuda (`HelpCircle` lucide) ao lado de cada `Label`, usando `Tooltip` + `TooltipTrigger` + `TooltipContent` do shadcn. Em mobile, o tooltip abre por toque (já suportado via Radix). Novas chaves `rooms.challenges.tooltip_*`:

- `tooltip_emoji` — "Escolha um ícone para identificar visualmente o desafio na lista."
- `tooltip_title` — "Nome curto do desafio. Aparece no card e no banner do timer."
- `tooltip_description` — "Opcional. Explique o objetivo ou regra do desafio para os membros."
- `tooltip_period` — "Diária: meta zera todo dia. Semanal: meta acumula durante a semana e zera no domingo."
- `tooltip_target_minutes` — "Quantos minutos cada membro precisa registrar no timer da sala para bater a meta no período."
- `tooltip_duration_days` — "Por quantos dias o desafio fica ativo. Deixe em branco para desafio sem prazo."

Também ajustar `DialogDescription` para algo mais informativo: "Crie uma meta recorrente (oração, leitura, foco etc.) que os membros completam ao usar o timer da sala."

## 4. Responsividade do diálogo

O dialog já tem `w-[calc(100%-1rem)] sm:max-w-md max-h-[92dvh] flex flex-col` com body scrollável e footer fixo, o que está bom. Ajustes:

- Trocar a grade fixa `grid-cols-2` dos campos "Minutes" + "Duration" por `grid-cols-1 sm:grid-cols-2` para evitar inputs apertados em telas <380px.
- Garantir que o `flex-wrap` dos emojis cabe (já está).
- Botões do footer já são `flex-col-reverse sm:flex-row` (ok).

## Arquivos afetados

- `src/components/rooms/CreateChallengeDialog.tsx` — tooltips, grid responsivo, descrição.
- `src/components/rooms/RoomTimerCard.tsx` — fallback do `room_timer_desc`.
- `src/i18n/locales/*.json` (12 arquivos) — traduzir bloco `rooms.challenges`, adicionar `tooltip_*`, generalizar strings de "estudando".

## Fora do escopo

- Não alterar schema, RPCs, lógica de contagem ou layout do RoomDetail.
- Não tocar em SEO/landing textuais ("study with me" continua para SEO em inglês).
- Não renomear chaves i18n existentes (apenas valores).
