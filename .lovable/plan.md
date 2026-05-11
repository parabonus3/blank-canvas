Do I know what the issue is? Sim.

O problema exato é que a função `stop_time_entry` está descontando “ghost time” quando o `last_heartbeat_at` não avança. No caso mais recente no banco:

```text
start_time:          20:36:27
end_time:            20:54:58
wall_seconds:        1110s  (~18m30s)
last_heartbeat_at:   20:36:27
paused_seconds:      990s
saved duration:      120s   (2m)
```

Ou seja: o usuário estudou mais de 17min, mas como o heartbeat ficou preso no início, o backend subtraiu tudo depois de 2min e salvou só 120s. Essa regra conflita com o comportamento esperado: o timer deve contar normalmente até uma pausa explícita ou até o alerta de inatividade de 2h.

Plano de correção:

1. Restaurar a regra principal do cronômetro
   - `duration` salvo deve ser: `end_time - start_time - paused_seconds`.
   - Remover o desconto automático de “sem heartbeat” do `stop_time_entry` para sessões normais.
   - O heartbeat não pode reduzir o tempo de uma sessão ativa curta; ele deve ser só sinal auxiliar de abandono.

2. Corrigir a auto-pausa de segurança
   - Trocar a regra atual que considera sessão abandonada após 15min e pausa em `last_heartbeat + 2min`.
   - Nova regra: só auto-pausar depois de 2h sem confirmação/atividade relevante.
   - Quando auto-pausar, marcar `paused_at` no ponto correto de 2h, não em 2min.
   - Isso alinha com o fluxo esperado: “depois de 2h rodando, pausar e perguntar se a pessoa está”.

3. Alinhar frontend e backend para uma única fonte de verdade
   - Manter o timer exibido calculado por `start_time - paused_seconds - paused_at`, como já é a intenção.
   - Garantir que pause/resume atualize `paused_at` e `paused_seconds` de forma consistente.
   - Ao parar, salvar pelo RPC server-authoritative, mas usando a mesma fórmula do timer exibido.

4. Tratar o alerta de 2h corretamente
   - O modal de inatividade deve pausar o timer após 2h.
   - Se o usuário confirmar presença, o tempo segue normalmente a partir dali.
   - O tempo parado enquanto aguardava confirmação entra em `paused_seconds`, então não infla o total.
   - Se o usuário finalizar depois, o valor salvo deve bater com o que estava no cronômetro.

5. Corrigir registros afetados pelo bug recente
   - Identificar sessões onde `duration = 120` mas `wall_seconds` é muito maior e `paused_seconds` veio do desconto de heartbeat.
   - Para sessões claramente afetadas, recalcular para `wall_seconds - pausas explícitas reais` quando houver evidência segura.
   - No caso mostrado, a sessão recente deve voltar para aproximadamente 18m30s, não 2m.

6. Validar com cenários críticos
   - Sessão normal de 17–18min sem pause: salva 17–18min.
   - Sessão com pause manual de 5min: desconta só os 5min.
   - Sessão passando de 2h: pausa e pergunta presença.
   - Usuário confirma presença: continua sem zerar nem perder tempo.
   - Usuário abandona após o alerta: não continua inflando indefinidamente.

Arquivos/funções envolvidos:

```text
src/pages/Index.tsx
src/contexts/TimerContext.tsx
src/components/InactivityCheckModal.tsx
src/hooks/useTimeEntries.ts
public.stop_time_entry
public.auto_pause_stale_entries
public.heartbeat_time_entry
```

Resultado esperado: o número exibido no cronômetro passa a ser o mesmo tempo salvo no histórico, e o sistema só desconta tempo quando houver pausa explícita ou pausa real de inatividade após 2h.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>