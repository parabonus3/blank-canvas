# O que melhorar no Timezoni — análise geral

Objetivo-guia: pessoas mantêm um hábito diário de foco, medido por sessões concluídas e salvas por dia. Toda melhoria abaixo foi escolhida por ajudar isso.

## Situação atual
- Pronto: cronômetro com rotinas coloridas, salas fora das opções, Hoje, revisão semanal, metas conectadas, duelos, sessões agendadas, relatório mensal, corrida, Kanban, mapas mentais, conquistas (níveis 200–366 novos).
- Ainda aberto no roteiro:
  - Imagens das conquistas 22–200 (aguardam sua aprovação visual).
  - Decisão 1.098h (árvore completa) x 1.100h (meta anual).
  - 56 salas de demonstração (precisa de conta administradora logada).
  - Testes com conta real no celular (rotinas, Hoje, relatório).
  - Fase 8: avisos de segurança antigos e textos ainda sem tradução (57 pontos no código usam frase de reserva).
- Não existe ainda: cronômetro funcionando sem internet.

## Prioridade 1 — Confiança (o que pode fazer o usuário desistir)
1. Revisar os avisos de segurança antigos, sem quebrar salas públicas e rankings.
2. Traduzir todos os textos de reserva nos 12 idiomas.
3. Revisão visual em 320/360/390 px de Hoje, cronômetro, rotinas, salas, relatório e conquistas.

## Prioridade 2 — Hábito diário (ligado direto à meta)
1. **Lembrete inteligente:** se até o seu horário habitual nenhuma sessão foi salva, um aviso sugere a rotina do dia (usa o mapa de horários que já existe).
2. **Recomeço em um toque:** em Hoje, botão "Continuar onde parei" (último projeto/rotina/tarefa).
3. **Sequência mais clara:** em Hoje, mostrar "faltam X min para manter a sequência hoje".

## Prioridade 3 — Integrações que fazem sentido
1. Rotina → agenda: ao planejar o dia, encaixar a rotina como bloco de horário.
2. Revisão de domingo → planejar a semana: sugerir blocos com base nas metas e orçamentos (só cálculo, sem IA).
3. Sessão ao vivo na sala: quem entrou, tempo coletivo e resumo no fim.
4. Conquistas sociais: selos por duelos, presença em sessões e desafios.

## Prioridade 4 — Conquistas
1. Concluir as imagens 22–200 em pequenos lotes, cada um com sua aprovação.
2. Decidir 1.098h x 1.100h.

## Por último — Cronômetro sem internet
Gravar localmente, sincronizar depois e evitar sessões duplicadas. Projeto isolado.

## Primeira entrega sugerida
Prioridade 1 completa + itens 2.2 e 2.3 (rápidos e visíveis todo dia).

## Detalhes técnicos
- Segurança: revogar EXECUTE só de funções sem chamada no app, mantendo as exceções públicas registradas em memória.
- Lembrete: reaproveitar notification-scheduler + useHourHeatmap, respeitando horário silencioso e limite diário.
- Sequência/continuar: dados do perfil e últimas time_entries no fuso do perfil; sem mudar regras de streak.
- Sem APIs pagas; 12 idiomas; sem alterar cronômetro, GPS ou Kanban além do descrito.
