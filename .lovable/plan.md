# Fase 4 — Duelos, perfis de atividade e sessões agendadas

## Onde estamos

Itens já entregues da fase anterior: linha do tempo do dia e rotinas de foco.
As bases de banco de duelos, tipo de atividade no GPS e sessões agendadas em salas já existem, mas nada disso aparece ainda na interface — não há telas, botões nem textos traduzidos para esses três recursos.

Esta fase entrega os três, em ordem de menor para maior risco, sem tocar no funcionamento do cronômetro atual.

## Etapa 1 — Perfis de atividade no modo Corrida

- Antes de iniciar, a pessoa escolhe: corrida, caminhada, pedal ou trilha.
- Os números se adaptam à modalidade: ritmo por quilômetro para corrida/caminhada/trilha, velocidade média para pedal.
- O histórico ganha filtro por modalidade e um bloco de recordes pessoais (maior distância, maior tempo, melhor ritmo) por modalidade.
- Atividades antigas continuam aparecendo como corrida, sem alteração.

## Etapa 2 — Duelos 1v1 entre amigos

- Convidar um amigo para um duelo com título, meta de tempo e período (início e fim).
- O amigo aceita ou recusa; convites pendentes aparecem com foto de quem convidou.
- Placar ao vivo com o tempo confirmado de cada um, barra de progresso e tempo restante.
- Ao terminar o período, o duelo é encerrado e o vencedor é registrado; empate é tratado explicitamente.
- Notificação de convite, de aceite e de resultado, aproveitando o sistema de avisos já existente.
- Lugar: nova aba na página de Amigos, com um resumo compacto do duelo ativo no painel.

## Etapa 3 — Sessões agendadas nas salas

- Dono ou moderador cria uma sessão com título, descrição, data, hora de início e fim.
- Membros veem a agenda da sala (próximas e passadas) e confirmam presença; a lista de confirmados mostra os avatares.
- Aviso na sala quando a sessão está próxima e quando começa; lembrete por notificação para quem confirmou.
- Criador pode editar ou cancelar; sessão cancelada fica marcada, sem desaparecer do histórico.
- Não interfere no cronômetro nem na sessão de foco em grupo que já existe.

## Etapa 4 — Exportação e metas sugeridas

- Exportar o mês em planilha e PDF, com filtro por projeto e categoria e totais por dia.
- Sugestões de meta calculadas a partir do próprio histórico (média das últimas semanas), com um toque para aplicar.
- Tudo calculado no aparelho, sem serviço pago.

## Critérios que valem para todas as etapas

- Feito primeiro para celular, sem rolagem lateral, com estados de vazio, carregando e erro.
- Textos nos 12 idiomas, nada escrito direto nas telas.
- Regras de acesso conferidas: só participantes veem o duelo, só membros veem a agenda da sala.
- Reaproveitar cronômetro, avisos, projetos e login atuais.
- Verificação de tipos e build antes de encerrar cada etapa.

## Detalhes técnicos

- GPS: usar `gps_activities.activity_type` (já existe) no `useGpsTracker`/`useGpsActivities`, com seletor no `RunLivePanel` e recordes via a função `get_my_gps_records`; `RunDetailModal` e `Runs` adaptam rótulos por modalidade.
- Duelos: tabela `duels` + função `get_duel_scoreboard` já criadas; novo hook `useDuels` com Realtime, componentes `DuelInviteDialog`, `DuelCard`, `DuelScoreboard`; gatilhos de notificação reutilizando `dispatch_push`. Encerramento avaliado no carregamento do placar, sem tarefa agendada nova.
- Sessões de sala: tabelas `room_sessions` e `room_session_attendees` já criadas; hook `useRoomSessions`, componentes `RoomSessionsCard`, `CreateRoomSessionDialog`, aviso no `RoomLiveBanner`; lembrete usando `reminder_sent_at` no fluxo de push existente.
- Exportação: reutilizar a geração de PDF já usada na ordem de serviço e CSV local, sem dependência nova.
- Migrações apenas se algum ajuste for necessário (índices, coluna de empate); o esquema principal já está pronto.

## Fora desta fase

Modo offline-first do cronômetro, por alterar o núcleo de gravação e sincronização.
