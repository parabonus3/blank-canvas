# Modo corrida: resumo ao parar + precisão aproximada

Dois problemas: ao parar o cronômetro, o modal cobre/corta o mapa e a pessoa não vê como foi o percurso; e o GPS acumula distância mesmo quando você está parado (305 m e ritmo 9:53 em casa).

## 1. Resumo da corrida dentro do modal "Encerrar sessão"

Hoje o modal mostra só projeto, tempo, notas e etiquetas — o mapa fica atrás dele, cortado.

- Quando a sessão tem trajeto GPS, o modal passa a exibir, no topo, um bloco de resumo: mini-mapa do percurso completo (não em modo "follow", com o traçado inteiro enquadrado) + distância, ritmo médio e tempo.
- Mobile: bloco em coluna, mapa com altura fixa baixa (~140 px), conteúdo do modal com rolagem interna e altura máxima segura (85% da tela), botões fixos no rodapé.
- Desktop: modal um pouco mais largo, mapa e estatísticas lado a lado.
- Sem trajeto (sessão normal) o modal continua exatamente como é hoje.

## 2. Deixar claro que é aproximado

- Selo/aviso curto no resumo e no painel ao vivo: "Distância aproximada — depende do sinal do GPS".
- Uma linha explicativa no modal de detalhes da corrida e no painel ao vivo dizendo que o traçado é uma estimativa do celular, não o percurso exato, e que sinal fraco pode gerar variação.
- Mostrar a precisão atual em metros com cor (bom / regular / fraco) para a pessoa entender quando confiar no número.

## 3. Reduzir a distância "fantasma" (parado)

Ajustes no rastreador para não somar oscilação do GPS:

- Limiar de distância dependente da precisão: um novo ponto só entra e só soma distância se o deslocamento for maior que a incerteza do fix (ex.: maior valor entre 8 m e ~0,7x a precisão informada). Fixes de 15–30 m de precisão param de gerar passos de 5 m.
- Filtro de velocidade mínima: deslocamentos com velocidade abaixo de ~0,7 m/s (ritmo mais lento que caminhada bem lenta) são tratados como ruído e não somam distância.
- Uso de `coords.speed` quando o aparelho informa: se a velocidade reportada é ~0, o ponto não soma distância.
- Aquecimento do sinal: os primeiros segundos (até a precisão estabilizar, máx. ~10 s) servem apenas para fixar a posição inicial, sem acumular distância.
- Suavização leve da posição (média ponderada pela precisão entre o ponto anterior e o novo) para o traçado ficar menos "serrilhado".
- Ritmo médio só é calculado a partir de um mínimo de distância confiável (ex.: 100 m); abaixo disso mostra "--:--" em vez de um ritmo sem sentido.
- Corrida com distância final irrelevante (< ~50 m) é salva como sessão sem trajeto, evitando registros de 300 m parado.

Nada disso muda os dados já salvos nem quebra o fluxo atual: pausa, retomada e salvamento continuam iguais.

## 4. Traduções

Novas chaves (aviso de aproximação, qualidade do sinal, rótulos do resumo) nos 12 idiomas.

## Detalhes técnicos

- `src/hooks/useGpsTracker.ts`: novos filtros (limiar por precisão, velocidade mínima, warm-up, suavização), expor `accuracyQuality`; `paceFrom` com mínimo maior em `src/lib/geo.ts`.
- `src/components/StopTimerDialog.tsx`: props opcionais `runPoints`, `runDistance`, `runPace`; `DialogContent` com `max-h-[85dvh] overflow-y-auto` e grid responsivo; mapa via `LazyRouteMap` (`interactive={false}`, `follow={false}`).
- `src/pages/Index.tsx` e `src/components/rooms/RoomTimerCard.tsx`: passar os dados do rastreador para o modal antes de encerrar.
- `src/components/gps/RunLivePanel.tsx` e `RunDetailModal.tsx`: selo de aproximação e qualidade do sinal.
