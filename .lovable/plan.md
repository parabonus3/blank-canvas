## Objetivo

Três ajustes independentes na página da sala, sem quebrar o layout já aprovado:

1. Corrigir o rótulo de nível (Novato/Dedicado/…) que hoje aparece errado para vários membros.
2. Redesenhar o bloco "Conquistas da Sala" (hoje um chipzinho colorido sem graça) para virar uma vitrine gamificada que dá vontade de desbloquear mais.
3. Deixar o avatar dos membros mais presente no novo card da matrix de desafios, para fundos como o do Bielzinho voltarem a aparecer bonito.

---

## 1. Título de nível ("Novato" errado)

### Diagnóstico
Em `RoomChallengesMatrix.tsx`, `getMemberTitle` usa `extra?.total_seconds`, que vem de `room_members.total_seconds` (via `useRoomMembers`). Esse campo não está sincronizado com o total real: o ranking da lateral usa a RPC `get_room_ranking_by_period` (que soma `time_entries` de verdade) e mostra Miguel com 12h40, enquanto no card ele aparece como "Novato" (>10h deveria ser "Dedicado"). Ou seja, o número usado para decidir o título está desatualizado.

### Solução
- Passar como fonte de verdade os segundos totais do ranking "all" já carregado no `RoomRankingSidebar` / `useRoomMembers`, em vez de `room_members.total_seconds`.
  - Opção A (simples): em `RoomChallengesCard`, disparar a mesma RPC `get_room_ranking_by_period(_room_id, 'all')` e usar esse mapa `user_id → total_seconds` para popular `memberExtras.total_seconds`.
  - Opção B (mais limpa): criar hook compartilhado `useRoomMembersAllTime(roomId)` reaproveitado pelo sidebar e pela matrix (evita 2 requests).
- Manter thresholds atuais (10h / 50h / 200h / 500h) e nomes já traduzidos.
- Bônus: adicionar tooltip no rótulo mostrando o total exato ("12h 40m nesta sala").

Escopo apenas de UI + hook — sem migração.

---

## 2. Redesenhar "Conquistas da Sala"

### Diagnóstico
Hoje `RoomAchievements.tsx` renderiza chips redondos pequenos ("5 membros", "10 membros", "10h estudadas") num quadradinho no canto. Visualmente pobre, sem hierarquia, sem progresso, sem incentivo pra próxima conquista.

### Nova experiência (sem mudar schema)
Continuamos usando a tabela `room_achievements` e a mesma lista de `achievement_type`, mas o card ganha:

- **Header com destaque**: nome "Conquistas da Sala", contador `X / Y desbloqueadas`, e barra de progresso geral animada.
- **Grade de medalhas** (2–3 colunas) no lugar dos chips:
  - Cada medalha é um "coin" circular com:
    - Ícone maior + gradiente por raridade (comum → azul, rara → roxo, épica → âmbar, lendária → gradiente arco-íris).
    - Anel externo animado pra épica/lendária (mesmo motor CSS dos flairs).
    - Nome curto + descrição em 1 linha.
    - Data de desbloqueio ("há 3 dias") em micro-texto.
  - Medalhas ainda **bloqueadas** aparecem em silhueta cinza + cadeado + mini-progresso ("42/50 membros", "78h / 100h"), servindo de objetivo visível.
- **Categorias visuais** internas (Tempo / Streak / Comunidade / Especial) com um separador sutil.
- **Raridade**:
  - Comum: `members_5`, `total_10h`, `streak_3d`
  - Rara: `members_10`, `total_50h`, `streak_7d`
  - Épica: `members_25`, `total_100h`, `streak_30d`
  - Lendária: `total_500h`, `total_1000h`
- **Novas conquistas** (opcionais, ainda no mesmo schema `achievement_type = text`):
  - `sync_10` — 10 membros estudando ao mesmo tempo
  - `daily_perfect` — sala inteira bateu meta diária num dia
  - `challenge_champion` — 1 desafio da sala concluído por 5+ membros
  - `night_owl` / `early_bird` — sessão coletiva madrugada/manhã
  - Detecção reaproveita o loop de `useEffect` que já existe em `RoomAchievements`; onde precisar de dado novo, calcula do lado do cliente com o que já vem em `members` (evita nova migração agora).
- **Confetti já existe** ao desbloquear — mantido, mas trocamos por um "reveal" adicional: coin desbloqueado ganha animação de flip + brilho por 2s.
- **Estado vazio**: em vez de esconder o card (`return null`), mostrar as próximas 3 conquistas mais próximas para incentivar a sala nova.

Arquivos:
- `src/components/rooms/RoomAchievements.tsx` — reescrita da apresentação.
- Novo `src/lib/roomAchievementDefs.ts` — catálogo central com `id`, `category`, `rarity`, `icon`, `label`, `description`, `condition(members, streak)`, `progress(members, streak)`.
- Strings novas em `pt-BR.json` + `en-US.json` (fallbacks nas outras).

Nenhum arquivo de SQL alterado.

---

## 3. Avatar / fundo mais presente no card da matrix

### Diagnóstico
No `MemberCard` (RoomChallengesMatrix.tsx) o avatar é `h-10 w-10` colado à esquerda. Membros como Bielzinho têm avatar com fundo temático caprichado que praticamente some.

### Solução (sem quebrar layout atual)
- **Aumentar o avatar** para `h-14 w-14` (`h-16 w-16` em Premium), mantendo o resto do header como está.
- **Faixa de fundo sutil no topo do card** derivada da média de cor do avatar (ou do `avatar_flair_color` quando existir):
  - `<div>` altura ~44px atrás do header, com `background: linear-gradient(180deg, {cor} 0%, transparent 100%)` e `opacity-15`.
  - Avatar fica "meio-mergulhado" nessa faixa (padrão de perfis modernos).
  - Fallback: usa cor do gradiente do tier (blue pro, amber premium) quando não houver cor.
- **Ordem de camadas**: faixa → flair ring → avatar → status dot. Como já está tudo em `relative`, é só envelopar em um `<div className="relative">` novo com `overflow-hidden` no card.
- Não muda alturas totais significativamente porque as duas linhas de metadados (streak/min/título) continuam ao lado.
- Card Premium/Pro mantém a borda dourada/azul; só a faixa adiciona identidade extra.

Arquivo:
- `src/components/rooms/RoomChallengesMatrix.tsx` — só o `MemberCard`.

Opcional (fase 2): usar a mesma faixa no `RoomMemberGrid` para consistência — deixo fora deste plano pra não expandir escopo.

---

## Ordem de execução

1. Novo `roomAchievementDefs.ts` + reescrita do `RoomAchievements.tsx` + i18n.
2. Ajuste do `MemberCard` (faixa de fundo + avatar maior).
3. Hook/consulta de totais all-time reaproveitado + fix do `getMemberTitle`.
4. Verificação visual na sala atual (Nicky, Miguel, Bielzinho).

## Fora de escopo

- Nenhuma alteração de RLS, migração ou lógica de créditos.
- Ranking lateral, chat, chips de desafio e demais blocos permanecem intocados.
