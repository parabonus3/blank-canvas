## 1. Dashboard — Filtros e período visível

**Novos filtros de período** (em `src/pages/Dashboard.tsx`):
- Hoje
- Ontem (novo)
- Últimos 7 dias (novo)
- Últimos 30 dias (novo)
- Esta semana
- Semana passada (novo)
- Este mês
- Mês passado (novo)
- Este ano (novo)
- Personalizado

**Exibição do intervalo real**: logo abaixo do título do Dashboard, mostrar sempre uma linha "Período: 21/05/2026 — 27/05/2026 · 7 dias" calculada a partir do filtro ativo (não só no custom). Hoje só aparece para o custom — vamos exibir para todos.

**Filtro adicional**: dropdown de "Projeto" (multi-select) ao lado de Categoria, útil quando o usuário tem muitos projetos.

Todos os textos novos entram em todas as 12 línguas em `dashboard.*`.

## 2. PDF profissional multilíngue

Reescrever `src/lib/pdfExport.ts` (`exportDashboardToPDF`) trocando a abordagem `html2canvas` (que gera uma imagem borrada e sem tradução real) por uma geração estruturada com `jsPDF` + `jspdf-autotable`, recebendo dados reais como argumento.

Estrutura do PDF (1 página de capa + seções):

```text
┌─ Cabeçalho com gradient TimeZoni ─────────────┐
│  TimeZoni · Relatório de Produtividade        │
│  Usuário · gerado em 27/05/2026 14:32         │
├───────────────────────────────────────────────┤
│  RESUMO DO FILTRO                             │
│   Período:    Últimos 7 dias                  │
│                21/05/2026 — 27/05/2026        │
│   Categoria:  Todas                           │
│   Tipo:       Todas                           │
├───────────────────────────────────────────────┤
│  CARDS DE TOTAIS                              │
│   Hoje · Semana · Mês · Metas concluídas      │
├───────────────────────────────────────────────┤
│  GRÁFICOS (renderizados via html2canvas       │
│   apenas dos <div> dos charts, alta resolução)│
│   - Pizza: Distribuição por projeto           │
│   - Barras: Horas por projeto                 │
├───────────────────────────────────────────────┤
│  TABELA DETALHADA POR PROJETO                 │
│   Projeto · Categoria · Sessões · Tempo · %   │
├───────────────────────────────────────────────┤
│  TABELA POR CATEGORIA                         │
├───────────────────────────────────────────────┤
│  TABELA DIÁRIA (dia · tempo · sessões)        │
└─ Rodapé com paginação + URL timezoni.com ─────┘
```

Todos os títulos, headers de tabela e labels passam por `t()` (i18next), então o PDF sai na língua ativa do usuário. Datas formatadas via `useTimezone().formatInTz` com locale correto.

Charts: capturar só os SVGs do Recharts via `html2canvas` em alta DPI e inserir como imagens; o restante é texto nativo do PDF (selecionável, leve, nítido).

Responsividade do botão de export: já é responsivo, manter.

## 3. Bug do timer: tempo zera ao pausar

**Causa provável** (em `src/pages/Index.tsx` linhas 269-275 + `TimerContext.hydrateFromServer`):
- Enquanto pausado, `elapsed` é calculado como `(pauseStartTime - startTime)/1000 - pausedElapsed`.
- `hydrateFromServer` confia no servidor se `serverPausedSeconds > pausedElapsed` local.
- Se o servidor agrega a pausa em andamento (paused_seconds + tempo decorrido desde paused_at) e devolve via refetch, `pausedElapsed` cresce continuamente. Quando ultrapassa `(pauseStartTime - startTime)/1000`, `elapsed` vira negativo → clamp para 0.
- Ao parar nesse estado, salva-se duration = 0 (perda total do tempo).

**Correções**:

1. **Calcular `elapsed` no client sem subtrair `pausedElapsed` duas vezes durante pausa**. Quando `isPaused`, usar:
   ```
   elapsed = max(0, ((pauseStartTime ?? activeEntry.paused_at) - startTime)/1000 - pausedSecondsBeforeThisPause)
   ```
   onde `pausedSecondsBeforeThisPause` é o `paused_seconds` salvo *antes* da pausa atual começar (não o agregado vindo do server enquanto pausa está em curso).

2. **Endurecer `hydrateFromServer`**: ignorar atualizações de `paused_seconds` enquanto o cliente já estiver pausado com `pauseStartTime` ativo — só aceitar quando voltar para running ou na primeira hidratação.

3. **Validação no `handleStopConfirm`**: se `elapsed <= 0` mas `activeEntry.start_time` existe, recalcular `clientSeconds` como fallback a partir de `(now - start_time) - paused_seconds_real` antes de enviar, e exibir toast de aviso. Nunca enviar 0 segundos se a sessão tem >1 min de duração real.

4. **Aviso preventivo** (UX, traduzido em 12 línguas): na primeira vez que o usuário clica em Pausar (flag por usuário em `localStorage`), exibir Dialog explicando:
   - Pausa congela o cronômetro.
   - Recomendado pausas curtas (<2h).
   - Após retomar, o tempo continua.
   - Em pausas muito longas o servidor pode dessincronizar — clique em "Continuar" antes de Parar.

5. **Telemetria leve**: console.warn se detectado pausedElapsed > (now - startTime) — facilita diagnosticar regressões.

## 4. i18n

Novas chaves em todos os 12 locales (`pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ja-JP, ko-KR, zh-CN, ar-SA, ru-RU, id-ID`):

```
dashboard.yesterday
dashboard.last_7_days
dashboard.last_30_days
dashboard.last_week
dashboard.last_month
dashboard.this_year
dashboard.period_range          // "{{start}} — {{end}}"
dashboard.period_days           // "{{count}} dias"
dashboard.project_filter
dashboard.pdf.title
dashboard.pdf.generated_at
dashboard.pdf.filter_summary
dashboard.pdf.by_project
dashboard.pdf.by_category
dashboard.pdf.daily_breakdown
dashboard.pdf.sessions
dashboard.pdf.percentage
dashboard.pdf.footer
timer.pause_warning.title
timer.pause_warning.body
timer.pause_warning.dont_show_again
timer.pause_warning.got_it
timer.pause_data_loss_toast
```

## 5. Mobile

- Filtros do Dashboard reorganizados em `flex-wrap` com largura full no mobile, badges grandes (≥44px touch).
- Linha "Período: ..." quebra em 2 linhas no mobile.
- Botão Exportar PDF vira full-width no `sm:`.

## Arquivos a modificar

- `src/pages/Dashboard.tsx` — novos filtros, linha de período visível, filtro de projeto, passar dados estruturados ao PDF.
- `src/lib/pdfExport.ts` — nova função `exportDashboardToPDF(data, locale, t)` estruturada.
- `src/pages/Index.tsx` — corrigir cálculo de `elapsed` em pausa + fallback no `handleStopConfirm` + aviso primeira pausa.
- `src/contexts/TimerContext.tsx` — endurecer `hydrateFromServer` durante pausa local.
- `src/components/PauseWarningDialog.tsx` — novo componente do aviso.
- 12 arquivos em `src/i18n/locales/*.json` — chaves novas.

## Fora de escopo (não mexer)

- Lógica de start/stop do servidor (`useStopTimer`, RPCs Supabase) — só ajuste defensivo no client.
- Outras páginas que usam timer (Sala) — herdam a correção via `TimerContext`.
