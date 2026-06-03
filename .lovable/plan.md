
# SEO internacional — plano para os 12 idiomas

## 1. Diagnóstico do estado atual

O app já tem **12 traduções** (`pt-BR`, `en-US`, `es-ES`, `fr-FR`, `ja-JP`, `de-DE`, `ar-SA`, `ko-KR`, `zh-CN`, `it-IT`, `ru-RU`, `id-ID`), mas para o Google **só existe um site em pt-BR**. Motivos:

- Uma única URL (`/`) serve todos os idiomas; a tradução acontece client-side via `i18next` depois do JS rodar. Google indexa o HTML inicial em pt-BR e nunca vê as outras versões.
- `index.html` tem `lang="pt-BR"` fixo, `<title>` e `<meta description>` só em português.
- **Não há `hreflang`** — Google não sabe que existem versões em outros idiomas.
- `sitemap.xml` lista só 3 URLs em pt-BR.
- O `SEO.tsx` (helmet) não é usado em rota nenhuma ainda.

Resultado prático: zero tráfego orgânico nos mercados US, ES, FR, DE, JP, KR, CN, IT, RU, ID, AR — mesmo com o conteúdo já traduzido.

## 2. Oportunidades por mercado (dados Semrush)

Foco em keywords de **baixa dificuldade (<30)** com volume relevante:

| Mercado | Keyword âncora | Volume/mês | KDI | Por quê |
|---|---|---|---|---|
| 🇯🇵 JP | オンライン 自習室 | 2.900 | 27 ✅ | Cultura "study with me" é forte no Japão |
| 🇯🇵 JP | 勉強 タイマー | 18.100 | 36 | Volume gigantesco |
| 🇪🇸 ES | temporizador pomodoro | 880 | 28 ✅ | Mercado LATAM + Espanha |
| 🇪🇸 ES | app para estudiar | 590 | 26 ✅ | Intenção forte |
| 🇰🇷 KR | 공부 타이머 | 1.000 | 23 ✅ | "Study with me" nasceu na Coreia |
| 🇰🇷 KR | 스터디 윗미 | 1.000 | 26 ✅ | Match perfeito com o produto |
| 🇩🇪 DE | fokus app | 140 | 26 ✅ | Concorrência baixa |
| 🇩🇪 DE | virtueller lernraum | 20 | 0 ✅ | Quick win |
| 🇫🇷 FR | application concentration | 30 | 0 ✅ | Quick win |
| 🇮🇹 IT | sala studio online | 20 | 0 ✅ | Quick win |
| 🇷🇺 RU | приложение для концентрации | 140 | 24 ✅ | |
| 🇺🇸 US | virtual study room | 110 | 26 ✅ | |
| 🇺🇸 US | study with me app | 20 | 0 ✅ | |

JP e KR são os **maiores ganhos potenciais** (cultura nativa de "study with me" + volume alto + KDI baixo).

## 3. Estratégia de arquitetura: rotas por idioma com prefixo

Em vez do app trocar idioma client-side numa URL única, criar **URLs separadas por idioma**:

```
timezoni.com/         → pt-BR (default, sem prefixo)
timezoni.com/en/      → en-US
timezoni.com/es/      → es-ES
timezoni.com/fr/      → fr-FR
timezoni.com/de/      → de-DE
timezoni.com/it/      → it-IT
timezoni.com/ja/      → ja-JP
timezoni.com/ko/      → ko-KR
timezoni.com/zh/      → zh-CN
timezoni.com/ru/      → ru-RU
timezoni.com/ar/      → ar-SA
timezoni.com/id/      → id-ID
```

Cada URL serve o **mesmo SPA**, mas:
- Detecta o idioma pelo prefixo e força `i18n.changeLanguage()` antes do primeiro render
- Injeta via `react-helmet-async` o `<html lang>`, `<title>`, `<meta description>` traduzidos
- Adiciona `<link rel="alternate" hreflang="...">` para todas as versões + `x-default`

Mesmo sendo SPA, o Googlebot moderno (Chromium-based) executa JS e indexa cada URL como uma página separada, contanto que `hreflang` e `lang` mudem por rota.

## 4. Plano de execução

### Fase A — Roteamento i18n (base técnica)

1. Adicionar rota wrapper `/<lang>/*` no `App.tsx` que:
   - Lê o prefixo (`en`, `es`, `fr`, ...) e chama `i18n.changeLanguage(code)` antes de renderizar
   - Renderiza as mesmas rotas internas (Landing, Pricing, Auth, RoomPreview)
   - Default (sem prefixo) continua em pt-BR (preserva URLs já indexadas)
2. Atualizar `LanguageSwitcher` para navegar para `/<lang>/...` em vez de só trocar o i18n.

### Fase B — Metas SEO por idioma

3. Criar `src/lib/seoTranslations.ts` com `title` + `description` por idioma das páginas públicas (Landing, Pricing, Auth), usando as keywords âncora da tabela acima.
4. Aplicar `<SEO>` em `Landing`, `Pricing`, `Auth` lendo o idioma atual e mandando o texto traduzido + `path` correto (com prefixo).
5. Estender `SEO.tsx` para emitir:
   - `<html lang="...">` (via `<Helmet htmlAttributes>`)
   - `<link rel="alternate" hreflang="x" href="https://timezoni.com/x/...">` para os 12 idiomas + `x-default` apontando pra raiz
   - `<meta property="og:locale">` correto + `og:locale:alternate` para os outros

### Fase C — Sitemap internacional

6. Reescrever `scripts/generate-sitemap.ts` para gerar entradas para cada (rota × idioma), cada `<url>` com seus `<xhtml:link rel="alternate" hreflang>` (formato oficial recomendado pelo Google). Isso multiplica o sitemap por 12 e dá ao Google um mapa explícito.

### Fase D — Conteúdo localizado (próxima leva, depois da Fase A-C ir ao ar)

7. Landings por keyword nos mercados-alvo (não precisam de tradução para começar):
   - `/ja/jishuushitsu` → focada em "オンライン 自習室" (JP) — maior ROI
   - `/ko/study-with-me` → focada em "스터디 윗미" (KR)
   - `/es/temporizador-pomodoro` (ES)
   - `/pomodoro`, `/cronometro-estudo`, `/salas-de-estudo` (BR — já no plano original)

### Fase E — Sinalização externa

8. Submeter o novo sitemap no Google Search Console (já temos a verificação pronta).
9. Disavow dos 11 backlinks tóxicos.
10. Inscrição em diretórios locais: Product Hunt (global), 99fav (KR), Vector (JP), Genially/Educaplay (ES).

## 5. Detalhes técnicos

**Por que prefixo de idioma e não subdomínio (en.timezoni.com)?**
Prefixo é mais simples (não exige config de DNS/Vercel novo), preserva autoridade no domínio raiz e é o padrão recomendado pelo Google para SPAs que servem o mesmo app.

**Por que não SSR / Next.js?**
Mudaria a stack inteira. Google JS-rendering cobre bem SPAs hoje quando `hreflang` e `lang` mudam por URL. Crawlers de social preview (Facebook/LinkedIn) ainda vão usar a meta do `index.html` (limitação conhecida do stack Vite — fica como dívida documentada).

**O que NÃO vamos mexer:**
- Conteúdo das traduções existentes (já estão prontas)
- Estrutura do `i18n/index.ts`
- Rotas protegidas (admin, dashboard, etc.) — continuam sem prefixo e com `noindex`

## 6. Impacto esperado

- Indexação de 12× mais páginas em ~2-4 semanas após Fase A-C
- Primeiros rankings em JP e KR (cultura "study with me") em 1-3 meses
- Tráfego orgânico começando a aparecer em 2-6 meses (sites novos demoram)

## 7. Próximo passo

Posso executar **Fases A, B, C de uma vez** (roteamento + metas + sitemap internacional) — é o pacote técnico que destrava tudo. As Fases D e E são trabalho separado depois que isso indexar.

Aprova partir pra build com A+B+C?
