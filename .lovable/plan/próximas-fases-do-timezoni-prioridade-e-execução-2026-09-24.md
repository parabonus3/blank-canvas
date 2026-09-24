# Próximas fases do Timezoni — prioridade e execução

## Objetivo

Continuar o ciclo **planejar → executar → registrar → revisar**, melhorando primeiro o que afeta o uso recorrente no celular e aproveitando estruturas já existentes antes de criar novos módulos.

## Situação confirmada

- A base móvel já está implementada: navegação inferior, página Hoje, agenda diária e cronômetro simplificado.
- Nos últimos 30 dias, 90 de 146 visitantes usaram celular; Cronômetro e Salas estão entre as páginas internas mais acessadas.
- O sistema já registra tempo, tarefas concluídas, blocos planejados, metas de projeto, metas anuais e distância GPS, mas esses resultados ainda não formam uma revisão semanal única.
- Existem dois conceitos diferentes chamados “metas”: metas diárias/semanais de tempo por projeto e metas anuais manuais. Os dados são distintos e devem continuar separados, mas precisam de nomes e ligações mais claros.
- O Painel já tem muitos blocos e filtros; Salas ainda reúne ranking, conquistas, mapa e atividades na mesma visão; o chat usa altura fixa; Notas continua baseada em lista de cartões e janela de edição.
- Duelos já funcionam dentro de Amigos, porém não enviam avisos e só são encerrados quando alguém abre o placar.
- Sessões agendadas possuem tabelas e regras de acesso, mas não têm telas, confirmação de presença ou lembretes.
- Corrida/caminhada/pedal/trilha e recordes estão prontos; falta apenas um início rápido pelo histórico.
- Histórico e Painel já exportam PDF/CSV. Portanto, uma nova exportação deve complementar o que existe, não duplicá-lo.
- A geração das 56 salas fictícias restantes continua separada e bloqueada até haver acesso administrativo para executar e validar.

## Ordem recomendada

### Prioridade 1 — Revisão semanal e progresso coerente

É a próxima fase recomendada. Ela fecha o ciclo principal e dá utilidade aos dados que o usuário já registra todos os dias.

1. Criar uma **Revisão da Semana** compacta na página Hoje e uma versão detalhada no Painel.
2. Mostrar separadamente:
   - tempo planejado versus realizado;
   - tempo focado e comparação com a semana anterior;
   - tarefas concluídas;
   - metas de projeto atingidas;
   - distância GPS por modalidade;
   - equilíbrio do orçamento por categoria.
3. Nunca transformar minutos, tarefas e quilômetros em uma pontuação única.
4. Destacar uma próxima ação real: continuar uma meta atrasada, iniciar a próxima tarefa, ajustar um orçamento ou preencher uma lacuna.
5. Renomear e explicar claramente **Metas de Projeto** e **Metas Anuais**, preservando seus dados atuais.
6. Nas metas anuais, permitir uma fonte de progresso escolhida pela pessoa:
   - manual;
   - tempo de um projeto;
   - tarefas concluídas;
   - distância GPS de uma modalidade.
7. Atualizar automaticamente somente metas com fonte definida; as demais continuam manuais.
8. Gerar até três sugestões editáveis com base nas últimas quatro semanas, sem criar metas automaticamente.

### Prioridade 2 — Telas densas realmente mobile-first

1. **Salas:** separar em Visão Geral, Progresso e Chat; mover ranking, conquistas, mapa e atividades para Progresso; adaptar o chat à altura disponível.
2. **Painel:** manter período e resumo no topo; colocar filtros avançados em uma área recolhível no celular; evitar repetição da mesma métrica em blocos diferentes.
3. **Notas:** alternar entre lista e editor em tela cheia no celular, mantendo busca, pastas e salvamento acessíveis.
4. Compartilhar componentes visuais de mapa de atividade, sem misturar os dados pessoais com os dados da sala.
5. Compartilhar a mesma consulta de progresso diário da sala entre cabeçalho e meta coletiva, evitando números momentaneamente diferentes.

### Prioridade 3 — Completar recursos sociais iniciados

1. Adicionar avisos de convite, aceite, recusa e resultado dos duelos.
2. Encerrar duelos vencidos no processo agendado, mesmo que ninguém abra a página.
3. Criar a interface de sessões agendadas nas salas:
   - criação e edição por dono/moderador;
   - agenda futura e histórico;
   - confirmação de presença com avatares;
   - cancelamento preservado no histórico;
   - aviso antes do início para quem confirmou.
4. Mostrar a próxima sessão da sala na Visão Geral, sem interferir no cronômetro normal ou na sessão coletiva existente.

### Prioridade 4 — Acabamentos de alto valor e baixo risco

1. Adicionar “Iniciar nova atividade” no histórico de corrida, preservando a modalidade selecionada.
2. Evoluir a exportação existente para um timesheet mensal profissional por projeto/categoria, com subtotais e período; manter os planos Pro/Premium atuais.
3. Remover textos de fallback em português das áreas principais e validar os 12 idiomas.
4. Eliminar a agenda duplicada entre Hoje e Tarefas, mantendo Hoje como centro do dia e um acesso curto em Tarefas.

### Prioridade 5 — Cronômetro offline

Tratar como projeto isolado somente após as fases anteriores, pois envolve fila local, reconciliação e prevenção de sessões duplicadas. Não misturar com mudanças visuais.

## Primeira entrega recomendada

### Fase 5 — Revisão útil

#### Bloco A — Base confiável

- Definir uma única semana no fuso do perfil, de segunda a domingo.
- Criar funções reutilizáveis para agregar tempo, tarefas, agenda, GPS e metas sem alterar os registros originais.
- Corrigir cálculos ainda dependentes do fuso do navegador nas metas de projeto e no orçamento semanal.
- Garantir que sessões ativas não sejam tratadas como concluídas.

#### Bloco B — Revisão semanal

- Criar resumo compacto na página Hoje.
- Criar detalhamento no Painel com comparação à semana anterior.
- Exibir cada métrica em sua unidade original e informar a origem.
- Incluir estados vazio, carregando, erro e semanas sem dados.

#### Bloco C — Metas conectadas

- Adicionar fonte opcional às metas anuais sem alterar metas existentes.
- Permitir escolher projeto, modalidade ou conjunto de tarefas quando a fonte exigir.
- Calcular o valor automático no fuso do perfil e bloquear edição manual apenas enquanto a fonte automática estiver ativa.
- Permitir voltar ao modo manual sem perder o histórico já lançado.
- Diferenciar os nomes e criar navegação entre Metas de Projeto e Metas Anuais.

#### Bloco D — Sugestões seguras

- Calcular sugestões localmente a partir das quatro semanas completas anteriores.
- Exigir histórico mínimo e ignorar semanas anormais ou sem dados suficientes.
- Apresentar sugestão, justificativa e valor editável; nunca salvar sem confirmação.

## Detalhes técnicos

- Reaproveitar `time_entries`, `time_blocks`, `tasks`, `goals`, `annual_goals`, `category_budgets` e `gps_activities`.
- A revisão semanal não precisa de nova tabela; será derivada dos dados existentes.
- As metas anuais precisarão de campos opcionais de origem e referência, com compatibilidade total para metas atuais.
- Toda mudança no banco terá permissões explícitas, RLS preservada e cálculo restrito ao próprio usuário.
- Consultas agregadas devem evitar uma chamada por meta ou projeto; preferir uma agregação por período.
- Manter as 12 traduções equivalentes e remover textos diretos em português das áreas tocadas.

## Critérios de qualidade

- Sem alterar o funcionamento do cronômetro, Pomodoro, GPS, salas, Kanban, mapas mentais ou histórico.
- Sem rolagem horizontal em 320, 360 e 390 px.
- Números iguais em Hoje, Painel e Metas quando representam a mesma fonte e o mesmo período.
- Minutos, tarefas, hábitos e quilômetros sempre apresentados separadamente.
- Comparações semanais respeitando o fuso do perfil e semanas completas.
- Estados de carregamento, vazio e erro em todos os novos blocos.
- Verificação de tipos, testes direcionados, compilação e validação no celular e desktop antes de avançar para a Prioridade 2.

## Resultado esperado

Ao final da próxima fase, a pessoa não verá apenas dados soltos: entenderá o que planejou, o que realmente fez, onde avançou e qual ação faz mais sentido agora. Essa fundação também permitirá reorganizar as telas e concluir os recursos sociais sem aumentar a confusão.
