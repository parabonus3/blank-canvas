# Próximas fases do Timezoni — o que falta e o que vale criar

## Situação confirmada
- Concluído: jornada móvel, revisão semanal, metas conectadas, telas densas, duelos completos (avisos, recusa, encerramento automático), sessões de sala (edição, histórico, avatares, avisos, próxima sessão em Hoje) e início rápido de corrida.
- Tarefas já mostram estimado vs. real no cartão; o mapa mental já cria tarefas a partir de um nó. Essas ideias saem da lista de "novas".
- A agenda do dia aparece inteira tanto em Hoje quanto em Tarefas (duplicada).
- Não há relatório mensal de horas; só PDFs do Histórico e do Painel.
- Cerca de 200 textos usam frase de reserva em português nas telas.
- 165 alertas de segurança antigos no banco.
- 56 salas de demonstração aguardam conta administrativa.

## Fase 7 — Fechar o uso diário (próxima)
1. **Relatório mensal de horas**: escolher mês ou período, agrupar por categoria e projeto, subtotais, total geral, dias trabalhados; baixar em PDF e planilha. Disponível nos planos pagos, com prévia no gratuito.
2. **Agenda única**: Hoje continua com a agenda completa; Tarefas passa a mostrar só um resumo curto ("3 blocos hoje") com atalho para Hoje.
3. **Estimado vs. real com aviso**: quando uma tarefa passar de 100% do estimado durante o cronômetro, mostrar aviso discreto; incluir no relatório mensal a comparação estimado/real.

## Fase 8 — Qualidade e confiança
1. Revisar os alertas de segurança: fechar acesso de funções internas que ninguém precisa chamar, preservando as exceções públicas (prévia de sala, ranking público).
2. Traduzir os ~200 textos de reserva nos 12 idiomas.
3. Validação visual em 320/360/390 px das telas novas (sessões, duelos, Hoje, corridas, relatório).

## Fase 9 — Novidades que fazem sentido (escolher 1 ou 2)
- **Sessão ao vivo**: durante uma sessão agendada, a sala mostra quem entrou, o tempo coletivo daquela sessão e, ao final, um resumo enviado aos participantes.
- **Conquistas sociais**: selos por duelos vencidos, sessões presentes seguidas e participação em desafios.
- **Planejar a semana**: na revisão de domingo, sugerir blocos para a semana seguinte com base nas metas e no orçamento por categoria (sem IA, só cálculo).
- **Mapa mental para agenda**: além de criar tarefa, transformar um ramo em blocos de agenda do dia/semana.
- **Widget de foco no celular**: atalho de instalação com "Iniciar último projeto" direto da tela inicial.

## Fase 10 — Cronômetro offline (isolado, por último)
Gravação local, fila de sincronização, prevenção de duplicidade e recuperação após fechar o app.

## Paralelo
Gerar as 56 salas de demonstração quando houver acesso administrativo.

## Primeira entrega sugerida
Fase 7 completa (relatório mensal + agenda única + aviso de estimativa).

## Detalhes técnicos
- Relatório: agregação por período no fuso do perfil, paginada acima de 1000 registros, reutilizando `exportTable`/`pdfExport`; bloqueio por plano via `useFreeLocks`.
- Agenda: `DayAgendaCard` ganha modo compacto em Tarefas.
- Aviso de estimativa: comparação no cronômetro usando `total_tracked_seconds` + sessão ativa da tarefa.
- Segurança: revogar EXECUTE só de funções sem uso no app (levantamento por busca de chamadas), mantendo as exceções registradas em memória.
- Sem APIs pagas, 12 idiomas, sem alterar cronômetro, GPS, salas ou Kanban além do descrito.
