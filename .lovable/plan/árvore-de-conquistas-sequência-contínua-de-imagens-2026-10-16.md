# Árvore de Conquistas: sequência contínua de imagens

## O que a análise confirmou
Montei todas as 59 imagens lado a lado. Você está certo: a sequência tem saltos e retrocessos.

- **Nível 10 → 12:** passa de um broto minúsculo para uma muda já com folhas, e no **14** a planta volta a ficar pequena. O vaso também muda de tamanho.
- **Nível 45 → 50:** a árvore regride de uma muda grande para um galho fino quase sem folhas.
- **Nível 180 → 200:** a câmera aproxima de repente; o vaso fica cortado e a árvore dá um salto de tamanho.
- **Nível 295 → 305:** o vaso fica menor e mais baixo, e a árvore encolhe.
- **Nível 348 → 353:** aparece neve de repente, sem marco que a explique.
- **Nível 358:** o vaso volta a crescer e muda de formato.
- **Níveis 0–9:** a terra e a umidade variam sem ordem (o 8 parece molhado, o 9 seco), e a semente quase não aparece.

## O que faremos
1. **Uma única regra de enquadramento:** mesmo vaso, mesma posição, mesma câmera e mesmo fundo em todas as imagens. Só a planta muda.
2. **Crescimento sempre para a frente:** cada imagem precisa ser igual ou maior que a anterior. Nada encolhe e nada some.
3. **Refazer só os trechos com problema**, editando a imagem anterior como base para a próxima:
   - plantio e semente (0–10): terra, semente visível, rachadura e broto saindo;
   - broto até muda (10–30): crescimento gradual, sem o salto do 12;
   - muda até árvore jovem (45–60): eliminar a regressão do 50;
   - árvore até pinheiro (180–200): manter o zoom anterior;
   - decoração final (295–366): mesmo vaso; neve somente se houver um marco para ela.
4. **Revisão antes de terminar:** gerar primeiro os trechos 0–30 e 45–60 e mostrar uma folha comparativa. Só depois seguir para o restante.
5. **Ajustar as descrições dos marcos** para baterem com o que cada imagem mostra (por exemplo, "semente na terra", "primeira folha", "primeiros galhos", "neve" ou remover a neve). Tudo nos 12 idiomas.
6. Manter a velocidade já conquistada: imagens leves, troca apenas depois que a nova carregou e preparo só das vizinhas.

## Como verificar
- Folha final com todas as imagens em ordem, sem saltos, regressões ou mudança de vaso.
- Teste automático: cada nível com marco tem imagem, e os níveis entre marcos mostram a última imagem conquistada.
- Conferência em celular (320/360/390) e computador.

## Detalhes técnicos
- Edição de imagem por referência (imagem anterior → próxima), com normalização do enquadramento (posição do vaso, escala e fundo) por script antes de salvar em `src/assets/tree/stages/`.
- Nomes de arquivo continuam `level-XXX.jpg` alinhados a `LEVEL_MILESTONES`; as descrições mudam apenas os textos em `treeConfig`/locales, sem alterar horas, níveis ou a meta de 1.100h.
- Não alterar cronômetro, sequência pessoal, salas ou banco.
