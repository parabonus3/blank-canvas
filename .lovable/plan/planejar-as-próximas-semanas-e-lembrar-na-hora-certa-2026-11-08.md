# Planejar as próximas semanas e lembrar na hora certa

## Problema confirmado
O cartão "Planejar a semana" em Hoje mostra só a semana atual. Não há como ir para a semana seguinte, e o plano feito não aparece no cronômetro.

## Parte 1 — Navegar entre semanas
- Setas "‹ Semana anterior" e "Próxima semana ›" e o botão "Esta semana", com o intervalo visível (ex.: "10–16 nov").
- Dá para planejar até 8 semanas à frente. As semanas passadas ficam só para leitura: mostram o planejado e o feito, sem criar blocos.
- Na sexta, no sábado e no domingo aparece um atalho: "Planejar a próxima semana".
- O dia selecionado continua clicável em qualquer semana, e o calendário segue o seu fuso (segunda a domingo).

## Parte 2 — Planejar mais rápido
- **Copiar a semana anterior:** repete os blocos da semana anterior só nos dias que ainda estão vazios. Nada é sobrescrito.
- **Repetir o dia:** passa a valer também para os dias vazios da semana mostrada.
- **Rotinas previstas:** aparecem em cada dia com o botão "Pôr na agenda", como hoje.
- **Resumo da semana:** total planejado, dias sem plano e comparação com a semana anterior.
- **Mover bloco:** muda dia e hora de um bloco já criado, sem precisar apagar.

## Parte 3 — O plano dentro do cronômetro
- Quando o cronômetro está parado, um aviso mostra o bloco atual ou o próximo do dia: "Você planejou: Estudar OAB • 09:00–10:00". O botão **Começar agora** já vem com o projeto e a tarefa do bloco.
- Quando a sessão termina, o tempo fica ligado ao bloco e ele aparece como feito na agenda e na semana. Isso usa a ligação que já existe hoje.
- Se o horário do bloco já passou e ele não foi iniciado: "Ficou para trás", com as opções Começar, Reagendar (+30 min ou amanhã) ou Dispensar.
- O cronômetro em andamento não muda.

## Parte 4 — Lembrete para começar
- Notificação alguns minutos antes do bloco: "Seu bloco 'Estudar OAB' começa às 09:00". Ao tocar, abre o cronômetro já preenchido.
- Nas preferências de notificação: ligar ou desligar e escolher a antecedência (5, 10 ou 15 min). Respeita o horário de silêncio e os limites diários que já existem.
- Ninguém recebe aviso duplicado do mesmo bloco, e o aviso do horário habitual não é enviado quando já existe um bloco planejado.
- Domingo à noite, um aviso opcional: "Sua semana ainda não tem plano".

## Fora do escopo
Calendário do Google ou serviços pagos, e planejar o horário dos outros membros da sala.

## Detalhes técnicos
- `WeekPlanCard`: estado `weekOffset` (−4…+8) com `startOfWeekMonday` mais um deslocamento. `useWeekTimeBlocks` já aceita `weekStart`. Novo helper `copyWeekToEmptyDays` em `weekPlan.ts`, com testes (só dias vazios, DST, limite de semanas).
- Migração: `time_blocks.reminder_sent_at timestamptz` e preferências `block_reminder_enabled` / `block_reminder_minutes`. RLS atual mantido.
- `notification-scheduler`: busca blocos com `start_at` dentro da janela, ainda não iniciados e com `reminder_sent_at` nulo; marca o envio de forma idempotente.
- Cronômetro (`Index.tsx`): novo `PlannedBlockBanner` lendo os blocos do dia. Ao parar, preenche `time_entry_id` e `is_done` como já é feito hoje.
- Textos nos 12 idiomas e layout mobile-first a partir de 320px.
