## Redesign Landing TimeZoni — Awwwards Premium

### Objetivo
Reconstruir `src/pages/Landing.tsx` (+ seções) num experience cinematográfico, mantendo **todas as i18n keys atuais** (pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ja-JP, ko-KR, zh-CN, ru-RU, ar-SA, id-ID) e adicionando novas keys apenas onde precisar de novos textos — sempre nos 12 idiomas.

### Stack visual
- **Paleta**: ciano atual da marca (`#06b6d4` / `#22d3ee`) sobre base escura `#0a0e1a → #0f172a`, com glassmorphism e gradientes aurora sutis em ciano.
- **Tipografia**: Sora (headings) + Manrope (body) via Google Fonts em `index.html`.
- **Animações**: Framer Motion (já instalado) + **Lenis** (nova dep, ~10kb) para smooth scroll global.
- **Sem libs pesadas**: nada de Three.js / GSAP / Locomotive. Tudo via Motion + CSS para garantir 60fps.

### Estrutura de seções (rolagem narrativa)

```text
1. HERO cinematográfico
   - Smooth scroll Lenis ativo
   - Background: grid animado + aurora gradient + spotlight que segue o cursor
   - Título com reveal por palavra (stagger), subtítulo com fade-up
   - Relógio 3D em SVG/Motion com parallax no scroll
   - CTAs com magnetic hover + ripple

2. MARQUEE de valores (scroll horizontal infinito)
   - "Foco · Disciplina · Streaks · Metas · Tempo · Evolução"

3. PROBLEM (3 cards glassmorphism)
   - Reveal escalonado on scroll, tilt 3D suave no hover

4. SOLUTION manifesto
   - Texto grande tipo Linear, palavras destacadas em ciano que "acendem" no scroll

5. DASHBOARD LIVE (showcase principal)
   - Mock do app montando em tempo real ao scrollar:
     timer rodando, números contando (CountUp), barra de progresso preenchendo,
     calendário heatmap surgindo célula a célula, streak flame pulsando
   - Sticky scroll: dashboard fixa enquanto features explicativas passam ao lado

6. FEATURES bento grid (6 cards assimétricos)
   - Cada card com micro-animação própria (timer, pomodoro tomato, waveform sons,
     gráfico metas, lista history, troféu achievements)
   - Hover: glow ciano + scale + shadow

7. HOW IT WORKS — timeline vertical animada
   - Linha desenhada via SVG path stroke-dasharray no scroll
   - 3 steps com ícones que "ligam" quando entram no viewport

8. STATS — números gigantes contando
   - Intersection observer dispara CountUp

9. GLOBAL TIMEZONES showcase
   - Globo SVG simples com pulses em cidades + relógios de fusos

10. FINAL CTA
    - Aurora gradient pulsando, botão magnetic
    - Link discreto para SAC mantido

11. PRICingSection (mantida, só re-skin de wrapper para combinar com novo dark)
```

### Microinterações globais
- **Magnetic buttons** (CTAs principais): hook custom `useMagnetic`
- **Spotlight cursor** no hero: gradient radial que segue mouse
- **Scroll progress bar** fina no topo
- **Reveal on scroll**: utilitário `<Reveal>` com `whileInView` (já padrão Motion)
- **Parallax** em camadas do hero via `useScroll` + `useTransform`
- **Tilt 3D** nos cards via mouse position → rotateX/rotateY
- **Number counters** com `useMotionValue` + `animate()`

### Performance
- Lenis configurado com `lerp: 0.1`, `wheelMultiplier: 1`
- `prefers-reduced-motion` desativa Lenis e animações pesadas
- Lazy-load das seções abaixo da fold via `loading="lazy"` em imagens
- Sem bibliotecas de canvas/WebGL → mantém bundle leve e mobile-friendly

### Responsividade
- Mobile-first: hero stacked, marquee mais lento, bento vira coluna única, sticky dashboard vira carrossel horizontal snap
- Touch: desativa parallax cursor, mantém scroll reveal
- Testar em 375px, 768px, 1280px, 1920px

### Arquitetura de arquivos

```text
src/pages/Landing.tsx                  (orquestra + Lenis provider)
src/components/landing/
  ├─ HeroSection.tsx                   (novo, cinematográfico)
  ├─ MarqueeValues.tsx                 (novo)
  ├─ ProblemSection.tsx                (extrair + redesign)
  ├─ SolutionSection.tsx               (extrair + redesign)
  ├─ DashboardShowcase.tsx             (novo, sticky scroll)
  ├─ FeaturesBento.tsx                 (substitui FeaturesSection)
  ├─ HowItWorksTimeline.tsx            (substitui HowItWorksSection)
  ├─ StatsCounter.tsx                  (substitui StatsSection)
  ├─ GlobalTimezones.tsx               (novo)
  ├─ FinalCTA.tsx                      (extrair + redesign)
  ├─ PricingSection.tsx                (mantida, re-skin leve)
  └─ primitives/
      ├─ Reveal.tsx                    (wrapper whileInView)
      ├─ MagneticButton.tsx
      ├─ SpotlightCursor.tsx
      ├─ ScrollProgress.tsx
      ├─ CountUp.tsx
      └─ TiltCard.tsx
src/hooks/
  ├─ useLenis.ts                       (novo)
  └─ useMagnetic.ts                    (novo)
src/index.css                          (adiciona tokens: --aurora, --glass-*, fontes Sora/Manrope, scroll-behavior)
index.html                             (Google Fonts Sora + Manrope preconnect)
```

### i18n
- **Manter 100%** das keys atuais usadas no Landing (`landing.*`, `sidebar.support`).
- **Novas keys** a adicionar nos 12 arquivos `src/i18n/locales/*.json`:
  - `landing.hero_eyebrow` ("O futuro da produtividade")
  - `landing.marquee_*` (6 termos)
  - `landing.dashboard_showcase_title/subtitle` + 3 feature labels
  - `landing.timezones_title/subtitle`
  - `landing.scroll_hint` ("Role para descobrir")
- Tradução nativa pt-BR + en-US, demais idiomas com tradução fiel (sem placeholders).

### Dependências
- `+ lenis` (npm). Sem outras adições.

### Detalhes técnicos
- Lenis integrado via `useEffect` em `Landing.tsx` com cleanup; desativado se `matchMedia('(prefers-reduced-motion: reduce)').matches`.
- `useScroll` do Motion compartilhado com Lenis via raf (`lenis.on('scroll', ScrollTrigger?.update)` não necessário — Motion lê window scroll nativamente).
- Tokens novos em `index.css`:
  - `--aurora: radial-gradient(ellipse at top, hsl(189 94% 43% / 0.25), transparent 60%)`
  - `--glass-bg: hsl(217 33% 17% / 0.4)`, `--glass-border: hsl(189 94% 43% / 0.15)`
  - `.font-display { font-family: 'Sora', sans-serif }`, `body { font-family: 'Manrope', sans-serif }`
- Sem mudanças no backend, rotas, auth ou app interno. `useEffect` que redireciona logado para `/timer` é preservado.

### Fora do escopo
- App autenticado (`/timer`, `/rooms`, etc.)
- Páginas `/auth`, `/pricing` standalone, `/sac/*`
- Backend, RPCs, migrations
