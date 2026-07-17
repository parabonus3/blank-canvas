## Problemas identificados

### 1. Badge de ranking semanal com texto quebrado (`#2 #{{n}} sem`)
`RoomChallengesMatrix.tsx:659` renderiza:
```tsx
#{weekRank} {t("rooms.challenges.pos_week_short", "sem")}
```
Mas a chave `rooms.challenges.pos_week_short` no `pt-BR.json` já vale `"#{{n}} sem"` (com o próprio `#n` dentro). Resultado: `#2` (do JSX) + `#{{n}} sem` (string bruta, `n` nunca interpolado) → `#2 #{{n}} sem`. Nas outras línguas onde a chave não existe, cai no defaultValue `"sem"` e mostra só `#2 sem` — mas é acidental.

**Correção:** deixar o `t()` responsável pelo prefixo e passar `n` como variável.
```tsx
{t("rooms.challenges.pos_week_short", { n: weekRank, defaultValue: "#{{n}} sem" })}
```

### 2. Textos sem tradução em várias línguas
Chaves que hoje só existem em `pt-BR` (ou nem existem) e caem no defaultValue português:
- `rooms.room_timer_helper_with_challenge` — "Ao iniciar aqui, seu tempo conta para o ranking, o streak desta sala e para o desafio: {{names}}."
- `rooms.room_timer_helper_room_only` — "Ao iniciar aqui, seu tempo conta para o ranking e o streak desta sala."
- `rooms.challenges.room_day` — "Dia da sala"
- `rooms.challenges.rollover_in` — "vira em"
- `rooms.challenges.pos_week_short` — "#{{n}} sem" (abreviação de "semana")

Vou adicionar todas nos 12 locales (pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ja-JP, ko-KR, zh-CN, ar-SA, ru-RU, id-ID) com traduções naturais em cada idioma (ex.: en `"Room day"` / `"rolls over in"` / `"#{{n}} wk"`; ja `"ルームの日付"` / `"リセットまで"` / `"週#{{n}}"`; etc.).

### 3. Fora de escopo
- Não mexo em layout, estilos, cores, lógica de negócio, RPCs ou banco.
- Não removo/renomeio chaves existentes.

## Arquivos alterados
- `src/components/rooms/RoomChallengesMatrix.tsx` (1 linha: badge do rank semanal)
- `src/i18n/locales/*.json` (12 arquivos: adicionar 5 chaves em `rooms.*` / `rooms.challenges.*`)

## Verificação
- `tsgo` para checar tipos.
- Trocar o idioma para JA/EN e confirmar que o helper do timer, "Dia da sala · vira em …" e o badge `#2 sem` aparecem traduzidos e sem `{{n}}` cru.
