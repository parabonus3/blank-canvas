# Encerrar sessão no mobile: mapa por cima do bloco de notas

## O que está acontecendo

Nas duas telas enviadas, o mapa que aparece "flutuando" por cima do aviso e do campo de notas não é o mapa do modal: é o mapa do painel de corrida que continua na tela atrás do diálogo. O Leaflet cria camadas internas com z-index 400+, enquanto o diálogo usa z-index 50, e não existe nenhuma regra no CSS global corrigindo isso. Resultado: o mapa da página fura o modal e cobre o conteúdo.

## Correções

1. Rebaixar o Leaflet no CSS global: limitar as camadas internas do mapa (`.leaflet-pane`, controles, `.leaflet-top/bottom`) a valores baixos e isolar o container do mapa em seu próprio contexto de empilhamento, para que nenhum mapa da página consiga passar por cima de modais, popovers ou toasts. Vale para todos os mapas do app, não só este.
2. Enquanto o diálogo de encerrar sessão estiver aberto, o mapa ao vivo do painel de corrida deixa de ser renderizado (o painel continua mostrando os números). Evita dois mapas competindo e economiza processamento no celular.
3. Reorganizar o conteúdo do modal no mobile, com ordem previsível de cima para baixo: título → resumo da corrida (mini-mapa + distância/ritmo/tempo) → aviso de "distância aproximada" → projeto e tempo → campo de notas → etiquetas → botões. Sem sobreposição.
4. Rolagem vertical correta: corpo do modal com rolagem própria e altura máxima segura, cabeçalho e rodapé (Salvar e parar / Pular) fixos, respeitando a área segura do aparelho. O botão de salvar fica sempre visível.
5. Mapa do resumo com altura menor no mobile e sem foco automático no campo de notas, que hoje puxa o teclado e desloca o layout na abertura.
6. Desktop mantém o layout em duas colunas (resumo à esquerda, notas à direita), agora dentro da mesma estrutura de rolagem.

## Detalhes técnicos

- `src/index.css`: bloco de regras para `.leaflet-container` (`isolation: isolate`) e rebaixamento de `.leaflet-pane`, `.leaflet-control*`, `.leaflet-top`, `.leaflet-bottom`.
- `src/components/StopTimerDialog.tsx`: estrutura em três partes (header fixo / área com `overflow-y-auto` / footer fixo), `max-h-[90dvh]`, `pb` com `env(safe-area-inset-bottom)`, mapa `h-32 sm:h-52`, remoção do `autoFocus` do textarea.
- `src/pages/Index.tsx` e `src/components/rooms/RoomTimerCard.tsx`: passar um flag (ex.: `hideMap`) ao `RunLivePanel` quando o diálogo de encerramento estiver aberto.
- `src/components/gps/RunLivePanel.tsx`: prop opcional `hideMap` que suprime o `LazyRouteMap`.
- Sem mudanças de dados, de rastreamento GPS ou de salvamento da sessão.
