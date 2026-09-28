# Próximas melhorias do Timezoni — ordem recomendada

## Objetivo

Concluir o ciclo **planejar → executar → registrar → revisar** antes de abrir módulos novos, priorizando o uso diário no celular e terminando recursos que já possuem base pronta.

## Situação confirmada

- A navegação inferior, a página Hoje, o cronômetro simplificado e a revisão semanal já estão implementados.
- A revisão semanal já aparece em Hoje e no Painel, respeita o fuso do perfil e mantém tempo, tarefas e distância em unidades separadas.
- Metas anuais já podem usar progresso manual, tempo, tarefas ou distância GPS.
- A parte ainda não entregue da Fase 5 são as sugestões editáveis baseadas nas quatro semanas anteriores.
- A versão atual compila sem erros, mas os fluxos recentes ainda não possuem testes automatizados nem validação autenticada completa em celulares estreitos.
- Salas ainda concentram timer, desafios, membros, ranking, conquistas, mapa e atividade na mesma aba; o chat usa altura fixa de 600 px.
- O Painel mantém todos os filtros abertos; Notas ainda usa janelas de edição em vez de uma experiência de tela cheia no celular.
- Duelos já funcionam, mas faltam avisos e encerramento independente da abertura do placar.
- Sessões agendadas de sala já possuem estrutura de dados e permissões, mas não possuem interface nem lembretes.
- A geração das 56 salas fictícias continua separada e bloqueada até haver acesso administrativo.

## Ordem de prioridade

### 1. Fechar e validar a Fase 5

Antes de avançar, garantir que a base recém-criada é confiável.

- Testar com conta autenticada a revisão semanal em Hoje, Painel e Metas.
- Conferir semanas no fuso do perfil, mudança de horário, sessões em andamento e volumes acima de mil registros.
- Validar metas automáticas de tempo, tarefas, corrida, caminhada, pedal e trilha; alternar entre automático e manual sem perder o histórico.
- Criar até três sugestões de meta a partir das quatro semanas completas anteriores.
- Mostrar motivo e valor sugerido, permitir edição e somente criar a meta após confirmação.
- Não sugerir quando o histórico for insuficiente ou anormal.
- Adicionar testes direcionados para limites semanais, paginação e modalidades GPS.

**Por que vem primeiro:** evita construir novas telas sobre números ainda não comprovados e conclui o escopo já aprovado.

### 2. Reorganizar Salas para celular

Esta deve ser a primeira melhoria visual após a validação, pois Salas está entre as áreas mais usadas e é a tela densa com problema mais evidente.

- Separar em **Visão Geral**, **Progresso** e **Chat**.
- Visão Geral: próxima sessão, timer, desafio ativo, meta coletiva e participantes.
- Progresso: ranking, conquistas, mapa de atividade, histórico e atividades recentes.
- Chat: ocupar a altura realmente disponível, ajustar-se ao teclado e manter mensagens/compositor acessíveis.
- Compartilhar a mesma fonte de progresso entre cabeçalho e meta coletiva para evitar números divergentes.
- Preservar permissões, desafios, ranking, molduras e funcionamento atual.

### 3. Simplificar Painel, Notas e detalhes de tarefas

- **Painel:** manter período e resumo visíveis; recolher categoria, projeto, tipo e datas avançadas em um filtro secundário no celular.
- **Notas:** alternar entre lista e editor em tela cheia, com busca, pastas e salvamento sempre acessíveis.
- **Tarefas:** reduzir os passos para alternar entre checklist, comentários, responsáveis, anexos, tempo e atividade.
- Padronizar janelas para largura segura e altura dinâmica no celular.

### 4. Completar recursos sociais já iniciados

1. Avisos de convite, aceite, recusa e resultado dos duelos.
2. Encerramento seguro dos duelos vencidos sem depender de alguém abrir a tela.
3. Sessões agendadas nas salas, com criação por dono/moderador, confirmação de presença, avatares, edição, cancelamento com histórico e lembrete.
4. Mostrar a próxima sessão na Visão Geral da sala sem interferir no cronômetro comum.

### 5. Acabamentos de alto valor e baixo risco

- Iniciar uma nova corrida diretamente pelo histórico, preservando a modalidade.
- Criar timesheet mensal por projeto e categoria, com subtotais em PDF e planilha, sem duplicar as exportações atuais.
- Remover textos residuais fora das traduções e revisar os 12 idiomas.
- Eliminar a agenda duplicada entre Hoje e Tarefas, mantendo Hoje como centro do dia.
- Gerar e validar as 56 salas fictícias quando houver acesso administrativo.

### 6. Cronômetro offline — por último

Tratar separadamente, com armazenamento local, fila de sincronização, prevenção de duplicidade e recuperação após fechamento. Esta fase mexe no núcleo mais sensível do produto e só deve começar depois dos fluxos anteriores estarem estáveis.

## Primeira entrega recomendada

### Entrega 1 — Confiabilidade semanal + Salas mobile

1. Fechar sugestões e testes da Fase 5.
2. Validar Hoje, Painel e Metas com sessão real em 320, 360 e 390 px.
3. Reorganizar Salas nas três áreas propostas.
4. Tornar o chat adaptável à tela e ao teclado.
5. Validar entrar na sala, iniciar tempo, participar de desafio, consultar progresso e conversar sem regressões.

Essa entrega combina uma base confiável com a melhoria visual de maior impacto, sem aumentar o produto com mais um módulo isolado.

## Detalhes técnicos

- Reutilizar os componentes e consultas atuais; a reorganização de Salas não exige substituir ranking, conquistas, mapa ou chat.
- Centralizar limites de semana e consultas compartilhadas para Hoje, Painel, Metas e Salas.
- Sugestões são derivadas localmente dos dados existentes e nunca são salvas automaticamente.
- Encerramento de duelos e lembretes de sessões devem ocorrer no servidor, não depender da tela aberta.
- Manter permissões existentes, os 12 idiomas e nenhuma API paga.

## Critérios de qualidade

- Sem rolagem horizontal em 320, 360 e 390 px.
- Sem conteúdo coberto pela navegação inferior ou pelo teclado.
- Mesma métrica e mesmo período exibem o mesmo número em todas as telas.
- Estados de carregamento, vazio, erro e reconexão tratados.
- Cronômetro, GPS, salas, Kanban, mapas mentais e dados existentes preservados.
- Validar cada fluxo principal autenticado no celular e no desktop antes de iniciar a fase seguinte.
