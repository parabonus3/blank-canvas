# Modo corrida: por que parou de salvar e como corrigir

## O que eu confirmei (não é suposição)

1. No banco existem apenas 2 corridas salvas, ambas de hoje: 16:53 (305 m, 15 pontos) e 17:11 (111 m, 8 pontos). Depois disso, nada foi gravado.
2. Essas duas foram salvas **antes** do último ajuste anti-drift do GPS. Desde então, nenhuma nova.
3. Na sua captura de tela o painel ao vivo mostra **0 m / 1 ponto / sinal regular (±21 m)** com o cronômetro rodando — ou seja, o rastreador está descartando praticamente todos os fixes.

## Causa

O pacote de filtros anti-drift ficou agressivo demais e passou a bloquear a **gravação de pontos**, não só a contagem de distância:

- O limiar de deslocamento é `0,7 × precisão`. Com sinal de ±21 m (comum em celular), cada ponto novo precisa estar a mais de ~15 m do anterior para ser sequer registrado.
- Há também corte por velocidade mínima (0,7 m/s) e uso de `coords.speed`, que em muitos aparelhos vem nulo ou próximo de zero.
- Resultado: a lista de pontos fica com 1 único ponto.

Isso encadeia os dois sintomas que você viu:

- **Mapa não aparece ao salvar**: o diálogo "Encerrar sessão" só monta o mapa quando existem mais de 1 ponto.
- **Nada no histórico**: ao parar, o resumo é descartado quando há menos de 2 pontos ou menos de 50 m, e isso acontece **em silêncio** — o app nem salva nem avisa.

## Correção

### 1. Separar "traçar rota" de "contar distância"
O ponto passa a ser sempre gravado quando o fix é aceitável (precisão dentro do limite), com uma cadência mínima de tempo. A distância continua com filtro rígido (para você parado não ganhar quilômetros fantasmas), mas o traçado deixa de ficar vazio. Cada ponto guarda se foi contado ou não.

### 2. Limiares realistas
- Limiar de deslocamento com teto: nunca exigir mais de ~12 m, mesmo com precisão ruim.
- Baixar a velocidade mínima para valores de caminhada e só usar `coords.speed` como sinal auxiliar quando o aparelho realmente informa um valor válido.
- Manter o warm-up, mas com prazo fixo, sem depender de precisão excelente.

### 3. Nunca falhar em silêncio
- Se a sessão tiver traçado mas pouca distância, a corrida **é salva** (o histórico é seu registro).
- Se não houver traçado nenhum (GPS negado / sem sinal), mostrar um aviso claro no diálogo de encerramento: "sem sinal suficiente para registrar o trajeto".
- Logar no console o motivo do descarte, para diagnóstico futuro.

### 4. Mapa sempre visível ao encerrar
O diálogo passa a exibir o bloco de corrida sempre que o modo corrida estava ativo: mapa quando há traçado, ou um cartão de estado ("trajeto insuficiente") quando não há. Layout com rolagem vertical e rodapé fixo permanece como está.

### 5. Transparência no painel ao vivo
Mostrar contagem de pontos gravados e um aviso quando o sinal está fraco por muito tempo, para você saber na hora se o trajeto está sendo captado.

## Arquivos afetados

- `src/hooks/useGpsTracker.ts` — separação registro/distância, limiares com teto, motivo de descarte no retorno de `stop()`.
- `src/components/StopTimerDialog.tsx` — bloco de corrida sempre presente, com estado vazio.
- `src/pages/Index.tsx` e `src/components/rooms/RoomTimerCard.tsx` — salvar quando houver traçado; toast informativo quando não houver.
- `src/components/gps/RunLivePanel.tsx` — pontos e aviso de sinal.
- Arquivos de tradução (12 idiomas) — novas chaves de aviso.

## Fora do escopo

Nenhuma mudança de banco de dados: a tabela `gps_activities` está correta e as duas corridas existentes continuam intactas.
