## Objetivo

Três melhorias focadas em clareza, competitividade e limpeza visual, todas responsivas (mobile-first):

1. Deixar óbvio quando existem múltiplos desafios ativos e qual está selecionado (no timer e na sala).
2. Trocar o ranking "por dia" implícito por uma lista de ranking clara com padrão semanal.
3. Remover o placeholder "Em foco agora" que não tem mais função.

Nada muda no backend — só camada de UI/UX.

---

## 1. Picker de desafio (Timer + Sala)

### Problema
Hoje é um `<Select>` fino que mostra apenas o desafio ativo. Quando há 2+ desafios, o usuário não percebe a alternância nem vê o progresso comparado.

### Solução — "Chip cards" horizontais rolantes

Substituir o `<Select>` de `src/components/timer/RoomChallengePicker.tsx` por uma faixa de cards curtos (chips grandes), 1 por desafio, todos visíveis ao mesmo tempo:

```
┌─────────────────────┐  ┌─────────────────────┐
│ 🙏 Oração diária    │  │ 📖 Leitura bíblica  │
│ OBRIGATÓRIO         │  │                     │
│ ▓▓▓░░░░ faltam 10m  │  │ ░░░░░░░ faltam 10m  │
│ ✓ Selecionado       │  │  Tocar p/ escolher  │
└─────────────────────┘  └─────────────────────┘
```

Regras:
- Cada card mostra emoji, título, barra de progresso do período atual, tempo restante ou ✓ concluído.
- Card selecionado ganha `ring-2 ring-primary`, fundo `bg-primary/10`, badge "Selecionado" e ícone check.
- Cards não selecionados ficam com `opacity-70` e borda neutra.
- Se houver 1 só desafio, mostra o card único em largura total (sem chips laterais).
- Layout responsivo: `flex overflow-x-auto snap-x snap-mandatory gap-2` no mobile (rola horizontal com snap), `grid grid-cols-2 xl:grid-cols-3` no desktop.
- Cabeçalho pequeno acima: "Escolha o desafio desta sessão — {n} disponíveis · Obrigatório".
- Persistência atual (localStorage por sala) e auto-seleção do primeiro continuam iguais.

### Onde replicar na sala
O `RoomChallengesCard` já lista todos os desafios em chips (topo do card, `ChallengeSummaryChips`), mas os chips lá são só resumo agregado (não selecionáveis). Não precisa refazer isso — o painel da sala é dashboard, não seletor de sessão. **Ação:** só melhorar o contraste do chip ativo/inativo (`is_ended`) já implementado e ajustar espaçamento no mobile (usar `gap-2`, chip mínimo `min-w-[140px]` com scroll horizontal).

Onde há seletor de desafio dentro da sala (dropdown/aba de escolha por membro): validar se `RoomChallengePicker` também é usado em contexto de "iniciar timer dentro da sala". Se for, ele já herda o novo layout.

---

## 2. Ranking com foco no período (padrão: Semana)

### Problema
`RoomRankingSidebar` já tem tabs (Hoje / Semana / Mês / Todos), mas abre em **"Todos"** por padrão, o que camufla quem está bombando na semana. E a matrix de desafios ordena membros por progresso do dia — quem lidera a semana não aparece em destaque.

### Solução

**A. Padrão semanal no ranking**
- `src/components/rooms/RoomRankingSidebar.tsx`: mudar `useState<Period>("all")` → `useState<Period>("week")`.
- Reordenar tabs para: `Semana · Hoje · Mês · Todos` (semana primeiro).
- Adicionar chip "🔥 Líder da semana" no topo do card quando `period === "week"` com nome do 1º colocado.

**B. Destaque visual dos top-3 em qualquer período**
- Manter os ícones Trophy/Medal/Award para top-3.
- Adicionar barra fina de progresso relativa (`% do líder`) em cada linha para dar noção de distância — já temos `distance_to_next` só para o "eu"; expandimos visualmente para todos.
- Linha do usuário logado continua com `bg-primary/5` + label "(você)".

**C. Ordenação dos cards de membro no `RoomChallengesMatrix`**
- Hoje ordena por `doneToday` + `totalSecondsToday`. Adicionar toggle de ordenação no header do matrix (2 botões pequenos): **"Hoje"** (padrão atual) e **"Semana"** (usa dados semanais).
- Buscar dados semanais reutilizando o mesmo `get_room_ranking_by_period(_room_id, 'week')` que o sidebar já chama (**mesmo cache do TanStack Query — sem request extra**).
- Ao selecionar "Semana", cards são reordenados e mostram badge pequeno com posição semanal (`#1 sem`, `#2 sem`, etc.) ao lado do nome.

---

## 3. Limpeza da sala — remover placeholder "Em foco agora"

### Problema
Em `src/pages/RoomDetail.tsx` linhas 306–330 há um bloco `classroom-chalkboard` que quando **não há goal_hours e não há focus_session_end_at** mostra só um retângulo verde vazio com "📚 Em foco agora". A funcionalidade de agendar focus session foi descontinuada (nenhum caminho ativo cria `focus_session_end_at`), então o placeholder aparece 100% do tempo em salas sem meta.

### Solução
- Manter o bloco `classroom-chalkboard` **só quando houver conteúdo real**: `pinned_message` OU `goal_hours`. Remover totalmente o fallback "📚 Em foco agora".
- Remover também o `RoomLiveBanner`? Não — ele só aparece quando alguém está estudando (`studying.length > 0` retorna null caso contrário). Mantém.
- Ajustar espaçamento vertical do overview quando o chalkboard some (usar `space-y-4 sm:space-y-5` no container mesmo assim, já está OK).
- Verificar que nenhum código produção ainda depende de `focus_session_end_at` / `focus_session_duration` / `focus_session_started_by`. Se não usar: manter os campos no banco (não removemos schema), só paramos de renderizar. Deixar comentário `// TODO: focus session feature descontinuada` no `useRooms.ts`.

---

## Responsividade mobile

Todos os componentes acima usam breakpoints Tailwind mobile-first:
- Chips de desafio: scroll horizontal com snap no `< sm`, grid no `≥ sm`.
- Ranking sidebar: tabs com `text-[10px]` já compactas; card inteiro passa a full-width abaixo do main no `< lg` (já é assim).
- Matrix cards: mantém `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`.

## Arquivos afetados

- `src/components/timer/RoomChallengePicker.tsx` — reescrever para chip-cards.
- `src/components/rooms/RoomRankingSidebar.tsx` — padrão "week", chip líder, barra relativa.
- `src/components/rooms/RoomChallengesMatrix.tsx` — toggle de ordenação Hoje/Semana + badge posição semanal.
- `src/components/rooms/RoomChallengesCard.tsx` — passar `roomId` para a Matrix (já passa).
- `src/pages/RoomDetail.tsx` — remover fallback do chalkboard.
- `src/i18n/locales/pt-BR.json` + `en-US.json` — novas chaves: `challenges.pick_hint`, `challenges.selected_badge`, `ranking.week_leader`, `matrix.sort_today`, `matrix.sort_week`, `matrix.pos_week`.

Sem migrações, sem mudanças no schema, sem novos RPCs.

## Validação

- Timer + sala com 2 desafios: os dois cards visíveis, selecionado tem contorno primary + check.
- Sala com 1 desafio: card único full-width.
- Ranking abre em "Semana" e mostra 1º colocado no topo com chip.
- Toggle "Semana" no matrix reordena cards e mostra `#1 sem`.
- Sala sem meta e sem mensagem fixada: bloco verde do chalkboard some.
- Testar em viewport 360×800 (mobile) e 1280+ (desktop).
