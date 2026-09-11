# Salas e usuários de demonstração (50 salas, multilíngue)

Objetivo: quem chega no Explorar vê um app movimentado — salas que fazem sentido no país/idioma da pessoa, gente com horas diferentes, sequências, atividade de hoje e pessoas "estudando agora". Tudo com senha, tudo marcado internamente como demonstração e removível com um clique quando houver movimento real.

## Como vai parecer

- **50 salas públicas com senha**, distribuídas por idioma/país:
  - Brasil (12): ENEM 2027, OAB 1ª Fase, Concurso INSS, Polícia Federal, Banco do Brasil/Caixa, Residência Médica, Fuvest/USP, Tribunais (TRT/TJ), Militar (EsPCEx/AFA), Carreira TI/Dev, Medicina 1º ano, Inglês todo dia.
  - Inglês (7): SAT, MCAT, LSAT, CPA, NCLEX, Software Engineering Interviews, PhD Writing.
  - Espanhol (5), Francês (4), Alemão (4), Italiano (3), Japonês (3), Coreano (3), Chinês (3), Russo (2), Árabe (2), Indonésio (2) — cada uma com exame/concurso real do país (ex.: EBAU, Oposiciones, Concours/PACES, Abitur/Staatsexamen, Maturità, 共通テスト, 수능, 高考, ЕГЭ, اختبار القدرات, UTBK).
  - Nome, descrição, regras, meta de horas, país/bandeira, tipo (estudo/leitura/trabalho) e contorno de sala variados. Descrições escritas no idioma da sala.
- **Membros**: entre 7 e 34 por sala, nunca o mesmo número duas vezes; ~430 perfis de demonstração com nomes plausíveis do país, alguns com apelido, alguns sem foto, mistura de planos (maioria grátis, alguns pro/premium).
- **Histórico**: cada perfil tem sessões dos últimos 60–90 dias, em horários coerentes com o fuso do país (manhã/noite, menos no fim de semana), sessões de 18 min a 2 h, nunca números redondos iguais. Isso alimenta ranking de hoje/semana/total, mapa de calor, sequências e níveis (Novato → Persistente → …) de forma natural.
- **Movimento ao vivo**: uma rotina automática a cada 5 minutos liga/desliga presença e sessões em andamento conforme a hora local de cada sala, então os contadores de "online" e "estudando" mudam durante o dia e as salas nunca ficam todas vazias ou todas cheias.
- **Vida na sala**: algumas mensagens de chat iniciais no idioma da sala, feed de atividade (entrou na sala, concluiu desafio), 1–2 desafios ativos por sala com progresso desigual entre os membros.
- **Ranking global**: os perfis de demonstração aparecem também na aba Usuários, com totais realistas (nada absurdo), para o ranking não parecer vazio — e sem esmagar quem é real.

## Segurança e reversibilidade

- Todas as salas com senha longa e aleatória: ninguém entra, ninguém percebe.
- Os perfis de demonstração não conseguem fazer login (sem senha válida e sem e-mail confirmado), usam e-mails em um domínio interno reservado.
- Tudo fica etiquetado: um registro central lista cada sala e cada perfil de demonstração.
- Na página de administração, uma aba nova mostra quantas salas/perfis/sessões são de demonstração, permite **pausar o movimento ao vivo** e **remover tudo** (uma ação, apaga salas, membros, sessões, mensagens, desafios e perfis, sem tocar em nada real).
- Nada muda para usuários reais: nenhuma tela existente muda de comportamento, nenhuma função existente é reescrita.

## Detalhes técnicos

**Marcação e limpeza**
- Nova tabela `public.seed_entities (id, kind ['room'|'user'], entity_id, created_at)` + coluna `study_rooms.is_seed boolean default false`. Sem acesso para `anon`/`authenticated`; apenas `service_role` e funções definer.
- Nova tabela `public.seed_config (key, value)` com flag `presence_enabled`.
- Funções: `seed_admin_stats()`, `seed_set_presence(boolean)`, `seed_purge_all()` — todas `SECURITY DEFINER` exigindo `has_role(auth.uid(),'admin')`.
- `seed_purge_all()` apaga na ordem: `room_messages`, `room_activity_log`, `room_challenge_progress`, `room_challenges`, `room_members`, `time_entries`, `projects`, `study_rooms`, `profiles`, `auth.users` dos ids em `seed_entities`, e zera a tabela.

**Perfis de demonstração**
- `profiles.user_id` e `time_entries.user_id` têm FK para `auth.users`, então cada perfil precisa de uma linha em `auth.users` (inserida por migração/SQL com `encrypted_password` inválido, `email_confirmed_at` nulo, `raw_user_meta_data.display_name`, e-mail `...@seed.timezoni.internal`). O trigger `handle_new_user` cria o `profiles` e o `friend_code`; depois ajustamos `display_name`, `avatar_url` (nulo ou iniciais), `plan_tier`, `timezone`, `is_stats_public=true`, `trial_ends_at=null`, `last_known_streak`.
- Cada perfil recebe 1 projeto (categoria/cor variadas) porque `time_entries.project_id` é obrigatório.

**Sessões**
- Geração determinística por hash (`md5(user_id||dia)`) para nada ficar repetido: número de sessões/dia, minutos, minuto de início. Cada sessão respeita o trigger `enforce_time_entry_max_duration` (≤ 2 h com `confirmed_intervals=0`), com `end_time`, `duration`, `room_id` preenchidos — o trigger `time_entries_recalc_room_total` atualiza `room_members.total_seconds` sozinho.
- Volume estimado: ~430 perfis × ~55 sessões ≈ 24 mil linhas. Inserção em lotes por migração/`run_sql` para não estourar tempo.

**Presença ao vivo (pg_cron já instalado)**
- Função `seed_presence_tick()`: se `presence_enabled`, para cada sala usa o fuso do país para decidir a fração de membros online/estudando (curva por hora do dia + ruído por hash do horário), atualiza `room_members.is_online/is_timer_active/last_active_at/status_text`, abre `time_entries` sem `end_time` para quem "começou" e fecha as que passaram do tempo sorteado (30–110 min), registrando duração. Assim as abas "Agora", "Hoje" e "Semana" e o contador de estudando ficam coerentes.
- Job `cron.schedule('seed-presence','*/5 * * * *', ...)`. `mark_stale_members_offline` e `auto_pause_stale_entries` não conflitam (o segundo só age sobre `auth.uid()`); o tick sempre atualiza `last_active_at`.

**Salas**
- `study_rooms` com `is_public=true`, `password_hash = crypt(<aleatório 32 chars>, gen_salt('bf'))`, `invite_code` aleatório, `owner_id` = um dos perfis de demonstração (papel `owner` em `room_members`), `country`, `goal_hours`, `goal_label`, `chat_mode`, `room_background` compatível com o tier do dono (trigger `validate_room_background`).
- Aparecem normalmente em `get_public_rooms_ranking_by_period` (a listagem não filtra senha) e ficam com o botão de senha no Explorar.

**Admin**
- `src/components/admin/SeedDataTab.tsx` + hook `useSeedData.ts`, nova aba "Demonstração" em `src/pages/Admin.tsx`: números, interruptor de movimento ao vivo, botão de remoção com confirmação por digitação.
- Textos novos nos 12 idiomas (namespace `seed_admin`).

**Entrega em etapas** (cada uma verificada antes da seguinte)
1. Marcação/limpeza + funções admin + aba na administração.
2. Perfis, projetos e as 50 salas com membros.
3. Histórico de sessões, sequências, desafios, chat e feed.
4. Rotina de presença ao vivo + revisão final no Explorar e dentro de uma sala.
