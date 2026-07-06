## Objetivo

1. **Timer isolado por desafio** — o usuário escolhe 1 desafio antes de iniciar; o tempo só conta nesse desafio.
2. **UI limpa** para salas com muitos desafios/membros — tabela unificada (1 linha por membro, 1 coluna por desafio) em vez de repetir a estrutura N vezes.
3. **Mobile-first e responsivo**, sem quebrar nada que já funciona.

---

## Parte A — Contagem do timer por 1 desafio escolhido

### Mudança de dados
- Adicionar coluna nullable `challenge_id uuid REFERENCES public.room_challenges(id) ON DELETE SET NULL` em `public.time_entries`.
- Index parcial: `(room_id, user_id, challenge_id) WHERE challenge_id IS NOT NULL`.

### Mudança de regra (função `record_room_challenge_progress`)
- Nova assinatura aceita `_challenge_id uuid DEFAULT NULL`.
- Comportamento:
  - Se `_challenge_id IS NOT NULL` → credita **apenas** aquele desafio (validando que pertence à sala, está ativo e dentro da janela).
  - Se `_challenge_id IS NULL` → mantém o loop atual (retrocompatível com sessões antigas/manuais sem seleção).
- Trigger `trg_time_entry_room_progress` passa `NEW.challenge_id`.

### UI do Timer
- Quando `roomId` está selecionado, mostrar um **seletor compacto de desafio** logo abaixo do `RoomPicker`:
  - Lista com emoji + título + "faltam Xmin hoje" dos desafios ativos onde o usuário é membro.
  - Opção "Nenhum desafio (só treino livre)".
  - Persistir escolha em `localStorage` por sala (`timezoni:room:{roomId}:challenge`).
  - Auto-selecionar único desafio ativo quando só existe 1 (evita fricção).
- `TimerContext` / `PomodoroContext` recebem `challengeId` e enviam junto no insert de `time_entries`.
- `RoomChallengeBanner` passa a destacar **só o desafio escolhido** (com badge "ativo agora"); os outros ficam como cards secundários "não contabilizando".

### Retrocompatibilidade
- Sessões antigas continuam válidas (creditam todos, como hoje).
- Nada muda para quem tem apenas 1 desafio na sala.

---

## Parte B — Layout unificado dos desafios (fim da repetição)

Novo componente `RoomChallengesMatrix.tsx` substitui a lista repetida de `ChallengeRow` grid-de-membros.

### Desktop (≥ md)
Tabela sticky com scroll horizontal quando necessário:

```text
                │ 📖 Leitura │ 🙏 Oração │ 💻 Estudo │ Total hoje
────────────────┼────────────┼───────────┼───────────┼───────────
👤 Nicky   🔥65 │  ✅ 25/25  │  ⏳ 6/10  │  ⏳ 0/60  │  31 / 95
👤 Cecilia      │  ⏳ 0/25   │  ⏳ 0/10  │  ✅ 60/60 │  60 / 95
👤 Manoel       │  ⏳ 15/25  │  ✅ 10/10 │  ⏳ 20/60 │  45 / 95
...
Bateram meta    │  8/18      │  12/18    │  3/18     │
```

- **1ª coluna sticky (membro)**: avatar + nome + streak; clique abre `MemberProfileModal`.
- **Cabeçalho sticky** com emoji, título, min-alvo, % da sala que bateu, botão editar/deletar (owner).
- **Célula** = mini-donut/barra + `Xm/Ym` + ícone de estado (✅ concluído, ⏳ em andamento, ⚪ não começou, ⚠️ dias sem cumprir). Clique abre `ChallengeCalendarModal` daquele membro naquele desafio.
- Linha de rodapé com total de "bateram meta hoje" por desafio.
- Ordenação padrão: quem completou mais desafios hoje primeiro, empate por tempo total do dia.

### Mobile (< md)
Duas visões via `Tabs`:

1. **Por desafio** (default) — carrossel horizontal com `snap`. Cada slide = 1 desafio com progresso da sala + lista compacta de membros (avatar + barrinha + status). Indicadores de página (● ○ ○) no topo. Owner tem editar/deletar no cabeçalho do slide.
2. **Por membro** — accordion: cada membro é uma linha; expande e mostra chips de todos os desafios com progresso.

Ambas usam os mesmos dados do RPC atual (`get_room_challenges_with_status`) — zero mudança no backend para essa parte.

### Extras de UX
- Filtro rápido no topo: "Todos / Bateram hoje / Faltam bater / Não começaram".
- Busca por nome (aparece quando há > 10 membros).
- Legenda dos ícones em tooltip (`?` no cabeçalho).
- Skeleton loader.
- Empty state amigável para owner (com CTA "criar 1º desafio").

---

## Parte C — Arquivos afetados

**Novos**
- `supabase/migrations/<ts>_time_entries_challenge_id.sql` — coluna + trigger + função atualizada.
- `src/components/rooms/RoomChallengesMatrix.tsx` — nova UI (desktop + mobile).
- `src/components/rooms/ChallengeMemberCell.tsx` — célula reutilizável.
- `src/components/timer/RoomChallengePicker.tsx` — seletor de desafio ativo.

**Editados**
- `src/components/rooms/RoomChallengesCard.tsx` — passa a renderizar `RoomChallengesMatrix` (mantém cabeçalho da seção, janela de rollover, botão "Novo desafio", `CreateChallengeDialog`).
- `src/contexts/TimerContext.tsx` e `src/contexts/PomodoroContext.tsx` — receber/enviar `challenge_id` no insert.
- `src/components/timer/RoomChallengeBanner.tsx` — destacar o escolhido.
- `src/hooks/useRoomChallenges.ts` — expor tipo com `challenge_id` selecionado (helper client-side).
- `src/integrations/supabase/types.ts` — regenerado automaticamente após a migração.

**Sem mudança**
- RPCs de leitura, RLS, `record_room_challenge_progress` (só ganha parâmetro opcional), preferências de notificação, chat.

---

## Parte D — Rollout seguro

1. Migração adiciona coluna nullable + função com parâmetro default → **zero downtime**.
2. Deploy do frontend: novo picker aparece; sessões sem escolha continuam creditando todos (comportamento antigo). 
3. Trocar `RoomChallengesCard` pela matriz.
4. Após 1 semana, opcional: default do picker passa a "Nenhum desafio" para forçar escolha consciente.

---

## Detalhes técnicos (para dev)

- Índice: `CREATE INDEX idx_time_entries_challenge ON public.time_entries(challenge_id) WHERE challenge_id IS NOT NULL;`
- Validação no trigger: se `NEW.challenge_id` pertence a outra sala ou está inativo, ignora silenciosamente (log via `RAISE NOTICE`).
- `RoomChallengesMatrix`: `overflow-x-auto` + `min-w-max` na tabela; primeira coluna `sticky left-0 bg-card z-10`.
- Célula usa `role="button"` + `aria-label` com "Membro X — Desafio Y — 25 de 60 min".
- Tabs mobile persistem escolha em `localStorage`.
- Query já retorna todos os dados necessários; matriz é derivada em memória (`useMemo`).
