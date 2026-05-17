## Problema

No `AnimatedClock` (src/pages/Landing.tsx, linhas 57–109) os ponteiros são `<motion.line>` com `style={{ originX: "100px", originY: "100px" }}`. Em SVG, `originX/originY` do framer-motion são interpretados como fração do bounding box do próprio elemento — e uma `<line>` vertical tem largura 0. Resultado: o pivô fica fora do centro do relógio e o ponteiro "voa" para fora do mostrador ao girar.

Além disso, a animação atual é só "girar em loop linear", sem hierarquia visual nem refinamento.

## Correção técnica

Trocar o pivô para algo confiável em SVG:

- Envolver cada ponteiro em um `<motion.g>` e rotacionar o grupo.
- Aplicar `style={{ transformOrigin: "100px 100px", transformBox: "view-box" }}` (suporte cross-browser para SVG aninhado).
- Manter as `<line>` desenhadas a partir de `(100,100)` para cima, sem `originX/originY` em pixel.

Isso garante que o pivô seja exatamente o centro do mostrador e os ponteiros nunca saiam do relógio.

## Melhorias da animação (Apple/B&O level, sem libs novas)

1. **Hora real**: ler `new Date()` e calcular ângulos iniciais reais (h/m/s) — relógio começa "vivo", não em 12:00.
2. **Ponteiro de segundos com tick suave**: substituir `ease: linear` por uma animação por `requestAnimationFrame` que avança ~6° por segundo com pequeno overshoot (spring sutil) — sensação de mecanismo fino, não relógio digital.
3. **Hierarquia visual dos ponteiros**:
   - Hora: mais curto (y2≈70), grosso, branco quente, com leve gradiente.
   - Minuto: médio (y2≈48), branco puro.
   - Segundos: fino, ciano, com glow sutil (`filter: drop-shadow`).
4. **Anel orbital**: 3 pontos pequenos ciano percorrendo a borda em velocidades diferentes (parallax circular), reforçando "tempo em movimento".
5. **Pulso central**: o círculo central pulsa de 5→5.6 em loop respiratório (3s, easeInOut).
6. **Glow respirando**: opacidade do `radialGradient` oscila levemente (0.35↔0.5) sincronizada com o pulso.
7. **Parallax no scroll mais sutil**: reduzir rotate global de 60° → 8° e scale 1→0.92 (evita sensação de "tombando").
8. **Reduced motion**: se `prefers-reduced-motion`, congelar ponteiros na hora atual e desligar pulse/orbital.

## Arquivos

- `src/pages/Landing.tsx`: reescrever apenas a função `AnimatedClock` (linhas 57–109). Nenhuma outra seção, rota, i18n ou backend muda.

## Fora do escopo

Outras seções do Landing, traduções, libs novas, mudanças no app autenticado.
