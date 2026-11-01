# Árvore de conquistas: refazer a sequência 22 → 140

## O que a folha comparativa mostrou
- **22 → 24:** o vaso, o fundo e o enquadramento mudam (22 tem fundo texturizado e vaso mais baixo; 24 em diante muda de câmera). Parece outra foto, e a muda parece encolher.
- **24 → 140:** cada imagem foi feita separadamente. O vaso muda de tamanho e de altura na tela, e a árvore às vezes regride:
  - 40 está mais fina que 35;
  - 90 tem menos galhos que 80;
  - 110 está mais larga que 120;
  - a altura do topo da árvore sobe e desce entre 60 e 120.
- **160 → 366 está bom** porque cada imagem foi feita a partir da anterior, com o mesmo vaso, fundo e câmera. Só a planta crescia um pouco de cada vez.

## Como vamos fazer (o mesmo método que funcionou)
1. **Uma única base fixa:** usar o vaso, o fundo rosa e a câmera da imagem 140, que já combina com 160+. Todas as imagens novas terão vaso no mesmo lugar e do mesmo tamanho.
2. **Fazer de trás para frente, encadeado:** começar da 140 e criar 120, 110, 100… até 24. Cada uma sai da imagem seguinte, "um pouco mais jovem": menos galhos, mais baixa e mais fina. Assim nunca fica maior que a seguinte.
3. **Ligar 20 → 22 → 24:** refazer a 22 (e a 20, se precisar) com o mesmo vaso e fundo, para a muda pequena encaixar na 24 nova.
4. **Regras de crescimento** (conferidas em cada imagem):
   - a altura do topo nunca diminui;
   - a largura da copa nunca diminui;
   - a quantidade de galhos nunca diminui;
   - a borda do vaso fica sempre na mesma posição, com no máximo 2% de diferença;
   - a nitidez é igual ou melhor que a da 160.
5. **Em lotes com sua aprovação:**
   - **Lote 1:** 140 a 80 (140, 120, 110, 100, 90, 80);
   - **Lote 2:** 70 a 35 (70, 60, 55, 50, 45, 40, 35);
   - **Lote 3:** 30 a 20 (30, 28, 26, 24, 22 e, se preciso, 20).
   
   Para cada lote, mostro uma folha comparativa com as imagens vizinhas que já estão aprovadas. Só troco as imagens do app depois do seu "aprovo".
6. **Textos dos níveis:** só ajusto as descrições se alguma não combinar com a imagem nova, nos 12 idiomas.

## O que não muda
- As imagens 0–18 e 160–366.
- Horas, níveis, regras de desbloqueio e a meta anual.
- O carregamento das imagens: continua mantendo a imagem atual até a próxima estar pronta.
- O painel do admin, que mostra a sequência inteira.

## Detalhes técnicos
- Arquivos em `src/assets/tree/stages/level-XXX.jpg`, com os mesmos nomes. Nenhuma mudança de código.
- Cada imagem é gerada pela edição da seguinte, que serve de referência para manter vaso, fundo e câmera.
- Antes de cada folha, faço uma checagem automática que mede a posição da borda do vaso, a altura e a largura da planta, e a nitidez.
- Depois de cada troca, rodo `achievementProgress.test.ts` e confiro `/achievements` com o Playwright.
