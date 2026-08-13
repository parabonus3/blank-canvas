# Corrigir o Modo Corrida (tela branca + painel que desaparece)

## O que está causando a tela branca

O mapa usa `react-leaflet` na versão 5, que só funciona com React 19. Este projeto está em React 18. Enquanto o GPS ainda não tem ponto nenhum, o mapa não é montado — por isso tudo parece normal. No instante em que o sinal fica bom e o primeiro ponto chega, o mapa monta, quebra o render e a tela fica branca (e nada mais abre até recarregar).

Isso explica exatamente o comportamento relatado: "quando temos o local correto ele dá sinal forte e some, fica em tela branca".

## Correções

1. **Mapa compatível com React 18**
   - Trocar `react-leaflet` v5 por `react-leaflet` v4.2.1 (versão oficial para React 18), mantendo o mesmo componente `RouteMap` e os tiles gratuitos do OpenStreetMap.

2. **Nunca mais tela branca**
   - Envolver o mapa em um limite de erro próprio: se o mapa falhar por qualquer motivo, aparece um aviso pequeno no lugar do mapa e o cronômetro/GPS continuam funcionando normalmente.

3. **Pausa não pode matar a corrida**
   - Ao pausar o cronômetro, o rastreamento entra em pausa (para de acumular distância) em vez de terminar; ao retomar, volta a gravar do mesmo trajeto.
   - O painel de corrida continua visível durante a pausa, com o rótulo "Pausado", mostrando distância e trajeto já feitos.

4. **Poder reabrir/ocultar o painel**
   - O painel ganha um botão de recolher/expandir e, se estiver recolhido (ou se o GPS tiver falhado), aparece um botão "Modo corrida" no cartão do cronômetro para reativar/reabrir o rastreamento a qualquer momento durante a sessão — hoje o toggle só existe antes de dar play.
   - Se a permissão foi negada, o botão permite pedir permissão novamente.

## Detalhes técnicos

- `package.json`: `react-leaflet` → `^4.2.1` (mantém `leaflet` ^1.9.4 e `@types/leaflet`).
- `src/components/gps/LazyRouteMap.tsx`: adicionar um error boundary de classe em volta do `Suspense` com fallback discreto.
- `src/components/gps/RouteMap.tsx`: revisar props conforme a API v4 (sem mudanças de comportamento) e garantir remontagem segura via `key` estável.
- `src/hooks/useGpsTracker.ts`: adicionar `pause()` e `resume()` (limpar/recriar o `watchPosition`, congelar o cálculo de distância e deslocar a base de tempo do ponto seguinte para não inflar o ritmo), expor `isPaused`.
- `src/pages/Index.tsx`: sincronizar `handlePause`/`handleResume` com `gps.pause()`/`gps.resume()`; mostrar `RunLivePanel` enquanto houver `activeEntry` e corrida ativa (não só quando `isTracking`); expor controle de expandir/recolher e o botão de ativar o modo corrida com a sessão já em andamento.
- `src/components/gps/RunLivePanel.tsx`: estado "Pausado", cabeçalho clicável para recolher.
- `src/components/rooms/RoomTimerCard.tsx`: mesma sincronização de pausa, se o modo corrida estiver ativo ali.
- Strings novas ("Pausado", "Ocultar mapa", "Ativar modo corrida", erro de mapa) nos 12 idiomas.

## Verificação

- Simular no navegador: iniciar com modo corrida, injetar coordenadas via Playwright/geolocation mock, confirmar que o mapa renderiza sem quebrar, pausar/retomar e parar salvando a atividade.
