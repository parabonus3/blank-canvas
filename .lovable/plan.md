## Diagnóstico

Encontrei três causas principais para a regressão:

1. **Explorar quebrou por overload de RPC no Supabase**
   - Agora existem duas versões simultâneas de `get_public_rooms_ranking_by_period`: uma com 4 parâmetros e outra com 5.
   - Também existem duas versões de `get_global_user_ranking`: uma com 1 parâmetro e outra com 2.
   - O frontend chama as versões antigas, e o PostgREST não consegue decidir qual função usar. O erro confirmado foi `PGRST203: Could not choose the best candidate function`.
   - Resultado: salas e usuários ficam vazios ou falham ao respeitar filtros.

2. **Padrão America/Sao_Paulo ficou inadequado para Explorar global**
   - A mudança anterior colocou `America/Sao_Paulo` como padrão de ranking global.
   - Para um ranking público/global, isso cria uma referência regional demais.
   - Melhor usar um padrão neutro e global: **UTC**, com aviso discreto no Explorar.

3. **Metas no Timer usam a tabela errada**
   - O componente novo `ActiveGoalsStrip` usa `useGoalsWithProgress()`, que lê a tabela antiga `goals`.
   - A tela atual de Metas usa `annual_goals`, `life_categories` e `annual_goal_progress`.
   - O banco tem metas em `annual_goals`, mas `goals` está vazia. Por isso nada aparece no Timer/fullscreen.

## Plano de correção

### 1. Restaurar as RPCs de Explorar sem ambiguidade

Criar uma migração para:

- Remover as assinaturas antigas ambíguas:
  - `get_public_rooms_ranking_by_period(text, text, text, text)`
  - `get_global_user_ranking(text)`
  - `get_room_daily_progress(uuid, text)`
- Manter uma única assinatura por função:
  - `get_public_rooms_ranking_by_period(_period, _category, _search, _country, _tz default 'UTC')`
  - `get_global_user_ranking(_period, _tz default 'UTC')`
  - `get_room_daily_progress(_room_id, _period, _tz default 'UTC')`
- Preservar `SECURITY DEFINER`, `search_path = public` e os grants atuais para não quebrar acesso público intencional.
- Trocar o helper para `start_of_day_in_tz('UTC')` por padrão.

### 2. Ajustar o frontend do Explorar

- Passar `_tz: 'UTC'` explicitamente nas chamadas de:
  - `get_public_rooms_ranking_by_period`
  - `get_global_user_ranking`
- Atualizar o aviso discreto para algo como:
  - “Dia e semana baseados em UTC para manter o ranking global consistente.”
- Conferir as traduções em `pt-BR` e `en-US` para não depender de fallback hardcoded.

### 3. Corrigir metas no Timer e fullscreen

- Adaptar `ActiveGoalsStrip` para usar as metas atuais de `annual_goals`, não a tabela legada `goals`.
- Exibir apenas metas:
  - do ano atual;
  - não arquivadas;
  - não concluídas;
  - com progresso abaixo de 100%.
- Usar `life_categories.color` quando existir, mantendo visual discreto.
- Para progresso:
  - `current_value / target_value` para metas simples/progresso/hábito.
- Manter o limite visual de até 3 metas + “+N”.

### 4. Corrigir compatibilidade de progresso de sala

- Em `RoomGoalProgress`, continuar passando o timezone do usuário quando for experiência da sala/pessoal.
- Após remover a assinatura antiga, garantir que a chamada com `_tz` continue funcionando.

### 5. Validar depois da implementação

- Testar via chamada REST/Supabase que as RPCs não retornam mais `PGRST203`.
- Verificar em `/explore`:
  - salas aparecem;
  - usuários aparecem quando houver dados no período;
  - filtros `Agora`, `Hoje`, `Semana`, `Total` funcionam.
- Verificar em `/timer` e fullscreen:
  - metas de `annual_goals` aparecem discretamente;
  - metas concluídas não aparecem;
  - layout permanece responsivo.

## Observação importante

Não vou mexer em regras de avatar, contorno de sala, RLS sensível ou permissões amplas de `study_rooms`. A correção fica limitada ao que quebrou: RPCs de ranking/fuso e fonte das metas exibidas no Timer.