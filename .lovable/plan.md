# Rotinas de foco: claras, coloridas e conectadas

## Problemas encontrados
- As rotinas ficam escondidas dentro de "Opções da sessão" no cronômetro. Quem não abre esse menu não as vê.
- O ícone é digitado à mão (campo de texto pequeno), sem opções prontas.
- O andamento existe só no aparelho e some ao terminar. Não há histórico, por isso não dá para saber se a rotina foi concluída, interrompida ou nem começada.
- As etapas só se ligam a projetos. Não se ligam a checklists, tarefas nem metas.

## O que vamos fazer

### 1. Lugar certo e fácil de achar
- No cronômetro, sem sessão ativa: mostrar um bloco "Rotinas" visível, com as rotinas em cartões. No celular, um abaixo do outro, sem rolagem para os lados. No computador, em grade de 2 ou 3 colunas.
- Em "Hoje": mostrar a rotina do dia ou a última usada, com botão Iniciar.
- Durante a rotina: uma barra única com as etapas em bolinhas (feita, atual, próxima) e o tempo de cada etapa.

### 2. Escolha de ícone
- Uma grade com cerca de 24 emojis temáticos (estudo, trabalho, leitura, treino, manhã, noite, meditação etc.).
- Uma cor para a rotina, usada no contorno do cartão.

### 3. Cores de situação (do dia, no fuso do perfil)
- **Verde:** todas as etapas foram feitas hoje.
- **Laranja:** a rotina foi iniciada e parada no meio, ou tem etapas puladas.
- **Vermelho:** a rotina estava prevista para hoje e não foi feita até o fim do dia. Só aparece se a pessoa marcar dias da semana na rotina, para não deixar tudo vermelho sem motivo.
- **Neutro:** a rotina não estava prevista para hoje.
- Uma faixa com os últimos 7 dias, em bolinhas coloridas, em cada cartão.

### 4. Integrações que fazem sentido
- **Checklist:** cada etapa de foco pode apontar para um checklist ou tarefa. Ao concluir a etapa, a pessoa pode marcar esses itens como feitos com um toque. Nada é marcado sozinho.
- **Metas:** a rotina pode ser ligada a uma meta do projeto. O tempo já é salvo no cronômetro como sempre, então a meta avança sem contar o tempo duas vezes.
- **Revisão semanal:** mostra quantas rotinas foram concluídas, interrompidas ou perdidas na semana.
- **Sequência e conquistas:** continuam iguais. A rotina não muda as regras de streak.

### 5. Textos
- Tudo traduzido nos 12 idiomas.

## O que não muda
- O cronômetro, o salvamento das sessões, o GPS, as salas e o streak.
- As rotinas que já existem continuam funcionando, com o mesmo ícone de antes.

## Detalhes técnicos
- Nova tabela `focus_routine_runs` (user_id, routine_id, local_date, status started/completed/partial, steps_done, steps_skipped, started_at, ended_at), com RLS limitada ao dono. O registro é gravado ao iniciar, avançar, pular e parar. O localStorage continua guardando a execução em andamento.
- Novas colunas opcionais em `focus_routines`: `color`, `weekdays int[]` e `goal_id`. Nas etapas (JSON), novas chaves opcionais `checklistId` e `taskId`. O código atual continua lendo dados antigos.
- O status do dia vem de uma função pura, testada para os casos verde, laranja, vermelho e neutro, inclusive na virada do dia pelo fuso do perfil.
- Para marcar o checklist ou a tarefa, reaproveitamos as mutações que já existem, sempre com confirmação na interface.
