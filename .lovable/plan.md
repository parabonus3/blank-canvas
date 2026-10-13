# Conquistas do Timezoni: uma árvore contínua, leve e convincente

## Direção definida
Manter a aparência **realista**, o vaso e a evolução até o pinheiro decorado com **luzes, presentes e estrela**. Melhorar Conquistas sem redesenhar o aplicativo nem mudar os critérios de progresso nesta entrega.

## O que a análise confirmou
- Há 20 imagens PNG para plantio e broto, somando aproximadamente **29 MB**. Cada imagem vista na amostra tem cerca de 1–1,5 MB, apesar de aparecer em uma área bem menor.
- As imagens são parecidas demais em vários passos; vaso, enquadramento e fundo também variam. A sequência não comunica todas as mudanças descritas nos marcos.
- Até o nível 30 a árvore usa imagens realistas; depois passa a um desenho vetorial. Nos níveis 31–34, o broto anterior deixa de ser desenhado e o primeiro tronco só aparece no nível 35.
- A troca das imagens aguarda a saída da anterior, mas não aguarda explicitamente a nova imagem ficar pronta. Não há preparação das imagens vizinhas.
- Total anual, calendário e gráfico mensal fazem três leituras separadas do histórico do ano. Essas consultas não paginam e usam o fuso do dispositivo, não o do perfil.
- As posições das luzes contêm aleatoriedade e são recalculadas quando muda a quantidade, podendo deslocar elementos já conquistados.
- Existe uma diferença a resolver separadamente: 366 níveis de 3 horas representam 1.098 horas, enquanto a meta anual mostra 1.100 horas. Não alterar esse limite silenciosamente.

**Limitação da análise:** estas conclusões vêm dos arquivos e das imagens existentes; o tempo real de abertura com uma conta autenticada ainda precisa ser medido.

## Primeira entrega recomendada — Conquistas

### 1. Construir uma sequência visual completa
- Usar uma imagem atual como referência, preservando a identidade escolhida.
- Produzir primeiro uma amostra de início, broto, árvore jovem e pinheiro final para conferir continuidade antes de criar o restante.
- Criar estados visuais para os marcos significativos, não 366 imagens. Entre marcos, conservar a última aparência conquistada.
- Manter o mesmo vaso, cenário, iluminação e perspectiva; crescimento perceptível, sem diminuir a árvore ou trocar sua espécie abruptamente.
- Mostrar desde o estado inicial de zero horas até a árvore final, sem intervalos vazios.
- Cobrir plantio, broto, muda, árvore, pinheiro e decoração com a mesma linguagem realista. Luzes, enfeites, presentes e estrela entram conforme os marcos existentes.
- Alterar imagens existentes por edição baseada em referência, evitando uma coleção de imagens independentes e incompatíveis.

### 2. Fazer as imagens aparecerem mais depressa
- Converter e dimensionar as imagens para formatos leves, preservando detalhes em telas de alta densidade.
- Priorizar somente a imagem atual; preparar discretamente a anterior e a próxima. Não baixar toda a coleção ao abrir a página.
- Manter a imagem atual visível até a próxima estar carregada e decodificada, com transição curta e sem piscar.
- Reservar o espaço da árvore desde o início para evitar saltos na página.
- Tratar falha de carregamento com a última imagem disponível e opção de tentar novamente.
- Reduzir animações contínuas e respeitar a preferência de movimento reduzido.

### 3. Tornar os números das Conquistas consistentes
- Compartilhar uma leitura paginada dos registros concluídos entre total anual, calendário e gráfico mensal.
- Usar o ano, os dias e os meses no fuso do perfil, incluindo virada de ano e horário de verão.
- Reutilizar o resultado em cache e atualizar após salvar, editar ou excluir uma sessão.
- Manter as horas reais, os marcos, os planos e as conquistas existentes; não inventar progresso nem escrever novos totais no histórico.
- Preservar o funcionamento da sequência pessoal e dos congelamentos: árvore anual e dias consecutivos são coisas diferentes.
- Registrar a divergência 1.098/1.100 como decisão pendente, mantendo os critérios atuais nesta entrega.

### 4. Refinar a página, sem reconstruí-la
- Destacar árvore atual, fase, progresso e próximo marco com hierarquia clara.
- Preservar calendário, gráfico mensal, marcos desbloqueados e navegação de prévia.
- Diferenciar explicitamente a prévia de uma fase futura do progresso realmente conquistado.
- Evitar rolagem horizontal e conteúdo cortado em 320, 360 e 390 px.
- Traduzir textos novos, descrições alternativas e estados de erro nos 12 idiomas.

## Como verificar a entrega
- Testes de seleção de imagem nos níveis 0, 1, 10, 11, 30, 31, 34, 35 e nos marcos finais; nenhum estado vazio ou regressão visual de crescimento.
- Testes de datas no fuso do perfil, horário de verão e leitura acima de 1.000 registros.
- Conferir antes/depois das imagens lado a lado, incluindo os detalhes finais e nomes dos marcos.
- Medir tamanho transferido, carregamento inicial e troca entre marcos em rede limitada; a meta é reduzir substancialmente o peso atual, sem prometer um tempo fixo de abertura.
- Validar carregamento, vazio, erro, prévia e atualização após registrar tempo, no celular e no computador.
- A validação autenticada completa depende de acesso disponível no ambiente; não considerá-la concluída com dados simulados.

## Depois disso: o que mais vale fazer
1. **Qualidade e confiança:** revisar traduções restantes, permissões e alertas de segurança do banco em uma entrega separada. A quantidade e a relevância dos alertas precisam de auditoria atual antes de qualquer mudança.
2. **Validar o que já foi entregue:** relatório mensal, agenda, avisos de estimativa e fluxos móveis ainda têm validação autenticada pendente no roadmap.
3. **Sessão agendada ao vivo:** presença e resumo do tempo daquela sessão, aproveitando o agendamento existente; é uma extensão coerente, não outro módulo isolado.
4. **Planejamento semanal ligado às metas:** transformar a revisão em próximos blocos de agenda editáveis, sem criar compromissos automaticamente.
5. **Cronômetro offline por último:** entrega isolada, pois envolve recuperação e prevenção de registros duplicados.

Não iniciar essas cinco frentes junto da árvore. As 56 salas de demonstração seguem como pendência separada do roadmap, dependente de acesso administrativo.

## Detalhes técnicos e limites de escopo
- Centralizar o catálogo visual e o mapeamento de marcos; separar imagem, transição e preparação de carregamento do cálculo de progresso.
- Reutilizar o mecanismo de paginação e os auxiliares de datas locais existentes; manter consultas limitadas ao usuário autenticado.
- Usar conversão de imagens no processo de build e importações dos arquivos gerados, sem imagens externas hotlinkadas.
- Evitar alterações globais de fontes, cores, navegação ou exportações.
- Não alterar cronômetro, GPS, Kanban, mapas mentais, salas, regras de assinatura, sequência pessoal ou segurança do banco nesta entrega.
- Sem nova API paga no funcionamento do aplicativo; a produção das imagens é uma etapa desta entrega.

## Resultado esperado
Uma árvore que parece realmente nascer e crescer até o final, carrega com menos peso e mantém todos os recursos e critérios de conquistas existentes.