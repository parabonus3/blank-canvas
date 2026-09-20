# Concluir a base móvel do Timezoni

## Objetivo

Finalizar a jornada diária no celular com **Cronômetro, Hoje, Tarefas, Salas e Mais**, preservando todos os recursos existentes e sem alterar a forma como o tempo é registrado.

## Estado confirmado

- A barra inferior móvel e a tela **Hoje** já possuem uma primeira versão no código, mas ainda não estão conectadas à navegação principal.
- A tela Hoje reaproveita agenda, tarefas, metas, rotinas e registros já existentes; ela não cria uma fonte paralela de dados.
- O cronômetro ainda mostra projeto, sala, desafio, GPS, Deep Work e rotina simultaneamente antes de iniciar.
- A agenda ainda direciona alguns inícios para a página inicial pública, em vez de `/timer`.
- Os novos textos da barra móvel e da tela Hoje ainda precisam ser adicionados aos 12 idiomas.
- O último estado registrado da aplicação está compilando normalmente.

## Implementação

### 1. Ligar a nova navegação móvel

- Adicionar a rota protegida `/today`.
- Exibir a barra inferior apenas no celular e manter o menu lateral no desktop.
- Reservar espaço inferior para que a barra não cubra botões, formulários ou conteúdo.
- Remover o botão do menu lateral do cabeçalho móvel, evitando duas navegações concorrentes.
- Manter todos os destinos atuais dentro de **Mais**, agrupados em Planejar, Registrar, Social e Conta.

### 2. Finalizar a visão Hoje

- Corrigir tipagens e estados de carregamento, vazio e erro.
- Mostrar resumo do foco concluído hoje, tarefas concluídas, agenda, próximas tarefas, meta ativa e rotina.
- Iniciar tarefas e blocos diretamente quando houver projeto relacionado; caso contrário, abrir o item para a pessoa completar o vínculo.
- Levar meta e rotina ao cronômetro já com o contexto selecionado.
- Garantir que datas e horários respeitem idioma e fuso da pessoa.

### 3. Simplificar o cronômetro

- Manter visíveis primeiro: tipo de cronômetro, projeto, tempo e botão principal.
- Colocar sala/desafio, atividade GPS, Deep Work e rotina em uma seção expansível de opções.
- Abrir essa seção automaticamente quando a pessoa chegar por uma ação da tela Hoje que dependa dela.
- Preservar a última escolha de corrida, atividade, Deep Work e rotina já armazenada.
- Durante uma sessão ativa, manter tempo, pausa, encerrar e tela cheia em primeiro plano; progresso de desafio, GPS ou rotina continua aparecendo quando usado.

### 4. Corrigir os caminhos relacionados

- Fazer a agenda iniciar e voltar para `/timer`, não para a página pública.
- Aceitar no cronômetro o projeto enviado pela tela Hoje sem substituir uma sessão já ativa.
- Manter Tarefas e Salas destacadas na barra também em suas páginas internas.

### 5. Completar os 12 idiomas

- Traduzir integralmente a barra móvel, seus grupos e todos os textos da tela Hoje.
- Remover textos de fallback visíveis e validar os 12 arquivos de idioma.
- Conferir idiomas com textos mais longos e direção RTL em árabe.

## Validação

- Verificar tipos, compilação e ausência de erros no navegador.
- Conferir larguras de 320, 360 e 390 px sem rolagem horizontal ou conteúdo coberto pela barra.
- Conferir desktop para garantir que o menu lateral e o cronômetro atual permaneçam funcionais.
- Testar: abrir Mais, navegar pelos cinco destinos, iniciar tarefa, iniciar bloco, continuar meta, abrir rotina, iniciar/pausar/encerrar sessão, Pomodoro, sala, desafio, GPS e Deep Work.
- Só marcar a base móvel como concluída no roadmap após esses fluxos passarem.

## Fora desta entrega

Revisão semanal, fontes automáticas de metas, reorganização de salas/Painel/Notas e recursos sociais permanecem para as próximas entregas. As 56 salas fictícias continuam bloqueadas pela necessidade de acesso administrativo.
