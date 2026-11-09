# Timer mais limpo e rotinas integradas ao plano

## Minha conclusão
- O cartão "Próximo do seu plano" funciona porque responde a uma pergunta: **o que faço agora?**
- As "Rotinas de foco" não respondem a essa pergunta. Aparecem sempre, três cartões com o mesmo peso, mais lixeira e lápis. Isso faz o Timer parecer uma tela de cadastro.
- Rotina não é outra coisa: é **um bloco do plano que se repete** (Oração todo dia às 6h, Estudos de segunda a sexta). Então não vou apagar as rotinas, e sim juntá-las ao plano.

## O que muda no Timer
1. **Um único cartão "Agora"**, no lugar do "Próximo do seu plano" e das rotinas, que mostra:
   - o bloco planejado ou a rotina prevista para agora, com o botão "Começar agora";
   - uma linha "Depois: Leitura · 25 min" com o próximo item;
   - um link "Ver meu dia" que leva para Hoje.
2. **Quando nada está previsto:** uma linha discreta "Iniciar uma rotina ▾" com a lista das rotinas, só para escolher e começar. Editar e excluir saem do Timer.
3. **Estados no cartão Agora:**
   - Fazendo: contorno azul, barra de progresso com o tempo do bloco e "faltam 12 min".
   - Concluído (ao salvar a sessão): verde, "Concluído · 32/30 min" e logo em seguida o próximo item.
   - Parcial (parou antes do tempo): laranja, com o botão "Continuar depois".
   - Perdido (o horário passou sem sessão): fica só em Hoje, sem alarmes no Timer.
4. **Uma tela de conclusão curta** ao salvar uma sessão que veio do plano ou de uma rotina: "Bloco concluído", minutos feitos contra os planejados, progresso do dia (2 de 4 blocos) e as opções "Começar próximo" ou "Fechar".
5. **Arrumação geral:** a sequência fica modo → relógio → projeto → sala → cartão Agora → botão Play. As metas do topo e a sequência continuam como estão.

## Onde as rotinas passam a morar
- **Criar, editar e excluir:** em Hoje, ou no Planejamento semanal, numa seção "Rotinas" ao lado dos blocos. Os dias da semana definidos em cada rotina já fazem ela aparecer na agenda e no plano da semana, o que já existe.
- O Timer só **executa**: começa, mostra as etapas e conclui.
- A ligação com o checklist e com as metas continua como está, com confirmação ao concluir.

## O que não muda
Cronômetro, Pomodoro, GPS, salas, desafios, sequências, cálculo de tempo, os planos (free/pro/premium) e os 12 idiomas. Nenhum dado de rotina é apagado.

## Detalhes técnicos
- Novo `NowCard` em `components/timer`, que substitui `PlannedBlockBanner` e `FocusRoutinesCard` em `Index.tsx`. A fonte é única: os blocos de hoje (`useTimeBlocks`) mais as rotinas previstas para o dia (`routineStatus`), ordenados por horário.
- O estado vem da sessão ativa vinculada ao bloco ou rotina e de `focus_routine_runs`. Não mexe em `time_entries` nem no timer.
- O CRUD de rotinas vai para `WeekPlanCard` e Hoje, reaproveitando o `FocusRoutineDialog`.
- A tela de conclusão aparece depois do salvamento no `StopTimerDialog`, só quando a sessão veio de um bloco ou rotina.
- Testes unitários para a escolha de "agora/depois" e para os estados concluído/parcial. Traduções nos 12 idiomas. Conferência visual em 360px e em desktop.
