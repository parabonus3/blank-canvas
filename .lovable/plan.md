# Plano: Unificar Desafios da Sala + Grid de Membros

## Problema

Hoje, quando a sala tem desafios ativos:
1. **Duplicação visual** — cada usuário aparece 2x: nos cards de desafio (topo) e no grid da sala (baixo). Em salas com 50+ pessoas fica pesado e poluído.
2. **Cards de desafio "sem alma"** — não mostram anel dourado/azul (PRO/PREMIUM), flair, badge do plano nem status "estudando agora". Toda essa riqueza visual só existe no grid de baixo.
3. **Avatar não clica** — no card de desafio o avatar é estático; só o grid de baixo abre `MemberProfileModal`.
4. **"Em foco agora" solto** — o bloco `RoomTimerCard` (verde "Em foco agora") aparece entre os desafios e o chalkboard/floor, sem hierarquia clara.

## Solução

Fundir as duas visualizações em uma só quando houver desafios, mantendo o layout atual quando não houver.

### 1. Enriquecer `MemberCard` em `RoomChallengesMatrix.tsx`

Trazer para o header de cada card de membro (dentro da matriz de desafios) o mesmo tratamento visual que existe no `RoomMemberGrid`:

- **Anel do plano** — envolver o `Avatar` em `<PlanAvatarRing tier={memberTier} flairId={avatar_flair} compact>` (usa o mesmo componente já existente em `src/components/rooms/PlanBadge.tsx`).
- **Badge PRO/PREMIUM** — colocar `<PlanBadge tier={memberTier} size="xs" />` ao lado do nome.
- **Indicador "estudando agora"** — pontinho verde pulsante (`TimerPulse` estilo do grid) quando `is_timer_active` + `last_active_at` dentro da janela.
- **Nível/título do membro** — "Novato / Dedicado / Veterano…" abaixo do nome (mesmo helper `getMemberTitle`).
- **Avatar clicável** — envolver header numa `<button>` que abre `<MemberProfileModal userId={...} roomId={...} />`.

Para isso, o `useRoomChallenges` (ou a página) precisa passar para a matriz os dados extras dos membros da sala: `plan_tier`, `avatar_flair_color`, `is_timer_active`, `last_active_at`, `total_seconds` da sala. Fazemos merge no `RoomDetail` cruzando `members` (do `useRoomMembers`) com os membros do desafio pelo `user_id` — sem mudar RPCs.

### 2. Ocultar o grid de baixo quando houver desafios

Em `src/pages/RoomDetail.tsx`, condicionar o bloco `classroom-floor` (linhas 330-335) a `challenges.length === 0`. Se existir desafio ativo, o grid não renderiza — evita repetição, reduz altura da página para salas grandes e mantém o "chalkboard" acima intacto.

Quando não há desafios, tudo permanece exatamente como está hoje (fallback padrão).

### 3. Reorganizar "Em foco agora" (`RoomTimerCard`)

Hoje ele fica solto entre os desafios e o chalkboard. Duas mudanças:

- **Mover** o `RoomTimerCard` para **dentro** do `classroom-chalkboard` (topo), integrando-o à "lousa" — assim ele deixa de ser um bloco flutuante e vira o call-to-action da sessão em curso.
- **Só mostrar** quando houver sessão de foco ativa (`focus_session_end_at` no futuro) ou timer do próprio usuário rodando; caso contrário fica escondido e o chalkboard mostra o "📚 Estudando agora" existente.

### 4. Layout final

```text
Sala COM desafios ativos:
┌────────────────────────────┐
│ RoomStatsHeader            │
├────────────────────────────┤
│ RoomChallengesCard         │
│  ├─ Chips resumo desafios  │
│  └─ Grid MemberCards       │ ← agora com anel PRO/PREMIUM,
│      (clicável → perfil)   │   flair, badge, pulso, título
├────────────────────────────┤
│ Chalkboard                 │
│  ├─ Em foco agora (se ativo)│
│  ├─ Pinned / Goal progress │
│  └─ Welcome fallback       │
└────────────────────────────┘
(sem duplicação de membros abaixo)

Sala SEM desafios:
… fluxo atual inalterado (chalkboard + classroom-floor + RoomMemberGrid) …
```

## Detalhes técnicos

- **Arquivos alterados**:
  - `src/components/rooms/RoomChallengesMatrix.tsx` — enriquecer `MemberCard` (anel, badge, pulso, título, clique → modal).
  - `src/components/rooms/RoomChallengesCard.tsx` — repassar props extras (mapa de membros da sala) para a matriz.
  - `src/pages/RoomDetail.tsx` — condicionar `classroom-floor`/`RoomMemberGrid` a `challenges.length === 0`; mover `RoomTimerCard` para dentro do chalkboard.
- **Sem mudança de lógica de desafio** — RPC `get_room_challenges_with_status`, `record_room_challenge_progress` e persistência do picker permanecem intactos.
- **Sem mudanças de schema, backend, ou RLS**. Apenas UI/composição.
- **PlanBadge/PlanAvatarRing** já existem — reutilizamos sem criar componentes novos.
- **Performance**: em salas com 50+ pessoas, cai de ~2× render de avatares para 1×.

## Fora do escopo

- Alterar contabilização de tempo em desafios.
- Mexer no sidebar (ranking, achievements, heatmap, feed).
- Novas RPCs ou migrations.
