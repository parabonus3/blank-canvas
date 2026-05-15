# Plano: Nova Landing Page Premium do TimeZoni

Substituir `src/pages/Landing.tsx` por uma landing page cinematográfica em PT-BR, nível Awwwards, mantendo a paleta Midnight Cyan atual e tipografia Sora + Manrope.

## Stack visual
- **React + Tailwind + Framer Motion** (já no projeto)
- **Lenis** (`@studio-freight/lenis`) para smooth scroll global
- **Sora** (display) + **Manrope** (body) via Google Fonts no `index.html`
- Paleta atual cyan/teal do design system (sem alterar tokens; apenas adiciona gradientes e luzes)

## Estrutura de seções (scroll-driven)

1. **Hero cinematográfico**
   - Fundo: gradient mesh animado + partículas + cursor glow (radial-gradient seguindo mouse)
   - Headline grande em Sora: "O futuro da sua rotina começa agora."
   - Subheadline + CTAs ("Começar grátis" / "Ver demo")
   - Mock de relógio/timer 3D-feel central com anéis orbitando (SVG + Framer)
   - Badge "Novo · Disponível globalmente"

2. **Manifesto** (full-bleed, tipografia gigante)
   - Texto progressivo revelado por palavra com `useScroll` + `useTransform`
   - "Tempo é a única moeda que não volta. O TimeZoni te devolve controle sobre ela."

3. **Live Dashboard Preview** (parallax)
   - Mock de dashboard glassmorphism montando em tempo real (cards entram em sequência)
   - Números contando (`motion.span` + animação de count-up)
   - Streak, horas focadas hoje, meta semanal, calendário

4. **Features Grid Bento** (6–8 cards)
   - Timer Pro, Metas Anuais, Streaks/Defensivas, Salas de Estudo, Fusos Globais, Sons Ambiente, Mapas Mentais, Estatísticas
   - Cards glass com hover tilt sutil + ícone Lucide animado

5. **Streaks & Consistência** (split-screen)
   - Esquerda: heatmap-calendário interativo animado
   - Direita: copy sobre disciplina, defensivas, gamificação premium

6. **Metas Anuais** (timeline interativa)
   - Linha do tempo horizontal com marcos do ano expandindo no scroll
   - Barras de progresso animadas

7. **Salas & Tempo Real**
   - Mock de sala com avatares "ao vivo" pulsando
   - Texto sobre sincronização e foco compartilhado

8. **Fusos Globais**
   - Globo SVG com pontos pulsando em diferentes timezones
   - "De Tóquio a São Paulo, sua rotina sempre no ritmo certo."

9. **Pricing** (reutilizar `<PricingSection />` existente, com wrapper visual novo)

10. **CTA final + Footer**
    - CTA gigante glass com glow
    - Footer minimalista com links, idiomas, social

## Animações & técnicas
- **Lenis**: hook global em `App.tsx` ou no próprio Landing (escopo só na landing para não quebrar app interno)
- **Framer Motion**: `useScroll`, `useTransform`, `motion.div` com `whileInView`, `whileHover`, layout animations
- **Parallax** por seção via `useTransform(scrollYProgress, ...)`
- **Cursor glow**: div fixed com `mix-blend-mode: screen` seguindo mouse
- **Count-up**: hook com `animate()` da Framer
- **Glassmorphism**: `backdrop-blur-xl bg-white/5 border border-white/10`
- **Reduced motion**: respeitar `prefers-reduced-motion` desabilitando Lenis e parallax

## Responsividade
- Mobile-first: hero stack vertical, bento vira coluna única, timeline vira vertical, parallax reduzido
- Breakpoints Tailwind padrão (`sm md lg xl`)
- Touch: desabilitar cursor glow em `pointer: coarse`

## Arquivos

**Novos:**
- `src/pages/Landing.tsx` — reescrito do zero
- `src/components/landing/LenisProvider.tsx` — wrapper smooth scroll
- `src/components/landing/CursorGlow.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/Manifesto.tsx`
- `src/components/landing/DashboardPreview.tsx`
- `src/components/landing/FeaturesBento.tsx`
- `src/components/landing/StreaksSection.tsx`
- `src/components/landing/GoalsTimeline.tsx`
- `src/components/landing/RoomsSection.tsx`
- `src/components/landing/GlobeSection.tsx`
- `src/components/landing/CtaFinal.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/landing/LandingNav.tsx`
- `src/hooks/useCountUp.ts`

**Mantidos:**
- `src/components/landing/PricingSection.tsx` (reutilizado)
- Rotas, auth, design tokens — inalterados

**Editados:**
- `index.html` — adicionar Google Fonts (Sora, Manrope)
- `tailwind.config.ts` — registrar `font-display: Sora` e `font-sans: Manrope` (apenas adição, não substitui defaults globais — aplicado via classes na landing)
- `package.json` — adicionar `lenis`

## Detalhes técnicos
- Lenis instanciado só dentro de `<Landing>` via `useEffect`, destruído no unmount, para não afetar `/timer`, `/explore`, etc.
- Todas as cores via tokens HSL do design system (`hsl(var(--primary))`, `hsl(var(--background))`)
- Gradientes premium definidos inline (`linear-gradient(135deg, hsl(var(--primary)/0.15), transparent)`)
- Imagens/mocks: SVG inline + componentes React, sem assets externos pesados
- SEO: `<title>`, meta description, Open Graph atualizados na própria página com `useEffect`
- Performance: `loading="lazy"`, `will-change` apenas onde necessário, animações em `transform`/`opacity`

## Copy (PT-BR, exemplos)
- Hero: **"Domine seu tempo. Construa sua rotina. Viva no presente."**
- Manifesto: **"Cada segundo conta uma história. Conte uma que vale a pena."**
- CTA final: **"Comece hoje. Seu eu de amanhã agradece."**

Pronto para implementar quando aprovar.