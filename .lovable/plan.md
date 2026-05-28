## O que parece estar acontecendo

Sim, o relato faz sentido pelo fluxo atual do código. A correção anterior evitou o cronômetro zerar ao clicar em play depois do pause, mas criou/expôs outro risco: quando o usuário volta do pause, o cálculo de `elapsed` pode ficar “preso” porque o efeito que atualiza o cronômetro fecha sobre um valor antigo de `elapsed` e a guarda anti-zeramento pode impedir novas atualizações. Além disso, o estado local de pausa e o estado vindo do servidor ainda podem disputar quem é a fonte da verdade logo após o resume.

## Plano inteligente de correção

1. **Tornar o cálculo do cronômetro determinístico**
   - Em `src/pages/Index.tsx`, ajustar o `useEffect` do `elapsed` para usar atualização funcional (`setElapsed(prev => ...)`) dentro do intervalo.
   - Isso evita depender do `elapsed` antigo capturado pelo closure do React.
   - A guarda anti-regressão continuará existindo, mas usando `prev` como último valor confiável.

2. **Garantir que o play depois do pause volte a contar**
   - No ramo “rodando” (`!isPaused`), quando o cálculo for válido, sempre atualizar para `grossSinceStart - pausedElapsed`.
   - Se houver dessincronia (`pausedElapsed > grossSinceStart`), manter o último tempo visível, sem zerar.
   - Assim o cronômetro não volta para `00:00:00` e também não fica congelado quando a conta está saudável.

3. **Evitar corrida entre resume local e refetch do servidor**
   - Revisar o `hydrateFromServer` para não reativar `isPaused` com dados antigos de `paused_at` logo após o usuário clicar em play.
   - A ideia é ignorar hidratações obsoletas quando o cliente acabou de sair do pause, sem mexer nos RPCs nem na estrutura do banco.

4. **Aplicar a mesma proteção no mini timer da sidebar**
   - `src/components/SidebarMiniTimer.tsx` tem um cálculo separado e hoje não tem as mesmas defesas do timer principal.
   - Ajustar para usar a mesma lógica segura: não zerar por dessincronia e continuar contando após resume.
   - Isso evita a tela principal mostrar uma coisa e a sidebar outra.

5. **Preservar o salvamento seguro**
   - Manter o fallback já existente em `handleStopConfirm`, que recalcula pelo servidor caso o tempo visual esteja suspeitamente baixo.
   - Não alterar `stop_time_entry`, `pause_time_entry`, `resume_time_entry`, streak, salas, dashboard, PDF ou traduções.

## Arquivos que serão alterados

- `src/pages/Index.tsx`
- `src/components/SidebarMiniTimer.tsx`
- Possivelmente `src/contexts/TimerContext.tsx`, apenas se necessário para bloquear hidratação obsoleta pós-resume.

## Verificação esperada

Depois da implementação, o fluxo correto deve ser:

```text
Start -> conta normalmente
Pause -> congela no tempo atual
Play -> continua a partir do tempo congelado
Stop -> salva o tempo real exibido, nunca 0 por causa do pause/resume
```

Também será verificado que:

- O cronômetro principal continua contando após play.
- A sidebar acompanha o mesmo tempo.
- O timer não volta para `00:00:00` por dessincronia.
- O fluxo atual de servidor/RPC continua intacto.