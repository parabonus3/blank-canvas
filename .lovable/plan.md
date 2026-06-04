
# Próximo passo — Fases D e E do SEO internacional

Fases A+B+C já estão no ar (rotas `/<lang>/*`, metas traduzidas, hreflang, sitemap com 36 URLs). Agora o trabalho deixa de ser técnico e passa a ser **conteúdo + sinalização externa**. Sem isso, o Google vê as 36 URLs mas não tem motivo pra rankear nenhuma — falta página dedicada por keyword e backlinks.

## 1. O que falta resolver

| Problema | Sintoma | Solução |
|---|---|---|
| Landing única tenta rankear pra tudo | Diluição: nenhuma keyword fica forte | Landings dedicadas por keyword âncora |
| Zero backlinks nos novos mercados | Domain Authority não cresce fora do BR | Diretórios + Product Hunt + parcerias locais |
| Sitemap novo não foi submetido | Google demora 2-4 semanas pra descobrir sozinho | Submeter via GSC + ping |
| 11 backlinks tóxicos no perfil | Risco de penalização | Disavow file no GSC |
| Sem dados de tráfego por idioma | Não dá pra medir o que funciona | GA4 com dimensão de idioma + GSC por país |

## 2. Fase D — Landing pages localizadas (maior ROI)

Criar landings dedicadas por keyword nos mercados de maior potencial. Cada landing é uma **rota pública nova**, indexável, com copy 100% focado numa keyword âncora — não é só tradução da home.

### Prioridade 1 — Mercados com cultura "study with me" nativa

| Rota | Mercado | Keyword alvo | Volume | KDI |
|---|---|---|---|---|
| `/ja/jishuushitsu` | 🇯🇵 JP | オンライン 自習室 | 2.900 | 27 |
| `/ja/benkyou-timer` | 🇯🇵 JP | 勉強 タイマー | 18.100 | 36 |
| `/ko/study-with-me` | 🇰🇷 KR | 스터디 윗미 | 1.000 | 26 |
| `/ko/gongbu-timer` | 🇰🇷 KR | 공부 타이머 | 1.000 | 23 |

### Prioridade 2 — Quick wins (KDI baixo, concorrência mínima)

| Rota | Mercado | Keyword alvo | Volume | KDI |
|---|---|---|---|---|
| `/en/virtual-study-room` | 🇺🇸 US | virtual study room | 110 | 26 |
| `/en/study-with-me-app` | 🇺🇸 US | study with me app | 20 | 0 |
| `/es/temporizador-pomodoro` | 🇪🇸 ES | temporizador pomodoro | 880 | 28 |
| `/es/app-para-estudiar` | 🇪🇸 ES | app para estudiar | 590 | 26 |
| `/de/fokus-app` | 🇩🇪 DE | fokus app | 140 | 26 |
| `/de/virtueller-lernraum` | 🇩🇪 DE | virtueller lernraum | 20 | 0 |
| `/fr/application-concentration` | 🇫🇷 FR | application concentration | 30 | 0 |
| `/it/sala-studio-online` | 🇮🇹 IT | sala studio online | 20 | 0 |
| `/ru/prilozhenie-koncentracii` | 🇷🇺 RU | приложение для концентрации | 140 | 24 |

### Prioridade 3 — Mercado BR (já no plano original)

| Rota | Keyword |
|---|---|
| `/pomodoro` | técnica pomodoro / pomodoro online |
| `/cronometro-estudo` | cronômetro de estudo |
| `/salas-de-estudo` | salas de estudo online |

### Estrutura de cada landing

Cada landing reusa o layout da Landing principal mas com:
- **H1** com a keyword exata
- **Meta title/description** focados na keyword (entrar no `seoTranslations.ts`)
- **Bloco de copy** explicando o conceito local (ex: na JP, falar de "study with me" como já-conhecido; na DE, explicar o que é "fokus app")
- **FAQ JSON-LD** com 4-6 perguntas naturais da região (oportunidade de SERP feature)
- **CTA** redireciona pro `/auth` no idioma correto
- **Screenshot** com UI no idioma da landing
- Adicionada ao `generate-sitemap.ts` com hreflang correto

Implementação: componente `<LocalizedLanding>` parametrizado por `(slug, lang, copy)` — uma definição, 13 instâncias. Evita 13 arquivos duplicados.

## 3. Fase E — Sinalização externa (sem isso, indexação é lenta)

### E.1 — Google Search Console (ação imediata, 1 dia)
- Submeter `/sitemap.xml` no GSC (agora com 36 URLs + landings D = ~49 URLs)
- Solicitar indexação manual das 4 landings P1 (JP + KR)
- Subir disavow file com os 11 backlinks tóxicos
- Adicionar propriedades `sc-domain:timezoni.com` se ainda for por URL-prefix

### E.2 — Diretórios e marketplaces (1-2 semanas)

| Diretório | Mercado | Por quê |
|---|---|---|
| Product Hunt | Global | Pico de tráfego + backlink DR 90+ |
| AlternativeTo | Global | Comparação com Forest, Focusmate |
| StartupBase, BetaList | Global | Backlinks fáceis |
| 99fav.com | 🇰🇷 KR | Diretório de apps coreano |
| Vector / FreeSoft | 🇯🇵 JP | Diretórios de software JP |
| Genially, Educaplay | 🇪🇸 ES | Comunidades educacionais ES/LATAM |
| t3n, Deutsche Startups | 🇩🇪 DE | Imprensa tech alemã |

### E.3 — Conteúdo de aquisição (mês 2-3)
- 1 post de blog por mercado P1 traduzido nativamente (não Google Translate):
  - JP: "オンライン自習室の使い方 — 集中力を3倍にする方法"
  - KR: "스터디 윗미로 공부 습관 만들기"
- Hosteado em `/<lang>/blog/<slug>` com Article JSON-LD

## 4. Medição

Adicionar antes de começar a Fase D:
- **GA4 custom dimension** = idioma do prefixo da URL (pra ver tráfego por idioma)
- **GSC**: filtrar Performance por país a cada 2 semanas
- **KPI 30 dias**: ≥30 das 49 URLs indexadas
- **KPI 90 dias**: primeiras impressões em JP/KR pra keywords alvo
- **KPI 180 dias**: primeiros cliques orgânicos fora do BR

## 5. Ordem de execução sugerida

1. **Sprint 1 (essa leva)** — Fase D Prioridade 1: 4 landings JP+KR + adicionar ao sitemap + submeter no GSC
2. **Sprint 2** — Fase D Prioridade 2: 9 landings quick-win
3. **Sprint 3** — Fase D Prioridade 3 (BR) + disavow + diretórios globais
4. **Sprint 4+** — Blog posts nativos + diretórios locais

## 6. Decisões que preciso de você

1. **Componente único parametrizado vs página por arquivo?** Recomendo único (`<LocalizedLanding>`) — menos código, mais fácil manter as 13.
2. **FAQ JSON-LD por landing?** Recomendo sim — é a forma mais fácil de pegar SERP feature em mercados de baixa concorrência.
3. **Começo só pelo Sprint 1 (4 landings JP+KR, maior ROI)** ou já vou direto até o Sprint 2 (13 landings total)?
4. **GA4**: já está instalado no projeto? Se não, adicionar agora pra ter baseline antes de publicar as landings.

Aprovando, executo Sprint 1 + setup de medição.
