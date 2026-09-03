# O que já temos e o que falta — plano da Fase 3

## Onde estamos (confirmado no código)

Já entregue e funcionando:

- Cronômetro, Pomodoro, sons ambiente, projetos, categorias, tags, metas e metas anuais.
- Salas: desafios com histórico e ranking, conquistas gamificadas, níveis de membro, heatmap da sala, chat, convites, sessão de foco.
- Sequência (streak) com defensivas mensais, resgate manual e escudo.
- Kanban completo: quadros, colunas, tarefas, checklists com autoria, comentários em tempo real, anexos, capas, membros, permissões, auditoria e PDF de ordem de serviço.
- Fase 1: Deep Work com motivo de interrupção, estimado vs. real, relatório semanal por push (`weekly_recap` já existe no agendador).
- Fase 2: heatmap pessoal de horários, orçamento semanal por categoria, agenda do dia (time blocking com planejado vs. real).
- Modo Corrida com GPS/Leaflet, histórico e ritmo por km.
- Notificações push com preferências, horário silencioso e limite diário.
- i18n em 12 idiomas.

Do catálogo de ideias original, continuam pendentes: rotinas/rituais de foco, linha do tempo do dia, duelos 1v1, perfis de atividade no GPS, sessões agendadas na sala, metas sugeridas por padrão de uso, foco offline-first e exportação profissional de timesheet.

## Fase 3 proposta — ordem de execução

### 1. Linha do tempo do dia (maior ganho, sem tabela nova)
Faixa visual do dia com todas as sessões, pausas e lacunas. Toque numa lacuna cria sessão manual retroativa; toque numa sessão permite corrigir horário, projeto ou nota. Resolve a dor real de "esqueci de ligar o cronômetro" e conversa direto com a agenda do dia já criada.

### 2. Rotinas / rituais de foco (uma tabela simples)
Modelos encadeados, ex.: "Manhã: 10min leitura + 50min estudo + 10min anotações". Um toque inicia a sequência com transição automática entre etapas e projeto por etapa. Reusa o Deep Work e o Pomodoro que já existem.

### 3. Duelos 1v1 entre amigos
Desafio direto de X horas em Y dias, placar ao vivo, vencedor com badge no perfil. Reaproveita a estrutura de desafios de sala e a lista de amigos.

### 4. Perfis de atividade no GPS
Corrida, caminhada, pedal e trilha: limites de velocidade e filtros de drift por perfil, pace (min/km) para corrida/caminhada e velocidade (km/h) para pedal, além de recordes pessoais (maior distância, melhor 1 km e 5 km).

### 5. Metas sugeridas por padrão de uso
Sem IA, só estatística: "sua média é 40min/dia; que tal 5h/semana?". Cartão de sugestão no Painel que cria a meta em um toque, alimentado pelo heatmap e pelo histórico.

### 6. Exportação profissional de timesheet
Relatório mensal por projeto (e opcionalmente por cliente) em PDF e CSV, com totais por dia, subtotais por projeto e espaço de assinatura. Hoje só existe a ordem de serviço do Kanban e a exportação simples do Histórico.

### 7. Sessões ao vivo agendadas na sala
Dono agenda "Foco 20h–21h", membros confirmam presença, push 10 minutos antes, sala mostra quem entrou. Cria hábito coletivo e usa o agendador de notificações existente.

Fora desta fase: foco offline-first com IndexedDB — vale a pena, mas mexe no núcleo do cronômetro e merece uma fase própria depois que a Fase 3 estabilizar.

## Detalhes técnicos

- Linha do tempo: nenhuma tabela nova; consulta `time_entries` do dia no fuso do perfil, detecta lacunas > 15min, reusa `ManualTimeEntryDialog` para preencher.
- Rotinas: tabela `focus_routines` (`user_id`, `title`, `steps jsonb`, `position`) com RLS por dono e GRANTs para `authenticated`/`service_role`; execução no cliente sobre o `TimerContext`.
- Duelos: tabela `duels` (`challenger_id`, `opponent_id`, `target_minutes`, `start_date`, `end_date`, `status`) + função de placar `get_duel_scoreboard`, agregando `time_entries` no período; notificações via triggers como nos convites de quadro.
- GPS: parâmetros por perfil em `useGpsTracker.ts` e coluna `activity_type` em `gps_activities` com default `run` para não quebrar dados existentes; recordes calculados por função SQL.
- Sugestões: função SQL `suggest_goals()` (SECURITY DEFINER, escopo `auth.uid()`) devolvendo 1–3 sugestões; nenhum dado novo persistido além da meta criada.
- Timesheet: novo gerador em `src/lib/pdfExport.ts` + CSV via `exportTable.ts`; sem dependência nova.
- Sessões agendadas: tabela `room_sessions` + confirmação de presença; push pelo `notification-scheduler`.
- i18n: novos namespaces `timeline`, `routines`, `duels`, `gps_profiles`, `timesheet`, `room_sessions` nos 12 idiomas; nada de string fixa em português no código.
- Tudo mobile-first, com tokens do design system atual. Nada exige API paga ou serviço externo.
