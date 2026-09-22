# Corrigir e proteger as sequências de estudo

## Objetivo

Corrigir a sequência do Miguel, eliminar divergências de fuso e impedir que outros usuários percam uma sequência legítima ou deixem de receber o resgate previsto.

## Diagnóstico confirmado

### Caso do Miguel

- A conta `migbruno09@gmail.com` pertence a **Miguel Bruno**, no fuso `America/Sao_Paulo`.
- O perfil preserva `last_known_streak = 70`, mas esse campo é apenas um recorde auxiliar e não é o contador exibido.
- Pelos dias locais de São Paulo, Miguel manteve **103 dias consecutivos de 08/06 a 18/09**.
- Não há sessão nem proteção registrada em **19/09**; ele voltou a estudar em **20/09**.
- Portanto, há uma ausência real de um dia, mas ele se enquadra na regra já existente de segunda chance para sequências longas. O resgate deveria cobrir esse dia.
- O resgate atual deixa de agir quando a pessoa já voltou a estudar: depois da sessão de 20/09, a sequência corrente deixou de ser zero e a função retorna antes de procurar o intervalo perdido. Isso explica por que a sequência longa não foi recuperada.
- A leitura atual dos dados produz **1 dia pela regra local correta** e **2 dias pela regra UTC atual**. O valor zero relatado não permanece nos dados neste momento, mas pôde aparecer antes da sessão de 20/09 ou por estado desatualizado da tela.

### Problema geral

- O cálculo principal usa a data UTC de início da sessão, ignorando o fuso salvo no perfil.
- O calendário visual usa o fuso do perfil e marca começo e fim; outros avisos usam o fuso do navegador e às vezes a data de término. Existem três definições diferentes para “estudou hoje”.
- Entre **693 usuários recentes**, 109 têm diferença na classificação de “hoje”; 2 têm diferença já em “ontem”. Em uma janela de 30 dias, 328 usuários tiveram alguma diferença na quantidade de dias agrupados por UTC versus fuso local. Isso não significa que todos perderam sequência, mas confirma risco coletivo.
- O cálculo de sequência, o melhor recorde, o consumo automático de proteções e o resgate repetem a mesma lógica sem fuso.
- A tela lateral esconde completamente o bloco quando recebe zero, inclusive quando ainda existe recorde ou possibilidade de resgate.
- Após encerrar uma sessão, algumas partes da sequência podem permanecer desatualizadas por até um minuto.
- A função usada para consultar a sequência de amigos também pode consumir proteção do usuário consultado. Uma consulta de perfil não deve alterar dados.

## Implementação

### 1. Criar uma única regra de dia de estudo

- Considerar o dia local de `profiles.timezone`.
- Usar o **dia local de início da sessão** como regra oficial e documentada.
- Manter “hoje ainda está em andamento”: não quebrar a sequência antes do fim do dia local.
- Tratar dias protegidos no mesmo calendário local.
- Centralizar a geração dos dias válidos numa função interna reutilizada por sequência atual, melhor recorde, proteções e resgate.

### 2. Corrigir as funções do banco

Atualizar de forma compatível:

- sequência pessoal atual;
- melhor sequência histórica;
- resumo de proteção e segunda chance;
- consumo automático de proteções;
- atualização de `last_known_streak`;
- sequências mostradas em salas e perfis.

Separar leitura de alteração:

- consultar a sequência nunca consumirá proteção;
- o consumo ocorrerá somente numa ação autenticada do próprio usuário;
- consultas de outras pessoas respeitarão `is_stats_public` e não terão efeitos colaterais.

### 3. Fazer o resgate funcionar após a retomada

- Procurar um intervalo recente entre dois blocos de atividade, mesmo quando a pessoa já voltou a estudar.
- Preservar as regras atuais de elegibilidade, limites por tamanho da sequência e intervalo de 30 dias entre resgates.
- Validar que os dias concedidos conectam de fato os dois blocos antes de gravar qualquer proteção.
- Tornar a operação idempotente para não gastar ou conceder proteção duas vezes.

### 4. Recuperar o Miguel com rastreabilidade

- Depois de corrigir as funções, executar o resgate para o Miguel cobrindo somente **19/09/2026**.
- Recalcular a sequência pelo fuso de São Paulo e atualizar o recorde auxiliar sem diminuir nenhum valor histórico.
- Conferir a linha do tempo antes e depois e registrar qual proteção foi aplicada.
- Não editar diretamente o número exibido: a sequência deve resultar dos dias de atividade e da proteção, para continuar correta no futuro.

### 5. Auditar e reparar outros usuários

- Gerar uma prévia separando:
  1. sequências quebradas apenas pelo uso de UTC;
  2. usuários com uma ausência real que se enquadram na segunda chance;
  3. ausências reais sem elegibilidade, que não devem ser alteradas.
- Reparar automaticamente apenas casos determinísticos e comprováveis.
- Não conceder dias a usuários sem atividade ou proteção que justifique continuidade.
- Atualizar `last_known_streak` somente para cima após o recálculo correto.

### 6. Unificar a interface

- Fazer cronômetro, menu lateral, modal, tela cheia e perfil público consumirem o mesmo resultado.
- Usar a mesma regra de “estudou hoje” em todas as telas.
- Não esconder o bloco quando a sequência for zero; mostrar recorde preservado e opção de resgate quando aplicável.
- Atualizar imediatamente contador, calendário, saldo e estado de proteção após encerrar sessão ou aplicar resgate.
- Manter textos nos 12 idiomas e explicar claramente “sequência atual” versus “melhor sequência”.

## Validação

- Testar sessões antes e depois da meia-noite em São Paulo, Tóquio, Seul, Los Angeles e UTC.
- Testar sessão que atravessa a meia-noite sem contar dois dias indevidamente.
- Testar hoje sem atividade, atividade em andamento, dia protegido, ausência real e retomada posterior.
- Confirmar que consultar um amigo nunca altera proteções nem dados desse amigo.
- Comparar a sequência calculada antes/depois para todos os usuários recentes e revisar qualquer redução antes de aplicar reparo.
- Validar especificamente o Miguel: 18/09 ativo, 19/09 protegido, 20/09 ativo e sequência longa restaurada.
- Validar tipos, build e os contadores reais no navegador autenticado.

## Ordem segura

1. Corrigir e testar a regra central no banco.
2. Executar auditoria em modo somente leitura.
3. Reparar Miguel e os demais casos comprovados.
4. Unificar e atualizar as telas.
5. Só então retomar as próximas melhorias do produto.
