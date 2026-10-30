# Próxima fase: foco juntos nas salas e conquistas que dá vontade de mostrar

Objetivo-guia: ajudar as pessoas a manter o hábito diário de foco. Cada item abaixo precisa fazer alguém **voltar amanhã**. Se não fizer isso, fica de fora.

## O que já existe (e vamos reaproveitar, sem refazer)
- **Sessões agendadas** nas salas: criar, confirmar presença, aviso "ao vivo" e "em breve". Hoje elas só mostram que a sessão está acontecendo. Ninguém consegue focar junto a partir dela.
- **Sessão de foco em grupo** (contagem regressiva, entrar e sair, comemoração no final): está pronta no app, mas **não aparece em nenhuma sala**.
- **Conquistas da sala**: são liberadas automaticamente.

## 1. Sessão ao vivo na sala
- Colocar de volta na sala o painel de foco em grupo, logo abaixo do cabeçalho. Ele só aparece quando há uma sessão acontecendo ou prestes a começar.
- Quando uma sessão agendada começa, quem confirmou presença vê **"Entrar agora"**. Esse botão entra na sessão e liga o cronômetro no projeto escolhido, contando para a sala.
- Durante a sessão, aparece quem está focando agora (fotos), o tempo que falta e quantos entraram.
- No final, cada pessoa recebe uma comemoração e um resumo ("vocês focaram 3h20 juntos"). Esse resumo vai para o histórico da sala.
- Regras que continuam iguais: o cronômetro de cada um continua sendo dele. Sair da sessão não apaga tempo. Só o dono e os moderadores abrem uma sessão sem agendamento.

## 2. Conquistas sociais (poucas e com significado)
- Conquistas pessoais ligadas a outras pessoas, todas tiradas de dados que já existem:
  - Primeira sessão em grupo
  - 5 sessões em grupo
  - Presença confirmada e cumprida
  - Vencer um duelo
  - Completar um desafio da sala
  - 7 dias focando na mesma sala
- Elas aparecem na página de conquistas, numa parte separada, sem mexer na árvore.
- Nada é liberado por algo que a pessoa não fez. A conferência acontece no servidor, então ninguém consegue forjar uma conquista.

## 3. Resumo da semana para compartilhar
- No resumo semanal de Hoje entra o botão **"Compartilhar"**. Ele gera uma imagem no próprio celular, sem serviço pago, com:
  - horas da semana
  - dias com foco
  - sequência atual
  - melhor dia
  - logo Timezoni
- No celular, abre a opção de compartilhar do próprio aparelho (WhatsApp, Instagram). No computador, baixa a imagem.
- O nome e a foto aparecem só se a pessoa quiser. Nada é publicado automaticamente.

## Ordem e cuidados
1. Sessão ao vivo (maior impacto no hábito)
2. Conquistas sociais
3. Resumo para compartilhar

Em todas as etapas:
- 12 idiomas
- telas de celular com 320, 360 e 390 px
- fuso do perfil e da sala
- sem quebrar cronômetro, sequência, desafios, ranking ou corrida

## Detalhes técnicos
- `RoomFocusSession` está órfão. Montar em `RoomDetail` usando as colunas `study_rooms.focus_session_*` e `room_members.focus_session_joined`, que já existem.
- "Entrar agora" de `room_sessions`: chamar uma RPC `join_live_room_session` (SECURITY DEFINER) que confere se a pessoa é membro, se a sessão está ativa e se a presença foi confirmada. Ela marca `focus_session_joined` e devolve a sala para iniciar o cronômetro com `room_id`.
- Canais em tempo real com nomes únicos e limpeza ao sair da tela.
- Conquistas sociais: tabela `user_social_achievements` (user_id, type, unlocked_at), com RLS só para o dono e GRANTs. Inserção apenas por uma RPC `check_social_achievements` que recalcula a partir de `time_entries.room_id`, `room_session_attendees`, `duels.winner_id` e `room_challenge_progress`.
- Imagem de compartilhamento: desenhada com Canvas 2D, fontes do sistema e números formatados no fuso do perfil. Usar `navigator.share` com arquivo e, quando não houver, baixar o arquivo. Testes para os cálculos do resumo.
