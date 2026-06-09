# Desafios de Sala (Room Challenges)

Sistema de metas recorrentes da sala (ex.: "10 min de oração por dia, 30 dias") com tracking automático a partir do cronômetro/pomodoro de cada membro. Todos os membros visualizam quem está em dia, quantos dias seguidos cumpriu, quem faltou e em quais datas.

## Visão geral

- **Dono/moderador da sala** cria um desafio: nome, descrição opcional, ícone/emoji, duração-meta por período (minutos), tipo de período (diário/semanal), duração do desafio em dias (ex.: 30), data de início, e ativo/inativo.
- **Membros** entram automaticamente no desafio ao serem membros da sala (sem opt-in extra). Quando rodam timer/pomodoro com a sala selecionada, o progresso conta sozinho.
- **Diário**: cumprir = somar ≥ X min naquele dia na sala. Não acumula entre dias (20 min ≠ 2 dias).
- **Semanal**: cumprir = somar ≥ X min na semana ISO (seg-dom).
- **Visualização**: card do desafio no topo da sala com lista de membros, status "em dia / X dias sem completar", streak atual do desafio, e calendário de presença ao clicar em alguém (reaproveita o `MemberProfileModal`).
- **Aviso no timer**: quando o usuário inicia timer/pomodoro com uma sala que tem desafio ativo, mostra um banner discreto "Faltam Ym para bater a meta de hoje da sala X" (ou "✓ Meta da sala batida hoje"). Pode ser desligado em Configurações; padrão = ligado.

## Mudanças de banco

Nova migração com GRANTs corretos e RLS:

```sql
-- 1) Tabela de desafios
CREATE TABLE public.room_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  emoji text DEFAULT '🎯',
  period_type text NOT NULL CHECK (period_type IN ('daily','weekly')),
  target_minutes integer NOT NULL CHECK (target_minutes BETWEEN 1 AND 1440),
  duration_days integer,            -- nullable = "sem fim"
  start_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_room_challenges_room ON public.room_challenges(room_id, is_active);

-- 2) Progresso por período (1 linha por membro por dia/semana)
CREATE TABLE public.room_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.room_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  period_key text NOT NULL,          -- 'YYYY-MM-DD' (daily) ou 'IYYY-Www' (weekly)
  period_start date NOT NULL,
  seconds_in_period integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(challenge_id, user_id, period_key)
);
CREATE INDEX idx_rcp_challenge_user ON public.room_challenge_progress(challenge_id, user_id);

-- GRANTS + RLS (membros da sala leem, só dono escreve desafio, progresso só via RPC)
GRANT SELECT ON public.room_challenges TO authenticated;
GRANT SELECT ON public.room_challenge_progress TO authenticated;
GRANT ALL ON public.room_challenges, public.room_challenge_progress TO service_role;
ALTER TABLE public.room_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read challenges" ON public.room_challenges
  FOR SELECT TO authenticated USING (public.is_room_member(auth.uid(), room_id));
CREATE POLICY "owner manage challenges" ON public.room_challenges
  FOR ALL TO authenticated
  USING (public.is_room_owner(auth.uid(), room_id))
  WITH CHECK (public.is_room_owner(auth.uid(), room_id));
CREATE POLICY "members read progress" ON public.room_challenge_progress
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.room_challenges c
            WHERE c.id = challenge_id AND public.is_room_member(auth.uid(), c.room_id))
  );

-- 3) Preferência por usuário: silenciar aviso no timer
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_room_challenge_alerts boolean NOT NULL DEFAULT true;
```

### RPCs (SECURITY DEFINER, `set search_path=public`)

- `create_room_challenge(_room_id, _title, _description, _emoji, _period_type, _target_minutes, _duration_days)` — só owner.
- `update_room_challenge(_id, ...)` / `toggle_room_challenge(_id, _active)` / `delete_room_challenge(_id)` — só owner.
- `record_room_challenge_progress(_room_id, _user_id, _seconds, _at)` — chamada internamente; para cada desafio ativo da sala calcula `period_key`/`period_start` pelo timezone do perfil do usuário, faz `INSERT ... ON CONFLICT DO UPDATE SET seconds_in_period = seconds_in_period + EXCLUDED.seconds_in_period`, marca `completed=true` quando passa do target (sem acumular além).
- `get_room_challenges_with_status(_room_id)` → retorna desafios + por membro: `seconds_today/this_week`, `completed_today`, `current_streak`, `missed_days_count`, último cumprimento.
- `get_member_challenge_calendar(_challenge_id, _user_id, _from, _to)` → array de dias com status (completou / faltou / fora do desafio).

### Gatilho automático

Adicionar gatilho `AFTER UPDATE OF end_time ON public.time_entries` (ou alterar `stop_time_entry`): se `NEW.end_time IS NOT NULL` e a entry foi feita "dentro de uma sala", chamar `record_room_challenge_progress`. Como `time_entries` **não tem `room_id`**, o vínculo é feito de duas formas combinadas:
1. **Adicionar coluna nullable `room_id uuid` em `time_entries`** (com índice parcial). `useTimeEntries.startTimer` já recebe `roomId` — basta gravar no insert/update.
2. O gatilho lê `NEW.room_id` e processa apenas se não nulo.

Isso é retrocompatível (entries antigas ficam NULL e são ignoradas no desafio).

## Mudanças no frontend

### Novos arquivos
- `src/hooks/useRoomChallenges.ts` — `useRoomChallenges(roomId)`, `useCreateChallenge`, `useUpdateChallenge`, `useToggleChallenge`, `useDeleteChallenge`, `useMemberChallengeCalendar`.
- `src/components/rooms/RoomChallengesCard.tsx` — card no topo da `RoomDetail` listando desafios ativos com barra de progresso por desafio e top membros. Botão "+" só para owner.
- `src/components/rooms/CreateChallengeDialog.tsx` / `EditChallengeDialog.tsx` — formulário com templates rápidos ("Oração 10min", "Leitura 20min", "Estudo 1h", "Personalizado…").
- `src/components/rooms/ChallengeMembersList.tsx` — lista responsiva mostrando avatar, nome, status (✓ em dia / "X dias sem completar" / "primeira vez"), streak. Clicar abre modal com calendário.
- `src/components/rooms/ChallengeCalendarModal.tsx` — heatmap mensal com dias verdes/vermelhos/neutros, baseado em `get_member_challenge_calendar`.
- `src/components/timer/RoomChallengeBanner.tsx` — banner pequeno acima do timer e do pomodoro quando há sala selecionada + desafio ativo + preferência ligada. Mostra "🎯 Meta da sala: 10min — faltam 3m12s" ou estado completo.

### Arquivos modificados
- `src/pages/RoomDetail.tsx` — renderiza `RoomChallengesCard` logo abaixo do `RoomStatsHeader`.
- `src/components/rooms/MemberProfileModal.tsx` — nova aba "Desafios" mostrando status do membro nos desafios da sala.
- `src/pages/Index.tsx` e `src/components/PomodoroTimer.tsx` — inserir `<RoomChallengeBanner roomId={selectedRoom} />` quando `selectedRoom !== 'none'`.
- `src/hooks/useTimeEntries.ts` — passar `room_id` no insert (`startTimer`) e no update final (`stopTimer`), para alimentar o gatilho.
- `src/pages/Settings.tsx` — novo toggle "Mostrar avisos de meta da sala no timer" (default ligado), salva em `profiles.show_room_challenge_alerts`.
- `src/i18n/locales/*.json` — chaves novas em `rooms.challenges.*` e `settings.challenge_alerts_*` (12 idiomas).

## UX / Responsividade

- Card do desafio: header com emoji + título + período ("Diário · 10min" / "Semanal · 70min"), barra de progresso do dia, "X de Y dias do desafio" se tiver duração.
- Lista de membros em grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` com avatar, nome truncado, badge de status e mini-streak.
- Estados visuais: verde (em dia), âmbar (1-2 dias sem), vermelho (3+), cinza (ainda não começou).
- Calendário modal: cabeçalho com mês, navegação mês anterior/próximo, legenda compacta.
- Banner no timer: 1 linha em mobile, com botão "x" para ocultar só nesta sessão (preferência permanente está em Configurações).
- Aviso quando bate a meta: toast "🎯 Você bateu a meta da sala X hoje!" disparado pela mesma RPC (retorna `just_completed=true`).

## Edge cases tratados

- Sessão começou antes da meia-noite e terminou depois: o gatilho considera o `end_time` (período em que efetivamente terminou) para evitar dupla-contagem. Se necessário, dividir é overkill — registramos no dia do `end_time`.
- Timezone: `period_key` calculada com `profiles.timezone` (já existe).
- Desafio criado no meio de semana com `period_type='weekly'`: `period_start` = início da semana ISO contendo `start_date`.
- Pausa: usamos apenas `duration` final (já desconta `paused_seconds`).
- Sessões manuais (ManualTimeEntryDialog): também passarão `room_id` se houver sala selecionada — funcionam normalmente.

## Validação

- Migração roda limpa, GRANTs presentes, RLS bloqueia leitura/escrita externa.
- Criar desafio "10min diário" e rodar timer de 10min: progresso = 100%, membro fica verde, streak = 1.
- Rodar mais 10min no mesmo dia: progresso fica capado, não vira "2 dias".
- Pular um dia: aparece "1 dia sem completar"; calendário mostra ponto vermelho.
- Toggle em Configurações: banner some/aparece.
- Mobile 360×640: card, lista e modal renderizam sem overflow.

## Arquivos afetados

- **Banco**: 1 migração (tabelas, RPCs, gatilho, coluna `time_entries.room_id`, coluna `profiles.show_room_challenge_alerts`).
- **Novos**: 6 componentes + 1 hook.
- **Editados**: `RoomDetail.tsx`, `MemberProfileModal.tsx`, `Index.tsx`, `PomodoroTimer.tsx`, `useTimeEntries.ts`, `Settings.tsx`, 12 arquivos de i18n.
