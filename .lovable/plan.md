# Correções nas Salas: Timer, Desafios e Conquistas

## O que encontrei na investigação

**1. Sessão de Foco não conta tempo (confirmado)**
A "Sessão de Foco" é apenas um cronômetro visual compartilhado — ela nunca cria uma sessão real em `time_entries`. Por isso quem usou ela ficou com 0 no ranking e nos desafios.

**2. Bug do "1d sem completar" (confirmado — causa exata)**
O progresso dos desafios é gravado usando o **fuso horário do usuário** (America/Sao_Paulo), mas a tela de status compara com a **data UTC do servidor**. Resultado: das 21h até meia-noite (horário do Brasil), o servidor já está no "dia seguinte" e mostra todo mundo como "1d sem completar" mesmo quem bateu a meta hoje. É exatamente o que aparece no seu print noturno.

**3. Rick não apareceu (confirmado)**
Duas causas: (a) sessões dele foram feitas **sem selecionar a sala** no timer (room_id vazio), então não contam para o desafio; (b) o mesmo bug de fuso acima escondia o progresso dele à noite.

**4. Conquistas duplicadas (confirmado)**
"5 membros" foi gravada 4 vezes e "10 membros" 2 vezes — o banco não tem proteção contra duplicatas e a conquista é inserida pelo navegador de cada membro ao mesmo tempo.

## O que será feito

### A) Correções no banco de dados (migração)
- Corrigir a função de status dos desafios para usar o **fuso horário de cada membro** ao decidir o que é "hoje" — acaba o bug do "1d sem completar" e do Rick sumido
- Remover conquistas duplicadas e adicionar trava única (sala + tipo de conquista) para nunca mais duplicar
- Ajustar a inserção de conquistas para ignorar silenciosamente duplicatas

### B) Recuperação do tempo perdido (dados)
- Sessões de foco registradas no log da sala (quem iniciou, com duração): creditar esses minutos no total da sala (`room_members.total_seconds`) e no desafio do dia correspondente — Gabriel B (25min concluídos), e quem iniciou sessões nos dias 08–09
- Vincular as sessões do Rick feitas sem sala (620s ontem + 1054s dia 08) à sala e recalcular o progresso do desafio dele

### C) Substituir "Sessão de Foco" por um Timer da Sala
- Remover o card de Sessão de Foco da sala
- Criar no mesmo lugar um **Timer da Sala** bonito e profissional: escolha do projeto (sala já pré-selecionada automaticamente), botão grande "Iniciar", display do tempo, parar/pausar — usando exatamente o mesmo sistema do timer normal (`useStartTimer`/`useStopTimer` com room_id)
- Tempo conta normalmente para: histórico, ranking da sala, desafios e sequência
- Acesso aos **sons ambientes** direto no card
- Visual destacado com gradiente/cores atraentes, totalmente responsivo no mobile
- Se já houver timer ativo, o card mostra o timer rodando em vez do botão iniciar

### D) Traduções
- Novos textos do Timer da Sala nos 12 idiomas

## Detalhes técnicos
- Migração: `get_room_challenges_with_status` passa a calcular o período atual com `compute_challenge_period` por membro (timezone do profile); `UNIQUE(room_id, achievement_type)` em `room_achievements` após dedupe; insert com upsert/ignore
- Backfill via SQL: `record_room_challenge_progress` chamada manualmente para os créditos recuperados; atualização de `room_id` nas entradas do Rick
- Novo componente `RoomTimerCard.tsx` substitui `RoomFocusSession` em `RoomDetail.tsx`; reutiliza `ProjectPicker`, `useStartTimer`, `useStopTimer` e `AmbientSoundContext`
- Nada muda no trigger de progresso que já funciona corretamente
