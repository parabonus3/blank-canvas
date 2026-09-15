# Evolução integrada e mobile-first do Timezoni

## Objetivo

Fazer o sistema parecer um único produto: **planejar → executar → registrar → revisar**, sem remover recursos que já funcionam e sem depender de API paga.

## Diagnóstico confirmado

- O núcleo já é consistente entre **projetos, tarefas, agenda e cronômetro**: uma tarefa pode iniciar uma sessão e o tempo fica ligado ao projeto.
- A navegação móvel apresenta muitos destinos no mesmo nível, e a tela do cronômetro concentra escolhas demais antes do botão de iniciar.
- **Mapas mentais, notas, corrida, metas anuais e rotinas** ainda funcionam parcialmente como áreas separadas do fluxo principal.
- O mapa mental tem riscos reais de perda: renomear um nó não atualiza o estado usado pelo salvamento, e sair durante os dois segundos do salvamento automático pode descartar alterações.
- O mapa já aceita vínculo com projeto nos dados, mas a tela de criação não permite escolher esse projeto.
- Modelos e novos nós do mapa contêm textos fixos em português; também faltam confirmação ao excluir, desfazer/refazer, estado visível de salvamento e tratamento seguro de ramos com filhos.
- A sala acumula muitos blocos na visão móvel e o chat usa altura fixa; o Painel empilha muitos filtros antes dos resultados.
- Recursos anteriormente planejados continuam incompletos: avisos dos duelos, sessões agendadas nas salas, metas sugeridas e relatório profissional de horas.

## Ordem recomendada por impacto

### 1. Estabilizar e transformar o mapa mental

Primeiro, eliminar qualquer risco de perder trabalho:

- salvar corretamente edição de texto, posição, conexões, cores e formas;
- descarregar alterações pendentes ao sair e mostrar estados “salvando”, “salvo” e “erro”;
- oferecer desfazer/refazer e confirmação ao apagar mapa ou ramo;
- ao apagar um ramo, deixar a pessoa escolher entre apagar os descendentes ou mantê-los separados;
- substituir conteúdo fixo por textos nos 12 idiomas e usar datas do idioma atual;
- melhorar teclado, leitores de tela, foco e gestos de toque;
- bloquear ações conflitantes durante exportação e usar o título no nome do arquivo.

Depois, tornar o mapa útil dentro do Timezoni:

- escolher ou alterar o projeto relacionado;
- abrir um painel compacto do nó no celular;
- transformar um nó em tarefa, meta ou nota, escolhendo o projeto quando necessário;
- iniciar foco a partir de um nó já ligado a um projeto ou tarefa;
- guardar no nó o vínculo criado para evitar duplicações e permitir abrir o item correspondente;
- exibir nos mapas uma indicação discreta do projeto e dos itens já convertidos.

### 2. Simplificar a jornada diária no celular

- Criar navegação inferior com cinco destinos principais: **Cronômetro, Hoje, Tarefas, Salas e Mais**.
- Manter o menu completo em “Mais”, agrupado em: Planejar, Registrar, Social, Relatórios e Conta.
- Reorganizar o cronômetro para deixar projeto/tarefa e início em primeiro plano.
- Colocar corrida, Deep Work, rotinas e desafios em opções progressivas, preservando o último modo usado.
- Criar uma visão “Hoje” que reúna agenda, tarefa seguinte, meta em andamento, rotina e resumo do tempo, reaproveitando dados existentes.
- Permitir ações diretas: iniciar tarefa, continuar meta, preencher lacuna e começar corrida.

### 3. Unificar progresso sem misturar métricas incorretas

- Diferenciar claramente metas de tempo automáticas e metas anuais manuais.
- Permitir que uma meta anual escolha uma fonte: manual, horas de projeto, tarefas concluídas ou distância GPS.
- Atualizar o progresso automaticamente apenas quando a fonte tiver sido escolhida, evitando contagem dupla.
- Mostrar no Painel uma revisão semanal curta: planejado versus realizado, tarefas concluídas, foco, distância e próxima prioridade.
- Gerar sugestões locais com base no histórico, sempre como proposta editável — nunca criar metas automaticamente.

### 4. Organizar telas densas

- **Salas:** no celular, manter resumo, cronômetro e desafios na visão principal; mover ranking, conquistas, mapa de atividade e atividades para uma aba de progresso. Tornar o chat adaptado à altura real da tela.
- **Painel:** mostrar período e resumo primeiro; mover filtros avançados para uma folha móvel.
- **Notas:** separar lista e editor no celular, mantendo busca e pastas acessíveis sem comprimir a escrita.
- Padronizar botões de ícone, áreas de toque, seletores e estados vazios usando os controles já existentes.

### 5. Concluir recursos que já possuem base

1. Avisos de convite, aceite e resultado dos duelos.
2. Sessões agendadas nas salas com confirmação e lembrete.
3. Relatório mensal de horas em PDF e planilha por projeto/categoria.
4. Início de corrida diretamente pelo histórico de atividades.
5. Somente depois, avaliar modo offline do cronômetro como fase isolada, pois altera o núcleo mais sensível.

## Primeira entrega

A primeira implementação terá três blocos, nesta ordem:

1. **Segurança do mapa mental:** correções de salvamento, saída, exclusão, localização e acessibilidade.
2. **Mapa mental conectado:** projeto, conversão de nó e início de foco.
3. **Base móvel:** navegação inferior e simplificação da tela do cronômetro.

Essa combinação corrige um problema grave, valoriza um recurso já existente e melhora o fluxo usado todos os dias antes de criar novas áreas.

## Detalhes técnicos

- Reusar `project_id` já existente em mapas e armazenar referências de tarefa/meta/nota dentro dos dados do nó inicialmente; só criar nova estrutura no banco se consultas entre recursos realmente exigirem.
- Alterações do nó devem passar pelo estado do React Flow, nunca por mutação direta do objeto.
- Manter uma fila local de alterações com tentativa novamente em erro; sincronização entre dispositivos fica para uma etapa posterior, após o salvamento local/remoto estar confiável.
- Conversões devem ser idempotentes: um nó já convertido abre o item existente em vez de criar cópias.
- Não combinar distância, tarefas e minutos numa pontuação única. Cada indicador mantém sua unidade e origem.
- Toda mudança de banco, se necessária, terá permissões explícitas, RLS por usuário e compatibilidade com dados existentes.

## Critérios de qualidade

- Sem regressão em cronômetro, Pomodoro, GPS, salas, Kanban, metas, notas e histórico.
- Sem rolagem horizontal em 320, 360 e 390 px; alvos de toque confortáveis e suporte a teclado.
- Estados de carregamento, vazio, erro, salvamento e modo offline/sem conexão onde aplicável.
- Textos completos nos 12 idiomas, sem conteúdo fixo em português nas telas.
- Validação por tipos, testes direcionados, build e fluxos reais no navegador em celular e desktop a cada bloco.
- As 56 salas fictícias pendentes continuam como trabalho separado, bloqueado pela necessidade de uma conta administrativa para geração e validação.
