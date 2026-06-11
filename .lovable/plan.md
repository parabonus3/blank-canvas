
# Plano de correções — Salas, Desafios, Perfis, PDF e UI

Objetivo: alinhar todas as contagens (ranking, desafio, sala) ao **mesmo "hoje"** (fuso do dono da sala), recuperar tempos perdidos, deixar o perfil público por padrão, e melhorar UI/i18n/PDF. Nada será apagado — só reconciliado.

## 1. Causa raiz dos números divergentes

Hoje cada lugar calcula "hoje" de um jeito diferente:

- **Ranking (Hoje/Semana/Mês)** → usa o fuso do **usuário que olha** (ou UTC).
- **Desafio diário** → após a última migração, passou a usar o fuso de **cada membro** individualmente.
- **Total da sala (`room_members.total_seconds`)** → soma bruta, sem fuso, e só é incrementada quando `time_entries.room_id = sala`. Sessões feitas fora da sala (ex.: Bielzinho rezando no timer pessoal) **não entram**.

Resultado: Felipe aparece "em dia" no calendário mas "2 dias sem completar" no card; Bielzinho tem 28 min na semana mas só 11 min na sala; ranking "Hoje" mostra minutos que o desafio ignora.

**Decisão:** o "hoje" de uma sala é **o fuso configurado pelo dono da sala** (ou, se ele não tiver, `America/Sao_Paulo`). Esse fuso será exibido no card de Desafios ("Dia da sala: 11/jun — fuso America/Sao_Paulo, vira às 00:00") para todo mundo ver até quando dá pra bater a meta.

## 2. Banco de dados (uma migração só)

### 2.1 Fonte única de "hoje da sala"
- Nova função `get_room_timezone(_room_id)` → retorna `profiles.timezone` do owner, fallback `America/Sao_Paulo`.
- Reescrever `get_room_challenges_with_status` para usar **o fuso da sala** em todos os membros (não o de cada um). Mesmo período para todos → calendário e card sempre batem.
- Reescrever `get_room_streak` e a RPC do ranking "Hoje/Semana/Mês" da sala para usar o **mesmo fuso da sala**.

### 2.2 Reconciliar `room_members.total_seconds`
Trigger `time_entries_after_update_room` para recalcular `total_seconds` do membro a partir do `SUM(duration_seconds)` real em `time_entries` com `room_id = sala` (evita drift). Roda também via job de backfill agora.

### 2.3 Backfill retroativo (sem perder nada)
- Recalcular `total_seconds` de **todos os membros de todas as salas** a partir de `time_entries` reais.
- Recalcular `room_challenge_progress` de todos os desafios ativos a partir do histórico de `time_entries` no fuso da sala — quem bateu, fica marcado como completo no dia certo.
- Específicos relatados:
  - **Bielzinho** (sala Oração): atribuir as sessões de oração dele dos últimos dias ao `room_id` da sala (atualiza `time_entries.room_id`) → assim entram em ranking, desafio e total da sala.
  - **Felipe Micael**: o backfill do `room_challenge_progress` vai recolocar os dias verdes no calendário e remover o "2 dias sem completar".

### 2.4 Heatmap (mapa de atividade) funcional
- Função `get_room_heatmap(_room_id, _days)` agregando `time_entries` por dia **no fuso da sala**. `RoomHeatmap.tsx` passa a ler dela. Hoje está dessincronizado.

### 2.5 Perfil público por padrão
- `ALTER TABLE profiles ALTER COLUMN profile_visibility SET DEFAULT 'public';`
- `UPDATE profiles SET profile_visibility='public' WHERE profile_visibility IS NULL;`
- **Não** mexe em quem já escolheu `private` — respeita escolha existente.
- Trigger `handle_new_user` passa a inserir `profile_visibility = 'public'`.

## 3. Frontend

### 3.1 Card de Desafios da sala
- Mostrar badge no topo: `Dia da sala: <data> · fuso <tz da sala> · vira em <hh:mm>`.
- Usar essa mesma fonte de verdade para "X dias sem completar" (vem do RPC, não recalculado no client).

### 3.2 Ranking da sala
- "Hoje / Semana / Mês" passam a chamar RPC com fuso da sala. Ranking "Hoje" e progresso do desafio diário vão bater 100%.

### 3.3 RoomTimerCard — visual
Trocar o gradiente verde-acinzentado (que apaga texto no tema claro) por um card sólido com a identidade do app:
- Fundo: `bg-card` com borda `border-primary/30` e leve `shadow-md`.
- Header chapado, sem radial-gradient atrás do texto.
- Botão "Iniciar nesta sala" em `bg-primary text-primary-foreground` (azul oficial).
- Mantém responsivo, com painel de sons recolhível igual hoje.
- Aplica em ambos temas (claro/escuro) com tokens semânticos — sem `text-white` hard-coded.

### 3.4 Roxo → azul do sistema
Varrer componentes que ainda têm `purple-*`, `violet-*` ou `from-purple…`/`to-violet…` (achievements, badges, alguns dialogs) e substituir por tokens `primary` / `accent` já azuis do `index.css`. Nada de cor hardcoded.

### 3.5 i18n
- Procurar strings hardcoded em inglês expostas em PT (ex.: "Project" no header de Anotações deveria ser "Projeto"). Trocar por `t(...)` e completar chaves nos 12 locales.
- Validar Anotações (cabeçalho do PDF + tela) e RoomTimerCard.

### 3.6 Privacidade do perfil
- Settings: deixar o toggle de visibilidade refletindo o novo default `public`. Texto explicando: "Seu perfil começa público. Você pode tornar privado a qualquer momento."

## 4. PDF de Anotações
Bug: acentos saem trocados ("criação" vira "criaÃ§Ã£o" / sublinhado cortando linha).
- Em `src/lib/pdfExport.ts` trocar a geração atual (jsPDF latin1) por:
  - Fonte **Inter** ou **Noto Sans** embarcada com suporte UTF-8 (`doc.addFileToVFS` + `doc.addFont`).
  - `doc.setLanguage(i18n.language)`.
  - Layout: cabeçalho com logo TimeZoni, título da nota, metadados (projeto, criado em, atualizado em) em coluna, corpo com `splitTextToSize` respeitando margens, paginação "Página X de Y".
  - Cores: paleta do sistema (azul primário em vez de roxo).
  - Sublinhados e negritos do editor renderizados de forma legível (sem cortar texto).

## 5. Ordem de execução

1. Migração única: timezone da sala + reescrita das RPCs + trigger de recálculo + backfill de `total_seconds` + backfill de `room_challenge_progress` + reatribuição das sessões do Bielzinho + default `profile_visibility=public` + função `get_room_heatmap`.
2. Frontend: novo RoomTimerCard, badge de fuso no card de desafios, ranking usando RPC nova, RoomHeatmap consumindo nova função.
3. Sweep de cor roxa → azul e i18n faltantes (Projeto, etc.).
4. Reescrita do `pdfExport.ts` com fonte UTF-8 e layout profissional.
5. Verificação: abrir a sala Oração, conferir que Felipe está "Em dia", Bielzinho mostra ~28 min no total, calendário e card batem, heatmap preenchido, PDF de uma nota com acentos sai limpo.

## Detalhes técnicos (referência)

- RPCs alteradas: `get_room_challenges_with_status`, `get_member_challenge_calendar`, `get_room_streak`, novo `get_room_today_window(_room_id) → (start_utc, end_utc, tz, label)`, novo `get_room_heatmap`.
- Trigger novo em `time_entries` (AFTER INSERT/UPDATE/DELETE) para `recalc_room_member_totals(room_id, user_id)`.
- Backfill rodado como bloco `DO $$ ... $$` na própria migração, idempotente.
- `room_challenge_progress` usa `ON CONFLICT (challenge_id, user_id, period_start) DO UPDATE`.
- Frontend: nenhum cálculo de "hoje" no client — sempre vem do RPC para evitar drift entre fusos do navegador.

Sem este plano aprovado, nada é alterado.
