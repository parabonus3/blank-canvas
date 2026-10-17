# Árvore de Conquistas: revisão imagem por imagem e recuperação da qualidade

## O que a análise mostrou (as 59 imagens, uma por uma, e ampliadas)

### Qualidade
Ampliei o mesmo pedaço da árvore em várias etapas. A perda de qualidade é real e vai piorando:
- **0 a 120:** boas. Agulhas do pinheiro nítidas, fundo limpo.
- **140 a 200:** começa a ficar levemente borrado (as agulhas viram "massa" verde).
- **210 a 366:** ruim. A árvore parece pintura derretida: agulhas, luzes e enfeites ficam manchados, o fundo rosa fica sujo e com faixas, o vaso perde a textura. Na 363 e na 366 o fundo vira um vermelho escuro com brilho exagerado.
- **Causa:** cada imagem foi feita editando a anterior. Cada edição perde um pouco de qualidade, e depois de 20 ou 30 edições seguidas a imagem se desfaz.

### Sequência (tamanho, vaso e câmera)
- **22 → 24:** o fundo e o vaso mudam de tom e de forma; a planta parece encolher.
- **26 → 28:** a árvore e o vaso ficam menores (retrocesso).
- **40 → 45:** o vaso diminui de tamanho.
- **50 → 55:** a árvore fica mais fina e com menos folhas.
- **80 → 90 → 100:** a árvore fica mais magra em vez de mais cheia; o fundo muda de cor.
- **110:** o vaso desce e o chão muda de lugar.
- **180 → 200:** a câmera muda; o vaso fica maior e a árvore "pula".
- **353 → 366:** a cor do fundo escurece até um vermelho intenso, diferente de toda a sequência.
- Plantio (0 a 12) e decoração (205 a 358): a ordem dos acontecimentos está boa; o problema ali é só a qualidade.

## O que faremos (por partes, revisando cada uma antes de seguir)

1. **Uma imagem de referência por fase, em alta qualidade:** criar do zero (não por edição em cadeia) poucas imagens "mestras" com vaso, câmera e fundo idênticos: muda (30), árvore jovem (60), árvore cheia (120), pinheiro adulto (200) e pinheiro decorado completo (366).
2. **Etapas intermediárias saem sempre da mestra mais próxima**, com no máximo poucas edições a partir dela, nunca 30 em cadeia. Assim a qualidade não se desfaz.
3. **Alinhamento automático:** depois de gerar, conferir por script a posição e o tamanho do vaso, o fundo e a altura da árvore. Se uma etapa ficar menor que a anterior, ela é refeita antes de seguir.
4. **Ordem de trabalho, uma parte por vez, com folha de comparação mostrada a você ao fim de cada parte:**
   - Parte A: **200 a 366** (a pior qualidade): pinheiro adulto limpo e a decoração gradual refeitos, com fundo rosa igual ao resto.
   - Parte B: **120 a 200**: crescimento até o pinheiro adulto sem mudar a câmera.
   - Parte C: **22 a 110**: corrigir os retrocessos (28, 45, 55, 90, 100, 110) mantendo as imagens boas.
   - 0 a 22 ficam como estão (sequência e qualidade boas).
5. **Nada muda para o usuário até a parte ficar aprovada:** as imagens novas só substituem as atuais depois da sua conferência, usando o modo de inspeção do administrador.

## Como verificar
- Folha comparativa por parte e uma final com as 59 em ordem.
- Recortes ampliados lado a lado (antes e depois) para confirmar a nitidez.
- Medição por script: vaso na mesma posição e tamanho, árvore nunca menor que a etapa anterior.
- Testes atuais de níveis continuam passando; conferência no celular e no computador.

## Detalhes técnicos
- Arquivos continuam `src/assets/tree/stages/level-XXX.jpg`, alinhados a `LEVEL_MILESTONES`; sem mudança de código, horas, níveis ou meta.
- Geração em qualidade alta, depois normalização (recorte, posição do vaso, cor de fundo) via Pillow; conversão WebP continua no build.
- Imagens candidatas ficam em pasta temporária até aprovação; só então substituem as atuais.
