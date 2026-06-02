
# Análise SEO completa — timezoni.com

## 1. Diagnóstico atual (dados Semrush)

**Posicionamento orgânico: praticamente zero.**

| Métrica | Valor | Leitura |
|---|---|---|
| Authority Score | 0/100 | Domínio novo, sem autoridade |
| Trust Score | 0/100 | Sem sinais de confiança |
| Palavras-chave orgânicas (US) | 0 | Não ranqueia para nada |
| Palavras-chave orgânicas (BR) | 0 | Não ranqueia para nada |
| Tráfego orgânico estimado | 0/mês | — |
| Backlinks | 11 (todos nofollow) | Vindos de sites de spam/teste (8coint.com, atomizelink.icu, optimizeflow.top, etc.) — **tóxicos** |
| Tendência histórica | 0 em todos os meses | Site ainda não foi indexado de forma relevante |

**Por que está assim:** o site é um SPA Vite/React com `index.html` único — Google só vê a Landing. Não há sitemap.xml, o `<title>` é "TimeZoni - Foco e Produtividade" (genérico), a description é curta, não há JSON-LD de SoftwareApplication, sem og:image, sem páginas de conteúdo (blog, comparativos, landing pages por keyword).

## 2. Oportunidades de palavras-chave

### Mercado BR (alto potencial, baixa dificuldade)

| Keyword | Volume/mês | Dificuldade | Estratégia |
|---|---|---|---|
| cronometro de estudo | 2.900 | 25 (fácil) | **Landing dedicada** + blog pillar |
| pomodoro online | 2.900 | 26 (fácil) | **Landing /pomodoro** (ferramenta web) |
| timer pomodoro | 1.900 | 42 (médio) | Mesma landing /pomodoro |
| sala de estudo online | 170 | 27 (fácil) | **Landing /salas** (feature rooms) |
| app de foco | 20 | 0 (muito fácil) | Otimizar Landing principal |

### Mercado US (mais difícil, mas com volume)

| Keyword | Volume/mês | Dificuldade |
|---|---|---|
| study timer | 5.400 | 62 |
| pomodoro timer app | 4.400 | 64 |
| focus app | 1.900 | 75 |
| virtual study room | 110 | 26 (fácil) ✅ |
| study together app | 70 | 28 (fácil) ✅ |
| study with me app | 20 | 0 (muito fácil) ✅ |

**Foco estratégico:** começar pelo BR (concorrência baixa + público nativo do app) e atacar EN com long-tail "virtual study room" / "study with me app".

## 3. Problemas técnicos a corrigir

1. **Sem sitemap.xml** → criar `public/sitemap.xml` com rotas públicas (`/`, `/pricing`, `/auth`).
2. **robots.txt** OK, mas sem diretiva `Sitemap:`.
3. **`<title>` e meta description** genéricos → reescrever com keyword principal.
4. **Sem JSON-LD** → adicionar schema `SoftwareApplication` + `Organization`.
5. **og:image ausente** → gerar imagem OG profissional (1200x630).
6. **SPA single head** → adicionar `react-helmet-async` para títulos por rota (Pricing, Auth, RoomPreview já existe e precisa de SEO).
7. **Backlinks tóxicos** → criar disavow file no Google Search Console.
8. **Search Console não verificado** (provavelmente) → adicionar meta de verificação.

## 4. Plano de ação proposto

### Fase 1 — Fundação técnica (impacto imediato em indexação)
1. Reescrever `<title>` e `<meta description>` do `index.html` com keyword forte em PT-BR ("Cronômetro de estudo, Pomodoro e salas de foco | TimeZoni").
2. Adicionar JSON-LD `SoftwareApplication` + `Organization` no `index.html`.
3. Criar `public/sitemap.xml` com rotas públicas + script `scripts/generate-sitemap.ts` rodando no `prebuild`.
4. Adicionar diretiva `Sitemap: https://timezoni.com/sitemap.xml` no `robots.txt`.
5. Instalar `react-helmet-async` e adicionar SEO por rota nas páginas públicas (`Landing`, `Pricing`, `Auth`, `RoomPreview`).
6. Gerar imagem og:image (1200x630) com branding TimeZoni.
7. Verificar domínio no Google Search Console (via meta tag) — exige conectar o conector Google Search Console.

### Fase 2 — Conteúdo SEO (impacto em 2-6 meses)
8. Criar landing pages dedicadas focadas em keywords BR de baixa dificuldade:
   - `/pomodoro` → ferramenta web grátis + texto SEO (alvo: "pomodoro online", "timer pomodoro")
   - `/cronometro-estudo` → ferramenta + guia (alvo: "cronometro de estudo")
   - `/salas-de-estudo` → showcase de rooms (alvo: "sala de estudo online")
9. Criar `/blog` com 5-10 artigos pilares (técnica Pomodoro, como estudar com foco, study with me, etc.).

### Fase 3 — Autoridade e link building
10. Criar disavow para os 11 backlinks tóxicos no GSC.
11. Estratégia de backlinks limpos: Product Hunt, BetaList, diretórios de apps de produtividade, posts convidados em blogs de estudantes/concurseiros BR.

### Fase 4 — Monitoramento contínuo
12. Conectar Semrush (connector) para construir um painel interno de tracking de keywords e visibilidade, com histórico e alertas de queda.

## 5. Próximos passos — preciso da sua escolha

Posso implementar tudo da **Fase 1** agora (é a base e dá resultado mais rápido — Google passa a entender o site corretamente). As fases 2-4 são trabalhos maiores e merecem aprovação separada.

**Pergunta:** quer que eu já entre em modo build e execute a Fase 1 completa, ou prefere começar por uma parte específica (ex: só sitemap + metas, ou já incluir a página `/pomodoro`)?
