# Modo Corrida: cronômetro + trajeto no mapa (100% grátis, sem API key)

## A solução inteligente

Não precisamos de Google Maps nem de nenhuma chave de API. A combinação certa é:

1. **GPS do próprio navegador** — a API `navigator.geolocation.watchPosition()` é nativa, gratuita e funciona em Android/iOS via PWA. Ela devolve latitude, longitude, precisão, altitude e velocidade a cada poucos segundos. É ela que grava o trajeto.
2. **Leaflet + tiles do OpenStreetMap** — Leaflet é a biblioteca de mapa open source (sem chave). Os tiles padrão do OpenStreetMap são gratuitos e suficientes para uso normal do app. Leaflet desenha o trajeto como uma linha (polyline) sobre o mapa, com marcador de início e fim. Sim, o Leaflet faz exatamente isso: não precisa de "rota calculada", nós apenas ligamos os pontos que o GPS gravou — o traçado real do que a pessoa correu.
3. **Distância e ritmo calculados no cliente** — fórmula de Haversine entre pontos consecutivos. Dá distância total, ritmo médio (min/km), velocidade e ganho de elevação sem nenhum serviço externo.

Ou seja: a pessoa escolhe o projeto/categoria (ex. "Corrida"), liga o cronômetro como já faz hoje, e o app grava em paralelo o trajeto. Ao parar, ela vê tempo + distância + ritmo + mapa do percurso, e tudo fica no histórico.

### Alternativas consideradas
- **MapLibre GL** (vetorial, mais bonito): os estilos gratuitos bons quase sempre exigem chave (MapTiler etc.). Fora do critério "sem key".
- **Google/Mapbox**: exigem chave e cartão. Descartados.
- Leaflet + OSM é a única combinação realmente livre de chave e madura.

## O que a pessoa vai ver

- No Timer, um **botão "Modo corrida"** (só aparece se o navegador tiver GPS). Ao ligar, o cronômetro roda igual hoje, e aparece um painel ao vivo: tempo, distância, ritmo atual, e um mini-mapa com a linha crescendo.
- Ao parar, um resumo: mapa do trajeto completo, distância, ritmo médio, melhor km, elevação.
- **Histórico completo**: nova aba/seção "Corridas" com lista de todas as atividades com GPS (data, distância, tempo, ritmo, miniatura do trajeto). Clicando, abre o detalhe com mapa grande, gráfico de ritmo/elevação e divisão por quilômetro (splits).
- Totais acumulados: km no mês, km no ano, corrida mais longa, melhor ritmo.

## Pontos delicados (tratados no plano)

- **Tela apagada / app em background**: no celular o GPS é pausado pelo sistema quando a tela apaga. Tratamento: manter a tela acesa durante a corrida com **Wake Lock API** (nativa, grátis), avisar a pessoa para manter o app aberto, e nunca perder dados — os pontos são salvos localmente (IndexedDB/localStorage) a cada leitura e sincronizados; se o app fechar, ao reabrir oferecemos "retomar corrida em andamento".
- **Precisão ruim**: pontos com `accuracy` acima de ~35 m e saltos impossíveis (velocidade > 12 m/s) são descartados, mais uma leve suavização, para o traçado não ficar cheio de zigue-zague.
- **Permissão negada**: o cronômetro continua funcionando normal, apenas sem trajeto — nada quebra.
- **Volume de dados**: gravamos no máximo 1 ponto a cada ~5 s / 10 m e simplificamos o traçado antes de salvar, então cada corrida fica pequena (poucos KB).

## Detalhes técnicos

**Banco (nova migração)**
- `gps_activities`: `id`, `user_id`, `time_entry_id` (FK → `time_entries`, único), `project_id`, `started_at`, `ended_at`, `distance_meters`, `moving_seconds`, `avg_pace_seconds_per_km`, `elevation_gain_meters`, `max_speed`, `points` (jsonb: array compacto `[lat, lng, t, alt]`), `bounds` (jsonb), `source` ('browser'), timestamps.
- GRANTs: `SELECT/INSERT/UPDATE/DELETE` para `authenticated`, `ALL` para `service_role` (sem `anon`); RLS habilitado; 4 políticas escopadas em `auth.uid() = user_id`; trigger de `updated_at`.
- Índices por `user_id, started_at desc` e por `time_entry_id`.

**Dependências**: `leaflet` + `react-leaflet` + `@types/leaflet` (todas open source, sem key). Tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` com atribuição obrigatória do OSM no mapa.

**Código novo**
- `src/hooks/useGpsTracker.ts` — `watchPosition`, filtro de precisão, buffer local, cálculo incremental de distância/ritmo, Wake Lock, recuperação de sessão interrompida.
- `src/lib/geo.ts` — Haversine, simplificação (Douglas–Peucker), splits por km, elevação, formatação de ritmo.
- `src/hooks/useGpsActivities.ts` — salvar ao parar, listar histórico, agregados mensais/anuais.
- `src/components/gps/RouteMap.tsx` (mapa + polyline + marcadores), `RunLivePanel.tsx` (painel ao vivo no Timer), `RunSummaryCard.tsx`, `RunDetailModal.tsx` (mapa grande + splits + gráfico via recharts, já no projeto).
- `src/pages/Runs.tsx` + rota e item de menu na Sidebar; card de resumo também no Histórico.

**Integração com o que já existe (sem quebrar nada)**
- O fluxo de `useStartTimer`/`useStopTimer` e as RPCs de tempo **não mudam**. O rastreamento é uma camada opcional por cima: ao parar o cronômetro, salvamos a atividade GPS referenciando o `time_entry_id` retornado.
- Funciona também no `RoomTimerCard` (correr contando para sala/desafio) reusando o mesmo hook.
- Mapa e Leaflet carregados por `lazy`/dynamic import, para não pesar o bundle de quem não usa.

**Mobile-first e i18n**: painel ao vivo com números grandes e um único botão primário; mapa com altura adaptativa; todas as strings novas adicionadas nos 12 idiomas do projeto.

## Ordem de execução

1. Migração `gps_activities` (tabela, grants, RLS, trigger, índices).
2. `src/lib/geo.ts` + `useGpsTracker.ts` (núcleo, sem UI).
3. `RouteMap.tsx` + integração do modo corrida no Timer (ao vivo + salvar no stop).
4. Página "Corridas" com histórico, detalhe, splits e agregados.
5. Reuso no timer de salas + traduções nos 12 idiomas.
