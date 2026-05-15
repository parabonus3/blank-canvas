import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Calendar,
  Flame,
  Globe2,
  Headphones,
  LineChart,
  Sparkles,
  Target,
  Timer as TimerIcon,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { PricingSection } from "@/components/landing/PricingSection";
import { LenisProvider } from "@/components/landing/LenisProvider";
import { CursorGlow } from "@/components/landing/CursorGlow";
import { useCountUp } from "@/hooks/useCountUp";
import logo from "@/assets/logo.png";

/* ------------------------------------------------------------------ */
/*  NAV                                                                */
/* ------------------------------------------------------------------ */

function LandingNav() {
  const { user } = useAuth();
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-background/40 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="TimeZoni" className="h-7 w-7" />
          <span className="font-display text-base font-semibold tracking-tight text-foreground">
            TimeZoni
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#manifesto" className="transition hover:text-foreground">Manifesto</a>
          <a href="#features" className="transition hover:text-foreground">Recursos</a>
          <a href="#streaks" className="transition hover:text-foreground">Consistência</a>
          <a href="#pricing" className="transition hover:text-foreground">Planos</a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/timer">Abrir app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/auth">Começar grátis</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  HERO                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  const navigate = useNavigate();

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 pt-24">
      {/* Background mesh */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, hsl(var(--accent) / 0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 20% 80%, hsl(var(--primary) / 0.08), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background)))]" />
        {/* Grid */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M 56 0 L 0 0 0 56" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div style={{ y, opacity, scale }} className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            Novo · Disponível globalmente
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-[44px] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-[88px]"
        >
          Domine seu tempo.
          <br />
          <span className="bg-gradient-to-r from-primary via-cyan-300 to-accent bg-clip-text text-transparent">
            Construa sua rotina.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-6 max-w-2xl font-body text-base text-muted-foreground sm:text-lg"
        >
          A plataforma de produtividade que transforma minutos em propósito. Foco
          cinematográfico, metas vivas e consistência mensurada — em qualquer fuso, todo dia.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button
            size="lg"
            className="group h-12 rounded-full px-7 text-base shadow-[0_0_40px_-10px_hsl(var(--primary))]"
            onClick={() => navigate("/auth")}
          >
            Começar grátis
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="h-12 rounded-full border border-white/10 bg-white/5 px-7 text-base backdrop-blur-md hover:bg-white/10"
          >
            <a href="#features">Ver demo</a>
          </Button>
        </motion.div>

        {/* Orbiting timer mock */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto mt-16 h-[280px] w-[280px] sm:h-[360px] sm:w-[360px]"
        >
          <OrbitingTimer />
        </motion.div>
      </motion.div>

      {/* scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
      >
        Role para explorar
      </motion.div>
    </section>
  );
}

function OrbitingTimer() {
  return (
    <div className="relative h-full w-full">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary)/0.25) 0%, transparent 60%)",
          filter: "blur(40px)",
        }}
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-white/10"
          style={{ scale: 1 - i * 0.15 }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="absolute h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
            style={{ top: -4, left: "50%", transform: "translateX(-50%)" }}
          />
        </motion.div>
      ))}
      <div className="absolute inset-[18%] rounded-full border border-white/10 bg-background/40 backdrop-blur-xl" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-light tabular-nums tracking-tight sm:text-6xl">
          02:34:18
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Foco · Hoje
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MANIFESTO                                                          */
/* ------------------------------------------------------------------ */

function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const words = "Tempo é a única moeda que não volta. O TimeZoni te devolve o controle.".split(" ");

  return (
    <section id="manifesto" ref={ref} className="relative px-4 py-32 sm:py-44">
      <div className="mx-auto max-w-5xl">
        <p className="mb-8 text-center text-xs uppercase tracking-[0.4em] text-primary/80">
          Manifesto
        </p>
        <h2 className="font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-5xl md:text-6xl">
          {words.map((w, i) => {
            const start = i / words.length;
            const end = start + 1 / words.length;
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const o = useTransform(scrollYProgress, [0.1 + start * 0.6, 0.1 + end * 0.6], [0.15, 1]);
            return (
              <motion.span key={i} style={{ opacity: o }} className="inline-block pr-[0.25em]">
                {w}
              </motion.span>
            );
          })}
        </h2>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  DASHBOARD PREVIEW                                                  */
/* ------------------------------------------------------------------ */

function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const hours = useCountUp(184, 1600, inView);
  const streak = useCountUp(47, 1400, inView);
  const goals = useCountUp(12, 1200, inView);

  const cards = [
    { delay: 0, span: "md:col-span-2", node: (
      <Card className="h-full">
        <Subtle>Foco semanal</Subtle>
        <div className="mt-2 flex items-end gap-2">
          <div className="font-display text-5xl font-light tabular-nums">{hours.toFixed(0)}<span className="text-lg text-muted-foreground">h</span></div>
          <div className="mb-2 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> +18%
          </div>
        </div>
        <Bars />
      </Card>
    )},
    { delay: 0.1, span: "", node: (
      <Card className="h-full">
        <Subtle>Streak</Subtle>
        <div className="mt-2 flex items-center gap-2">
          <Flame className="h-7 w-7 text-orange-400" />
          <span className="font-display text-5xl font-light tabular-nums">{streak.toFixed(0)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">dias consecutivos</p>
      </Card>
    )},
    { delay: 0.2, span: "", node: (
      <Card className="h-full">
        <Subtle>Metas ativas</Subtle>
        <div className="mt-2 font-display text-5xl font-light tabular-nums">{goals.toFixed(0)}</div>
        <div className="mt-3 space-y-1.5">
          {[78, 52, 34].map((p, i) => (
            <div key={i} className="h-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${p}%` } : {}}
                transition={{ duration: 1.2, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          ))}
        </div>
      </Card>
    )},
    { delay: 0.3, span: "md:col-span-2", node: (
      <Card className="h-full">
        <Subtle>Heatmap · 12 semanas</Subtle>
        <Heatmap inView={inView} />
      </Card>
    )},
  ];

  return (
    <section ref={ref} className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary/80">Dashboard</p>
          <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Sua rotina, em tempo real.
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Cada sessão alimenta gráficos, metas e streaks. Nada se perde — tudo evolui.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {cards.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: c.delay, ease: [0.16, 1, 0.3, 1] }}
              className={c.span}
            >
              {c.node}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-xl ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      {children}
    </div>
  );
}

function Subtle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{children}</div>;
}

function Bars() {
  const heights = [40, 55, 30, 70, 45, 85, 60];
  return (
    <div className="mt-4 flex h-20 items-end gap-2">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 rounded-t bg-gradient-to-t from-primary/40 to-primary"
        />
      ))}
    </div>
  );
}

function Heatmap({ inView }: { inView: boolean }) {
  const cells = useMemo(
    () => Array.from({ length: 12 * 7 }, () => Math.random()),
    []
  );
  return (
    <div className="mt-4 grid grid-cols-12 gap-1">
      {cells.map((v, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.4, delay: (i % 12) * 0.02 + Math.floor(i / 12) * 0.03 }}
          className="aspect-square rounded-[3px]"
          style={{
            background:
              v > 0.75
                ? "hsl(var(--primary))"
                : v > 0.5
                ? "hsl(var(--primary) / 0.6)"
                : v > 0.25
                ? "hsl(var(--primary) / 0.3)"
                : "hsl(var(--foreground) / 0.06)",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES BENTO                                                     */
/* ------------------------------------------------------------------ */

function FeaturesBento() {
  const items = [
    { icon: TimerIcon, title: "Timer cinematográfico", desc: "Modo full-screen, cronômetro tabular e Pomodoro com transições suaves." },
    { icon: Target, title: "Metas anuais vivas", desc: "Categorias, projetos e marcos que evoluem conforme você foca." },
    { icon: Flame, title: "Streaks & defensivas", desc: "Mantenha sequências, recupere dias com escudos e celebre marcos." },
    { icon: Users, title: "Salas de estudo", desc: "Foque junto, em tempo real, com ranking e presença ao vivo." },
    { icon: Globe2, title: "Fusos globais", desc: "Sua rotina respeita seu fuso. O ranking global respeita o mundo." },
    { icon: Headphones, title: "Sons ambiente", desc: "Chuva, café, lo-fi e ruído branco — design sonoro para foco profundo." },
    { icon: Brain, title: "Mapas mentais", desc: "Organize ideias com canvas interativo e templates inteligentes." },
    { icon: LineChart, title: "Estatísticas profundas", desc: "Heatmaps, histórico, exportação e insights por projeto." },
  ];

  return (
    <section id="features" className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary/80">Recursos</p>
          <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Tudo que sua rotina precisa.
            <br />
            <span className="text-muted-foreground">Nada que você não use.</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 backdrop-blur-xl transition-colors hover:border-primary/40"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <it.icon className="h-5 w-5" />
              </div>
              <h4 className="font-display text-base font-semibold">{it.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: "hsl(var(--primary) / 0.25)" }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  STREAKS                                                            */
/* ------------------------------------------------------------------ */

function StreaksSection() {
  return (
    <section id="streaks" className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="order-2 md:order-1"
        >
          <Card className="aspect-square">
            <Subtle>Constância · 12 semanas</Subtle>
            <Heatmap inView />
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-orange-400" /> 47 dias</span>
              <span>Próximo marco · 50</span>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="order-1 md:order-2"
        >
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary/80">Consistência</p>
          <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Disciplina vira identidade.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Streaks, defensivas e missões transformam pequenos gestos diários em uma narrativa
            de progresso. Erre um dia? Use um escudo. Bata um marco? Veja sua árvore crescer.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {["Gamificação premium e sutil", "Defensivas para dias difíceis", "Conquistas e árvore de evolução"].map((li, i) => (
              <li key={i} className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> {li}</li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  GOALS TIMELINE                                                     */
/* ------------------------------------------------------------------ */

function GoalsTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 20%"] });
  const lineWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <section ref={ref} className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary/80">Metas anuais</p>
          <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Um ano. Uma linha. Sua história.
          </h3>
        </div>
        <div className="relative">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
          <motion.div
            style={{ width: lineWidth }}
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_12px_hsl(var(--primary))]"
          />
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {months.map((m, i) => {
              const active = useTransform(scrollYProgress, [i / 12, (i + 1) / 12], [0, 1]);
              return (
                <div key={m} className="flex flex-col items-center gap-3 py-8">
                  <motion.div
                    style={{ scale: useTransform(active, [0, 1], [0.6, 1]), opacity: useTransform(active, [0, 1], [0.3, 1]) }}
                    className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  ROOMS                                                              */
/* ------------------------------------------------------------------ */

function RoomsSection() {
  const avatars = [0, 1, 2, 3, 4, 5];
  return (
    <section className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary/80">Salas em tempo real</p>
          <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Foco coletivo. Energia compartilhada.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Entre em uma sala, veja quem está focando agora, acompanhe rankings e celebre
            marcos juntos. Solidão é opcional — disciplina não.
          </p>
        </div>
        <Card className="aspect-[4/3]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <span className="text-xs text-muted-foreground">6 focando agora</span>
            </div>
            <Subtle>Sala · Engenharia</Subtle>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {avatars.map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="aspect-square rounded-xl border border-white/10 bg-gradient-to-br from-primary/20 to-accent/10 p-3"
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Foco</div>
                    <div className="font-display text-sm tabular-nums">0{i + 1}:{(20 + i * 7).toString().padStart(2, "0")}:34</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  GLOBE                                                              */
/* ------------------------------------------------------------------ */

function GlobeSection() {
  const dots = useMemo(
    () => Array.from({ length: 24 }, () => ({
      x: Math.random() * 360 - 180,
      y: Math.random() * 140 - 70,
      d: Math.random() * 3,
    })),
    []
  );
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary/80">Fusos globais</p>
        <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
          De Tóquio a São Paulo,
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            sua rotina sempre no ritmo certo.
          </span>
        </h3>
        <div className="relative mx-auto mt-16 aspect-[2/1] max-w-3xl">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-white/10"
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.15), transparent 60%)",
            }}
          />
          <svg viewBox="-180 -90 360 180" className="absolute inset-0 h-full w-full">
            <ellipse cx="0" cy="0" rx="170" ry="80" fill="none" stroke="hsl(var(--foreground)/0.08)" />
            <ellipse cx="0" cy="0" rx="170" ry="40" fill="none" stroke="hsl(var(--foreground)/0.08)" />
            {dots.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={1.5}
                fill="hsl(var(--primary))"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2 + p.d, repeat: Infinity, delay: p.d }}
              />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA FINAL                                                          */
/* ------------------------------------------------------------------ */

function CtaFinal() {
  return (
    <section className="relative px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary/20 via-background/40 to-accent/20 p-10 text-center backdrop-blur-xl sm:p-16">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.3), transparent 60%)",
            }}
          />
          <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
            Comece hoje.
            <br />
            <span className="text-muted-foreground">Seu eu de amanhã agradece.</span>
          </h3>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-8 text-base shadow-[0_0_40px_-10px_hsl(var(--primary))]">
              <Link to="/auth">
                Criar conta grátis
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 rounded-full border border-white/10 bg-white/5 px-8 text-base backdrop-blur-md">
              <a href="#pricing">Ver planos</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                             */
/* ------------------------------------------------------------------ */

function LandingFooter() {
  return (
    <footer className="border-t border-white/5 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src={logo} alt="TimeZoni" className="h-6 w-6" />
          <span className="font-display text-sm font-semibold">TimeZoni</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} TimeZoni. Tempo bem usado.
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground">Entrar</Link>
          <a href="#pricing" className="hover:text-foreground">Planos</a>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function Landing() {
  // Smooth progress bar at top
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useEffect(() => {
    document.title = "TimeZoni — O futuro da sua rotina";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Plataforma premium de produtividade, metas, streaks e foco. Domine seu tempo em qualquer fuso.");
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background font-body text-foreground antialiased">
      <LenisProvider />
      <CursorGlow />

      {/* Scroll progress */}
      <motion.div
        style={{ scaleX }}
        className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-primary to-accent"
      />

      <LandingNav />

      <main className="relative">
        <Hero />
        <Manifesto />
        <DashboardPreview />
        <FeaturesBento />
        <StreaksSection />
        <GoalsTimeline />
        <RoomsSection />
        <GlobeSection />

        {/* Pricing — wrap in branded container */}
        <section id="pricing" className="relative px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.4em] text-primary/80">Planos</p>
              <h3 className="font-display text-3xl font-medium tracking-tight sm:text-5xl">
                Comece grátis. Evolua quando quiser.
              </h3>
            </div>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-2 backdrop-blur-xl sm:p-6">
              <PricingSection />
            </div>
          </div>
        </section>

        <CtaFinal />
      </main>

      <LandingFooter />
    </div>
  );
}
