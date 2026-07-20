
## Problemas identificados

1. **Bug de tradução — `{{challenges}}` aparece literal**
   Em `src/components/rooms/RoomTimerCard.tsx:172`, a chave `rooms.room_timer_counts_challenge` foi projetada como frase longa com `{{challenges}}`, mas está sendo usada como *prefixo* de um chip (`{t(...)}: {challengeNames}`). Como não passamos `{ challenges }` no `t()`, o i18next renderiza `{{challenges}}` literalmente — foi exatamente o que apareceu no print. Além disso, o helper box logo abaixo (linhas 271–286) repete a mesma informação com outra chave (`room_timer_helper_with_challenge`), inflando o card no mobile.

2. **Helper text ocupa muito espaço no mobile**
   O bloco `Info` de 2–3 linhas + o chip "+ desafio: nome, nome" duplicam a mensagem. Em japonês/coreano/alemão a frase estoura o card.

3. **"Dia da sala: 19 de jul" em 20 de jul**
   `get_room_today_window` retorna o dia calculado no **fuso do dono da sala** (`get_room_timezone` → `profiles.timezone` do owner). Se o dono está num fuso onde ainda é dia 19, membros em outros fusos veem "19". Isso é *tecnicamente correto* (o desafio precisa de um único "dia da sala" comum), mas o rótulo atual induz o usuário a achar que é o dia dele. O texto e o tooltip precisam deixar claro que é o fuso da sala, e o rollover precisa aparecer só quando fizer sentido.

## Mudanças (frontend apenas — sem tocar em RPC/DB)

### A. Corrigir o chip do timer + colapsar o helper (mobile-first)

`src/components/rooms/RoomTimerCard.tsx`

- **Remover o helper box duplicado** (linhas 271–286). A informação "conta para ranking/streak/desafio" já está nos dois chips de status logo acima.
- **Reescrever o chip do desafio** para não depender da chave interpolada quebrada:
  - Trocar `t("rooms.room_timer_counts_challenge", ...)` por uma chave curta nova `rooms.room_timer_chip_challenge` = "Desafio" (todas as 12 línguas), renderizando `Desafio · {challengeNames}` fora do `t()`.
  - Truncar `challengeNames` com `line-clamp-1` + `title={challengeNames}` para tooltip.
- No estado "start" (linhas 261–286), substituir o box grande por **um único chip discreto** (mesmo padrão visual dos chips de status), com a mesma chave curta acima. Assim o botão "Iniciar" fica sempre visível na dobra.

### B. Rótulo do "Dia da sala" mais claro + traduções

`src/components/rooms/RoomChallengesCard.tsx` (linha ~126)

- Trocar `"Dia da sala"` por `"Dia da sala ({{tz}})"` com abreviação curta do fuso (ex: `America/Sao_Paulo` → `Sao_Paulo`, ou `GMT-3`). Adicionar `title` no elemento com a frase completa: *"Todos os membros compartilham este dia baseado no fuso do dono da sala"*.
- Se `seconds_until_rollover < 6h`, mostrar o badge "vira em Xh Ym" com destaque; caso contrário, esconder para reduzir ruído no mobile.
- Formatar a data com `Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: todayWindow.timezone })` para respeitar o idioma.

### C. i18n — adicionar/ajustar chaves nas 12 línguas

Em `src/i18n/locales/*.json` (pt, en, es, fr, de, it, ja, ko, zh, ar, ru, id):

- `rooms.room_timer_chip_challenge` = "Desafio" (nova, curta).
- `rooms.room_day_tz` = "Dia da sala ({{tz}})" (nova).
- `rooms.room_day_tz_hint` = "Todos os membros compartilham este dia (fuso do dono da sala)".
- **Manter** `rooms.room_timer_counts_challenge` e `room_timer_helper_with_challenge` no JSON para não quebrar builds antigos em cache, apenas deixamos de referenciá-las.

## Detalhes técnicos

```text
RoomTimerCard.tsx
├── remove <div className="flex items-start gap-1.5 rounded-md bg-muted/40 …"> helper box
├── chip do desafio:  {hasChallenge && (
│      <span className="… max-w-full">
│        <Trophy /> {t("rooms.room_timer_chip_challenge")} ·
│        <span className="truncate" title={challengeNames}>{challengeNames}</span>
│      </span>)}
└── mesmo tratamento no bloco "start" (substitui o box longo)

RoomChallengesCard.tsx
├── label = t("rooms.room_day_tz", { tz: shortTz(todayWindow.timezone) })
├── data = Intl.DateTimeFormat(i18n.language, { day:'numeric', month:'short', timeZone: todayWindow.timezone }).format(new Date())
└── rollover badge só quando seconds_until_rollover < 21600
```

Sem migração SQL, sem mudança de contrato de RPC, sem risco para o ranking/desafios existentes.

## Validação

1. Trocar idioma para JA / KO / DE e confirmar que o chip do desafio não estoura no mobile (viewport 375px).
2. Confirmar que `{{challenges}}` não aparece mais literal em nenhum idioma.
3. Confirmar que a data mostrada no card de desafios usa formato local do idioma e o rótulo indica o fuso.
