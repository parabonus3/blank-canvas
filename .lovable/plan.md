# Segunda chance de sequência + Ordem de Serviço no Kanban

Duas frentes: (1) consertar e humanizar o sistema de resgate de sequência (caso do Nicky), (2) transformar a área de Tarefas numa operação de verdade, com rastro de quem fez o quê e PDF de ordem de serviço.

---

## Parte 1 — Sequência: o resgate nunca funcionou

Diagnóstico confirmado no banco:

- O Nicky (`nickymenezes15@gmail.com`) tem `last_known_streak = 0`. **Todos os 22 perfis do banco estão com 0.**
- Motivo: o gatilho de proteção do perfil (`enforce_profile_update_scope`) bloqueia qualquer alteração em `last_known_streak` / `last_streak_rescue_at` para quem não é admin. As funções `refresh_last_known_streak()` e `check_and_grant_streak_rescue()` rodam com o `auth.uid()` do próprio usuário, então **todas as chamadas falham com "Only administrators can modify this field"** desde 26/04. O snapshot nunca é salvo.
- Consequência: o resgate exige `last_known_streak >= 15`. Com 0 gravado, ninguém nunca foi elegível — nem quem tinha 100+ dias.
- No caso dele: agosto teve 6 defensivas usadas (limite do mês), e o dia 20/08 ficou sem atividade e sem defensiva → a sequência caiu para 1.

### O que muda

1. **Destravar a gravação**
   - O gatilho passa a permitir escrita nesses campos quando a alteração vem de dentro das funções oficiais (marcador de sessão definido pela própria função), continuando a bloquear escrita direta do cliente.
   - Assim `refresh_last_known_streak()` volta a guardar o recorde a cada sessão encerrada.

2. **Backfill do histórico**
   - Recalcular, para todos os perfis, a **maior sequência já alcançada** a partir do histórico de sessões + defensivas (não a sequência atual), e gravar em `last_known_streak`. O Nicky volta a ter o número real (100+).

3. **Resgate retroativo para o caso dele (e casos iguais)**
   - Rodar o resgate com as regras já existentes (escala progressiva: 100+ dias → cobre até 7 dias de ausência), cobrindo o gap de 20/08. A sequência dele é restaurada e continua contando.
   - Regras de justiça mantidas: só quem tinha 15+ dias, ausência de 1 a 7 dias, no máximo **1 resgate a cada 30 dias**, e o resgate marca as datas como defensivas (fica registrado, não some do histórico).

4. **Escudo proporcional ao esforço (a parte que anima)**
   - Defensivas mensais extras por sequência longa, além do plano: +1 defensiva ao passar de 30 dias, +2 ao passar de 60, +3 ao passar de 100. Quem construiu muito tem mais margem — mas continua limitado e visível.
   - Um resgate manual: quando a pessoa perde a sequência e está elegível, aparece um cartão **"Reativar sequência"** com o botão de usar a segunda chance (hoje isso só acontece silenciosamente no login). Mostra quantos dias serão cobertos e quando poderá usar de novo.
   - Aviso preventivo: push/notificação no fim do dia quando a sequência é longa e o dia ainda está sem atividade ("sua sequência de 112 dias está em risco"), usando o agendador de notificações que já existe.

5. **Transparência no app**
   - No modal de sequência: recorde histórico, defensivas do mês (usadas/disponíveis), próxima recarga, status da segunda chance (disponível / usada em dd/mm / disponível em X dias).

---

## Parte 2 — Tarefas: o que falta para ser uma operação profissional

Hoje já existem: quadros, colunas, cartões, membros do quadro e do cartão, checklists com autoria, comentários em tempo real, anexos, capas, prazos, prioridades, apontamento de tempo por pessoa (`task_time_logs`), calendário e um painel de relatórios simples.

Falta o que o usuário pediu: **rastro de auditoria** e **documento imprimível**.

1. **Histórico de atividade (auditoria)**
   - Nova tabela de atividades do cartão, alimentada automaticamente: criação, mudança de coluna, mudança de responsável, prazo, prioridade, conclusão, item de checklist marcado/desmarcado, comentário, anexo, tempo apontado.
   - Aba "Atividade" no cartão (linha do tempo com avatar, ação e horário) e aba "Atividade" no quadro, com filtro por pessoa.

2. **Painel "Equipe" no quadro**
   - Uma linha por pessoa: tarefas atribuídas, em andamento, concluídas, atrasadas, horas apontadas, último movimento. Responde direto "quem está fazendo o quê".
   - Mobile: cartões empilhados com barra de progresso; desktop: tabela.

3. **PDF Ordem de Serviço (por cartão)**
   - Cabeçalho TimeZoni + nome do quadro, número/identificador da OS, data de emissão.
   - Bloco de identificação: título, descrição, coluna atual, prioridade, prazo, projeto, responsáveis (com nomes).
   - Checklist completo com marcados/pendentes e quem marcou.
   - Apontamento de tempo: tabela por pessoa e por lançamento, com total.
   - Comentários (histórico) e lista de anexos.
   - Linha do tempo de atividade resumida + campos de assinatura (executante / responsável) e rodapé com data de geração.

4. **PDF Relatório da Operação (por quadro)**
   - Resumo executivo (total, concluídas, atrasadas, horas), distribuição por coluna e prioridade, tabela por pessoa, tabela de tarefas atrasadas e concluídas no período, com filtro de período.
   - Exportação CSV do mesmo conjunto, reaproveitando o botão de exportação que já existe no app.

5. **Extras de organização**
   - Filtro rápido do quadro por responsável / prazo / prioridade / etiqueta (barra compacta no mobile).
   - Indicador de "sem responsável" nos cartões, para nada ficar órfão.

---

## Detalhes técnicos

**Banco**
- Ajustar `enforce_profile_update_scope` para aceitar escrita nos campos de sequência quando um marcador de sessão (`set_config` local) é definido dentro de `refresh_last_known_streak()` / `check_and_grant_streak_rescue()`.
- Nova função `get_best_ever_streak(_user_id)` (varre dias com sessão + `auto_used_dates`), usada no backfill e no `refresh`.
- Ampliar `get_monthly_freeze_allowance(user)` = limite do plano + bônus por `last_known_streak`; `useStreakFreeze` passa a ler esse valor em vez de só `STREAK_FREEZE_LIMITS`.
- Nova tabela `task_activity` (id, board_id, task_id, user_id, action, meta jsonb, created_at) com `GRANT` para `authenticated`/`service_role`, RLS restrita a membros do quadro, alimentada por triggers em `tasks`, `task_members`, `task_checklists`, `task_comments`, `task_time_logs`; RPC `get_task_activity(_task_id)` e `get_board_activity(_board_id, _limit)` retornando nome/avatar dos autores (mesmo padrão seguro já usado nos comentários).

**Frontend**
- `src/hooks/useTaskActivity.ts`, `src/components/kanban/TaskActivityFeed.tsx`, `src/components/kanban/BoardTeamPanel.tsx`, aba nova em `BoardDetail.tsx` e no `TaskDetailDrawer.tsx`.
- `src/lib/pdfExport.ts`: `exportWorkOrderPDF(task, ctx)` e `exportBoardOperationPDF(board, ctx)` seguindo o estilo dos PDFs atuais (jsPDF + autoTable, cabeçalho/rodapé já existentes).
- `src/components/StreakDetailModal.tsx`: cartão de escudo/segunda chance com botão manual chamando `check_and_grant_streak_rescue`.
- Notificação preventiva em `supabase/functions/notification-scheduler/index.ts`.
- Todas as strings novas em i18n nos 12 idiomas.

**Sem quebrar nada**: as funções e telas atuais continuam com a mesma assinatura; as mudanças são aditivas, exceto o ajuste do gatilho (que hoje só produz erro).
