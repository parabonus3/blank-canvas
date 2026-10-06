# Próximas fases do Timezoni

## Onde estamos
Concluído: base móvel (Hoje, navegação inferior), revisão semanal, metas conectadas, telas densas, duelos protegidos com avisos, sessões agendadas com lembretes.

Pendências confirmadas:
- Duelos vencidos só são encerrados quando alguém abre o placar; o agendador ainda não os encerra nem avisa o resultado.
- Sessões: falta editar sessão, histórico de sessões passadas, avatares de quem confirmou e aviso de cancelamento.
- Corridas: o histórico não tem botão para iniciar nova atividade.
- Exportação: existe PDF no Histórico e no Painel, mas não um relatório mensal de horas por projeto/categoria.
- Cerca de 200 textos ainda aparecem com frase de reserva em português nas telas.
- 56 salas de demonstração aguardam conta administrativa.
- 165 alertas de segurança antigos do banco (principalmente funções acessíveis demais).

## Ordem recomendada

### Fase 6 — Fechar os recursos sociais (curta, alto impacto)
1. Encerrar duelos vencidos automaticamente no agendador e avisar os dois participantes com o resultado.
2. Avisar recusa de duelo para quem desafiou.
3. Sessões: edição por dono/moderador, aviso de alteração/cancelamento, avatares de confirmados, aba "Anteriores".
4. Mostrar a próxima sessão confirmada também na página Hoje.

### Fase 7 — Acabamentos de uso diário
1. Botão "Iniciar nova atividade" no histórico de corridas, mantendo a modalidade.
2. Relatório mensal de horas (PDF e planilha) por projeto e categoria, com subtotais e período escolhido, complementando a exportação atual e respeitando os planos.
3. Unificar a agenda entre Hoje e Tarefas (Hoje como centro, atalho em Tarefas).

### Fase 8 — Qualidade e confiança
1. Revisar e reduzir os alertas de segurança antigos sem quebrar salas públicas, rankings e funções intencionais.
2. Remover textos de reserva em português e completar os 12 idiomas.
3. Validação visual em 320/360/390 px nas telas novas.

### Fase 9 — Novas ideias com sentido (escolher depois)
- Sala "ao vivo" na sessão agendada: quem entrou, tempo coletivo da sessão e resumo ao final.
- Conquistas pessoais ligadas a duelos e sessões (ex.: 5 sessões seguidas presentes).
- Estimado vs. real nas tarefas com alerta ao passar 100%.
- Mapa mental gerando tarefas e blocos de agenda em um toque.

### Fase 10 — Cronômetro offline (isolado, por último)
Fila local, sincronização segura e prevenção de sessões duplicadas.

### Paralelo — Salas de demonstração
Executar quando houver acesso administrativo.

## Primeira entrega sugerida
Fase 6 completa, seguida da Fase 7 item 1 (rápido).

## Detalhes técnicos
- Duelos: função agendada `finish_due_duels` usando o fuso do perfil e o placar existente; avisos `duel_result` e `duel_declined` via `dispatch_push`, com deduplicação.
- Sessões: trigger de UPDATE para alteração/cancelamento (`room_session_changed`), consulta paginada de passadas, perfis via função segura que expõe só nome, foto e flair.
- Timesheet: agregação por período no fuso do perfil, reutilizando `pdfExport`/`exportTable`.
- Segurança: revogar EXECUTE apenas de funções sem uso público, preservando as exceções registradas em memória.
- Sem APIs pagas; traduções nos 12 idiomas; sem alterar cronômetro, GPS, salas ou Kanban.
