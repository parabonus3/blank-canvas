# Fase 2 — Time blocking, Heatmap de horários e Orçamento por categoria

Revisão do plano aprovado: os três itens da Fase 2 continuam válidos, mas a ordem ideal muda. Heatmap e Orçamento são consultas sobre dados que já existem (`time_entries`, `categories`, `projects`), então entregam valor rápido. Time blocking é o único que exige nova tabela e arrasto no mobile — deve vir por último.

Ordem proposta: 1) Heatmap de horários, 2) Orçamento semanal por categoria, 3) Time blocking.

## 1. Heatmap de horários produtivos (sem nova tabela)

- Grade 7 dias × 24h com os minutos registrados, agregada por dia-da-semana e hora no fuso do usuário (`profiles.timezone`).
- Cartão novo no Painel, ao lado do relatório de foco: destaque do "seu melhor horário" e do "melhor dia".
- Mobile: 24 colunas ficam apertadas — agrupar em blocos de 2h (12 colunas) no celular e 24 no desktop, com legenda Menos/Mais traduzida.
- Serve de base para, depois, sugerir o horário do lembrete matinal.

## 2. Orçamento semanal por categoria

- O usuário define um alvo de horas por semana para cada categoria (ex.: Estudo 10h, Academia 4h).
- Barras de consumo da semana atual, aviso visual em 80% e estado "estourado".
- Página: seção nova em Projetos/Painel com edição rápida inline; nada obrigatório — categorias sem orçamento simplesmente não aparecem.
- Precisa de tabela nova para guardar os alvos.

## 3. Time blocking (agenda do dia)

- Faixa do dia dividida em blocos; o usuário coloca tarefas do Kanban em horários (ex.: 08:00–09:30).
- Iniciar o cronômetro direto do bloco (reusa o fluxo atual de start com `task_id` e `project_id`).
- Ao fim do dia, planejado vs. real por bloco, aproveitando o `EstimateBar` já criado.
- Mobile-first: lista vertical por hora com toque para adicionar/mover (sem drag complexo); arrasto só no desktop.
- Precisa de tabela nova para os blocos.

## Detalhes técnicos

- Heatmap: função SQL `get_my_hour_heatmap(_days)` (SECURITY DEFINER, escopo `auth.uid()`) agregando `time_entries` por `extract(dow)`/`extract(hour)` no fuso do perfil; hook `useHourHeatmap`; componente `HourHeatmapCard` seguindo o padrão visual de `RoomHeatmap`.
- Orçamento: tabela `category_budgets` (`user_id`, `category_id`, `weekly_minutes`), RLS por dono, GRANTs para `authenticated`/`service_role`, `created_at`/`updated_at` com trigger. Consumo calculado no cliente a partir de `time_entries` da semana joinado com `projects.category_id`.
- Time blocking: tabela `time_blocks` (`user_id`, `task_id` opcional, `project_id` opcional, `title`, `start_at`, `end_at`, `time_entry_id` opcional), RLS por dono, GRANTs, índice por `user_id, start_at`.
- i18n: novos namespaces `heatmap`, `budget`, `timeblock` nos 12 idiomas, sem strings fixas em português no código.
- Nada exige API paga ou serviço externo.

## Fora do escopo desta fase

Duelos 1v1, perfis de GPS e sessões agendadas na sala continuam na Fase 3.
