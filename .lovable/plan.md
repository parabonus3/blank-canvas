## Diagnóstico

Sim — agora dá para afirmar o problema real.

1. O erro do botão de salvar/stop vem do banco: existem duas funções RPC com o mesmo nome:
   - `stop_time_entry(_entry_id uuid)`
   - `stop_time_entry(_entry_id uuid, _client_seconds integer DEFAULT NULL)`

   O Supabase/PostgREST não consegue escolher qual chamar e retorna exatamente o erro mostrado: “Could not choose the best candidate function”.

2. O salto para `02:00:00` acontece porque a lógica de inatividade/auto-pausa está tratando uma sessão antiga como abandonada e aplicando o limite de 2h. Isso só deveria acontecer quando o timer estava realmente rodando sem resposta. Se o usuário pausou em `00:00:05`, esse valor precisa ficar congelado e nunca virar 2h ao clicar em stop.

3. Hoje o cálculo do timer está espalhado em mais de um lugar (`Index`, `SidebarMiniTimer`, `TimerContext`, modal de inatividade e RPCs). Isso cria corrida entre pause, heartbeat, auto-pausa e stop.

## Plano de correção

### 1. Corrigir o RPC de stop no banco

- Remover a sobrecarga ambígua de `stop_time_entry`.
- Manter uma única função `public.stop_time_entry(_entry_id uuid, _client_seconds integer DEFAULT NULL)`.
- Fazer essa função usar bloqueio da linha ativa para evitar corrida entre pause/resume/stop.
- Regra principal:
  - se `_client_seconds` veio do frontend, salvar exatamente esse valor, limitado apenas pelo tempo real máximo possível;
  - se não vier, usar o cálculo seguro por `start_time`, `paused_seconds` e `paused_at`.
- Garantir que o stop sempre limpe `paused_at`, grave `end_time`, grave `duration` e retorne a sessão finalizada.

### 2. Criar RPCs explícitos para pause e resume

Adicionar duas funções servidoras para parar de depender de updates soltos pelo frontend:

- `pause_time_entry(_entry_id uuid, _client_seconds integer)`
  - congela a sessão no valor que estava aparecendo na tela;
  - se o usuário pausou em 5s, o servidor passa a saber que a duração visível é 5s;
  - se o timer já estiver pausado, não recalcula nem aumenta nada.

- `resume_time_entry(_entry_id uuid)`
  - soma o tempo realmente pausado em `paused_seconds`;
  - limpa `paused_at`;
  - reinicia o heartbeat.

Com isso, pause deixa de ser “um estado local frágil” e passa a ser um estado confiável do servidor.

### 3. Centralizar o cálculo do tempo exibido

- Criar uma única função/hook de cálculo do tempo exibido.
- Usar essa mesma fonte em:
  - tela principal do timer;
  - mini timer da sidebar;
  - fullscreen timer;
  - diálogo de stop.
- Remover cálculos duplicados que hoje podem divergir.

A regra será:

```text
Rodando:  agora - start_time - paused_seconds
Pausado:  snapshot congelado no momento do pause
Stop:     snapshot exibido no momento em que o usuário iniciou o stop
```

### 4. Corrigir o comportamento do botão Stop

- Ao clicar no botão vermelho de stop, capturar imediatamente o tempo exibido naquele instante.
- O diálogo de notas/tags vai mostrar esse snapshot fixo.
- Ao confirmar, salvar esse mesmo snapshot.
- Se o timer estava pausado em `00:00:05`, o stop salva `5` segundos, mesmo que a sessão tenha ficado pausada por horas ou dias.
- Se houver erro ao salvar, o diálogo não deve fingir que salvou nem limpar estado local de pause.

### 5. Corrigir a inatividade de 2h

- A checagem de inatividade só poderá atuar quando o timer estiver rodando.
- Se o timer já estiver pausado, ela não deve abrir modal, não deve ajustar tempo e não deve transformar 5s em 2h.
- Quando passar de 2h rodando sem confirmação, ela deve congelar a sessão em 2h via `pause_time_entry`, abrir o modal e só continuar se o usuário confirmar.

### 6. Corrigir heartbeat sem quebrar o fluxo

- Garantir que `heartbeat_time_entry` exista e esteja disponível para o cliente.
- Se o heartbeat falhar, isso não pode impedir pause/stop.
- A auto-pausa deve usar heartbeat apenas para detectar abandono real, nunca para sobrescrever uma pausa manual já existente.

### 7. Corrigir o mini timer da sidebar

- Trocar o cálculo independente do `SidebarMiniTimer` pela mesma lógica central usada na tela principal.
- O botão de stop da sidebar também deve enviar o mesmo snapshot exibido, não recalcular no momento errado.

### 8. Validar os cenários críticos

Vou validar estes fluxos antes de concluir:

- iniciar timer, pausar em 5s, esperar/recarregar, clicar stop → salva 5s;
- iniciar timer e parar em 28:02 → salva 28:02;
- abrir stop dialog e demorar para confirmar → salva o tempo do clique no stop, não um valor maior;
- timer rodando por mais de 2h sem resposta → pausa em 2h e pergunta se o usuário está ali;
- timer pausado por horas/dias → continua mostrando o mesmo tempo congelado;
- erro de RPC ambígua desaparece porque só haverá uma função `stop_time_entry`.

## Observação importante

Depois da correção, o banco e o frontend passam a seguir uma regra simples: o valor salvo no `duration` será o mesmo valor visível para o usuário no momento de finalizar a sessão.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>