import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform, useTime, useMotionTemplate } from "framer-motion";
import {
  Clock, Timer, Headphones, Target, BarChart3, Trophy, AlertTriangle, Eye, Zap,
  UserPlus, Settings2, TrendingUp, Music, FileText, Globe, Flame, Calendar,
  Sparkles, ArrowRight, CheckCircle2, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PricingSection } from "@/components/landing/PricingSection";
import { useAuth } from "@/contexts/AuthContext";
import { useLenis } from "@/hooks/useLenis";
import { Reveal, Magnetic, SpotlightCursor, ScrollProgress, CountUp, Tilt } from "@/components/landing/primitives";
import logo from "@/assets/logo.png";

/* ============================================================ */
/*  PARTICLES                                                   */
/* ============================================================ */
function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 2,
        delay: Math.random() * 20,
        duration: 16 + Math.random() * 12,
      })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="landing-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================ */
/*  HERO                                                        */
/* ============================================================ */
function AnimatedClock() {
  const { scrollY } = useScroll();
  const scrollRotate = useTransform(scrollY, [0, 800], [0, 6]);
  const scale = useTransform(scrollY, [0, 600], [1, 0.92]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0.5]);

  const reduced = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Tempo contínuo via motion value (sem re-render do React → smooth a 60fps)
  const time = useTime();
  const baseMs = useMemo(() => Date.now(), []);

  // Rotações reais do relógio (graus) derivadas do time motion value
  const hourDeg = useTransform(time, (t) => {
    const ms = baseMs + t;
    const d = new Date(ms);
    return ((d.getHours() % 12) + d.getMinutes() / 60 + d.getSeconds() / 3600) * 30;
  });
  const minDeg = useTransform(time, (t) => {
    const ms = baseMs + t;
    const d = new Date(ms);
    return (d.getMinutes() + d.getSeconds() / 60) * 6;
  });
  // Ponteiro de segundos com tick suave (ease-out por segundo, sensação mecânica fina)
  const secDeg = useTransform(time, (t) => {
    const ms = baseMs + t;
    const d = new Date(ms);
    const sub = d.getMilliseconds() / 1000;
    const eased = sub < 0.22 ? Math.pow(sub / 0.22, 0.55) : 1;
    return (d.getSeconds() + eased) * 6;
  });

  // Anéis decorativos girando suavemente
  const ringSlow = useTransform(time, (t) => (t / 40000) * 360);
  const ringMid = useTransform(time, (t) => -(t / 22000) * 360);
  const ringFast = useTransform(time, (t) => (t / 9000) * 360);

  // Sweep "radar" — arco transparente girando atrás dos ponteiros
  const sweepRotate = useTransform(time, (t) => (t / 6000) * 360);

  // Aura ambiente que respira (hue shift sutil)
  const auraHue = useTransform(time, (t) => 185 + Math.sin(t / 2400) * 12);
  const auraOpacity = useTransform(time, (t) => 0.55 + Math.sin(t / 1800) * 0.2);

  const hourStyle = { transformOrigin: "100px 100px", transformBox: "view-box" as const, rotate: hourDeg };
  const minStyle = { transformOrigin: "100px 100px", transformBox: "view-box" as const, rotate: minDeg };
  const secStyle = { transformOrigin: "100px 100px", transformBox: "view-box" as const, rotate: secDeg };
  const ringSlowStyle = { transformOrigin: "100px 100px", transformBox: "view-box" as const, rotate: ringSlow };
  const ringMidStyle = { transformOrigin: "100px 100px", transformBox: "view-box" as const, rotate: ringMid };
  const ringFastStyle = { transformOrigin: "100px 100px", transformBox: "view-box" as const, rotate: ringFast };
  const sweepStyle = { transformOrigin: "100px 100px", transformBox: "view-box" as const, rotate: sweepRotate };

  // Halo conic atrás do SVG (CSS, fora do view-box)
  const haloBg = useMotionTemplate`conic-gradient(from ${sweepRotate}deg, hsl(189 94% 55% / 0.0) 0deg, hsl(189 94% 60% / 0.35) 60deg, hsl(189 94% 55% / 0) 140deg, hsl(180 90% 70% / 0.25) 240deg, hsl(189 94% 55% / 0) 360deg)`;

  return (
    <motion.div style={{ rotate: scrollRotate, scale, opacity }} className="relative">
      {/* Halo conic premium atrás do mostrador */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: haloBg, opacity: auraOpacity }}
        />
      )}

      <svg className="relative w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64" viewBox="0 0 200 200" overflow="visible">
        <defs>
          <radialGradient id="clockGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(189 94% 55%)" stopOpacity="0.55" />
            <stop offset="70%" stopColor="hsl(189 94% 50%)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="hsl(189 94% 50%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dialFill" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="hsl(217 33% 12%)" />
            <stop offset="100%" stopColor="hsl(222 47% 4%)" />
          </radialGradient>
          <linearGradient id="hourHand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(210 40% 98%)" />
            <stop offset="100%" stopColor="hsl(210 30% 70%)" />
          </linearGradient>
          <linearGradient id="minHand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(210 40% 100%)" />
            <stop offset="100%" stopColor="hsl(210 30% 80%)" />
          </linearGradient>
          <linearGradient id="secHand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(180 100% 75%)" />
            <stop offset="100%" stopColor="hsl(189 94% 55%)" />
          </linearGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(189 94% 60%)" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(189 94% 60%)" stopOpacity="0.55" />
          </linearGradient>
          <filter id="secGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow ambiente */}
        <motion.circle
          cx="100" cy="100" r="98" fill="url(#clockGlow)"
          animate={reduced ? undefined : { opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Anéis decorativos concêntricos girando */}
        <motion.g style={ringSlowStyle}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="hsl(189 94% 60% / 0.18)" strokeWidth="0.4" strokeDasharray="2 6" />
        </motion.g>
        <motion.g style={ringMidStyle}>
          <circle cx="100" cy="100" r="83" fill="none" stroke="hsl(189 94% 70% / 0.22)" strokeWidth="0.5" strokeDasharray="1 4" />
        </motion.g>
        <motion.g style={ringFastStyle}>
          <circle cx="100" cy="100" r="78" fill="none" stroke="hsl(189 94% 55% / 0.3)" strokeWidth="0.4" strokeDasharray="0.5 3" />
        </motion.g>

        {/* Mostrador */}
        <circle cx="100" cy="100" r="72" fill="url(#dialFill)" stroke="hsl(189 94% 50% / 0.45)" strokeWidth="1" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="hsl(189 94% 70% / 0.08)" strokeWidth="3" filter="url(#softGlow)" />

        {/* Sweep radar */}
        {!reduced && (
          <motion.g style={sweepStyle}>
            <path d="M 100 100 L 168 100 A 68 68 0 0 0 130 41 Z" fill="url(#sweep)" opacity="0.35" />
          </motion.g>
        )}

        {/* Marcadores */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const isHour = i % 5 === 0;
          const r1 = isHour ? 56 : 62;
          const r2 = 68;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(angle)}
              y1={100 + r1 * Math.sin(angle)}
              x2={100 + r2 * Math.cos(angle)}
              y2={100 + r2 * Math.sin(angle)}
              stroke={isHour ? "hsl(189 94% 78%)" : "hsl(210 40% 96% / 0.28)"}
              strokeWidth={isHour ? 2.2 : 0.7}
              strokeLinecap="round"
            />
          );
        })}

        {/* Numerais sutis em 12/3/6/9 */}
        {[
          { x: 100, y: 48, label: "12" },
          { x: 152, y: 104, label: "3" },
          { x: 100, y: 158, label: "6" },
          { x: 48, y: 104, label: "9" },
        ].map((n) => (
          <text
            key={n.label}
            x={n.x} y={n.y}
            textAnchor="middle"
            fontSize="7"
            fontFamily="'Sora', sans-serif"
            fontWeight={500}
            fill="hsl(189 94% 80% / 0.55)"
            letterSpacing="0.5"
          >
            {n.label}
          </text>
        ))}

        {/* Ponteiro da hora */}
        <motion.g style={hourStyle}>
          <line x1="100" y1="112" x2="100" y2="68" stroke="url(#hourHand)" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="100" cy="68" r="2" fill="hsl(210 40% 98%)" />
        </motion.g>

        {/* Ponteiro dos minutos */}
        <motion.g style={minStyle}>
          <line x1="100" y1="114" x2="100" y2="50" stroke="url(#minHand)" strokeWidth="2.8" strokeLinecap="round" />
        </motion.g>

        {/* Ponteiro dos segundos com glow */}
        <motion.g style={secStyle}>
          <line
            x1="100" y1="118" x2="100" y2="42"
            stroke="url(#secHand)" strokeWidth="1.5" strokeLinecap="round"
            filter="url(#secGlow)"
          />
          <circle cx="100" cy="42" r="2.6" fill="hsl(180 100% 75%)" filter="url(#secGlow)" />
        </motion.g>

        {/* Núcleo pulsante */}
        <motion.circle
          cx="100" cy="100" r="4.8" fill="hsl(189 94% 60%)" filter="url(#secGlow)"
          animate={reduced ? undefined : { r: [4.4, 5.6, 4.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <circle cx="100" cy="100" r="1.6" fill="hsl(222 47% 4%)" />
      </svg>
    </motion.div>
  );
}

function Hero() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const tagline = `${t("landing.tagline_1")} ${t("landing.tagline_2")}`;
  const words = tagline.split(" ");

  return (
    <div ref={heroRef} className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 landing-gradient" />
      <div className="absolute inset-0 grid-bg" />
      <SpotlightCursor />
      <FloatingParticles />

      <div className="absolute top-4 right-4 z-30">
        <LanguageSwitcher variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5" />
      </div>

      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full glass text-xs sm:text-sm text-white/80"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          {t("landing.hero_eyebrow")}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.1 }} className="mb-8">
          <AnimatedClock />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-2 mb-6">
          <img src={logo} alt="TimeZoni" className="h-9 w-9 sm:h-11 sm:w-11" />
          <span className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">TimeZoni</span>
        </motion.div>

        <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl mb-5 leading-[1.05]">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={`inline-block mr-[0.25em] ${i >= Math.floor(words.length / 2) ? "text-gradient-cyan" : "text-white"}`}
            >
              {w}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="text-sm sm:text-base md:text-lg text-white/60 max-w-xl mb-9 px-4"
        >
          {t("landing.hero_subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.7 }}
          className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-none sm:w-auto px-4 sm:px-0"
        >
          <Magnetic>
            <Button asChild size="lg" className="w-full sm:w-auto px-7 h-12 text-sm sm:text-base bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_10px_40px_-10px_hsl(189_94%_50%/0.6)]">
              <Link to="/auth" className="flex items-center gap-2">
                {t("landing.cta_start")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Magnetic>
          <Magnetic strength={0.2}>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto px-7 h-12 text-sm sm:text-base bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white">
              <Link to="/auth">{t("landing.cta_login")}</Link>
            </Button>
          </Magnetic>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 text-[10px] sm:text-xs tracking-widest uppercase"
        >
          <span>{t("landing.scroll_hint")}</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ============================================================ */
/*  MARQUEE                                                     */
/* ============================================================ */
function MarqueeValues() {
  const { t } = useTranslation();
  const items = [
    t("landing.marquee_focus"),
    t("landing.marquee_discipline"),
    t("landing.marquee_streaks"),
    t("landing.marquee_goals"),
    t("landing.marquee_time"),
    t("landing.marquee_evolution"),
  ];
  const all = [...items, ...items, ...items];
  return (
    <div className="relative py-10 border-y border-white/5 overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#07090f] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#07090f] to-transparent z-10" />
      <div className="flex animate-marquee gap-12 w-max">
        {all.map((label, i) => (
          <div key={i} className="flex items-center gap-12">
            <span className="font-display text-2xl sm:text-4xl font-light text-white/30 hover:text-cyan-400/80 transition-colors whitespace-nowrap">
              {label}
            </span>
            <span className="text-cyan-500/40 text-2xl">◆</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ */
/*  PROBLEM                                                     */
/* ============================================================ */
function ProblemSection() {
  const { t } = useTranslation();
  const problems = [
    { icon: Clock, titleKey: "landing.problem_1_title", descKey: "landing.problem_1_desc" },
    { icon: AlertTriangle, titleKey: "landing.problem_2_title", descKey: "landing.problem_2_desc" },
    { icon: Eye, titleKey: "landing.problem_3_title", descKey: "landing.problem_3_desc" },
  ];
  return (
    <section className="relative px-4 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-16">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/80">01 — {t("landing.problem_eyebrow")}</span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white mt-4 max-w-3xl mx-auto">
            {t("landing.problem_title")}
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {problems.map((p, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <Tilt className="h-full">
                <div className="h-full p-7 rounded-2xl glass hover:border-cyan-500/30 transition-all duration-500 group">
                  <div className="inline-flex p-3 rounded-xl bg-cyan-500/10 mb-5 group-hover:bg-cyan-500/15 transition-colors">
                    <p.icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-semibold text-white mb-2.5">{t(p.titleKey)}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{t(p.descKey)}</p>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  SOLUTION                                                    */
/* ============================================================ */
function SolutionSection() {
  const { t } = useTranslation();
  const sentence = t("landing.solution_subtitle");
  const words = sentence.split(" ");

  return (
    <section className="relative px-4 py-28 sm:py-40">
      <div className="absolute inset-0 aurora-bg opacity-50" />
      <div className="relative max-w-5xl mx-auto text-center">
        <Reveal>
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/80">02 — {t("landing.solution_eyebrow")}</span>
          <h2 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold text-white mt-6 mb-8 leading-[1.05]">
            {t("landing.solution_title")}
          </h2>
        </Reveal>
        <p className="font-display text-xl sm:text-3xl md:text-4xl font-light leading-tight max-w-4xl mx-auto">
          {words.map((w, i) => (
            <motion.span
              key={`${w}-${i}`}
              initial={{ opacity: 0.2 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.04, duration: 0.6 }}
              className="inline-block mr-[0.25em] text-white"
            >
              {w}
            </motion.span>
          ))}
        </p>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  DASHBOARD SHOWCASE                                          */
/* ============================================================ */
function DashboardShowcase() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const progress = useTransform(scrollYProgress, [0.1, 0.6], [0, 100]);
  const progressWidth = useTransform(progress, (v) => `${v}%`);
  const progressLabel = useTransform(progress, (v) => `${Math.round(v)}%`);
  const timerScale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);

  return (
    <section ref={ref} className="relative px-4 py-24 sm:py-32">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/80">03 — {t("landing.dashboard_eyebrow")}</span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white mt-4 max-w-3xl mx-auto">
            {t("landing.dashboard_showcase_title")}
          </h2>
          <p className="text-white/55 text-sm sm:text-base mt-4 max-w-xl mx-auto">{t("landing.dashboard_showcase_subtitle")}</p>
        </Reveal>

        <motion.div style={{ scale: timerScale }} className="relative">
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-cyan-500/30 via-cyan-400/20 to-teal-500/30 blur-2xl opacity-60" />
          <div className="relative rounded-3xl glass-strong glow-cyan p-5 sm:p-8 overflow-hidden">
            {/* top row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="font-mono text-[10px] sm:text-xs text-white/40 tracking-widest uppercase">timezoni.app/timer</div>
              <div className="w-12" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Big timer */}
              <div className="lg:col-span-2 p-6 sm:p-10 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-cyan-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono uppercase tracking-widest text-cyan-400/80">{t("landing.dashboard_focus_active")}</span>
                  </div>
                  <div className="font-display text-6xl sm:text-8xl font-bold tabular-nums text-white tracking-tight">
                    <LiveTimer />
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>{t("landing.dashboard_today_goal")}</span>
                      <motion.span>{progressLabel}</motion.span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div style={{ width: progressWidth }} className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right stack */}
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-mono uppercase tracking-widest text-orange-400/80">{t("landing.dashboard_streak")}</span>
                  </div>
                  <div className="font-display text-4xl font-bold text-white"><CountUp to={47} /> <span className="text-base font-normal text-white/40">{t("landing.dashboard_days")}</span></div>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-mono uppercase tracking-widest text-cyan-400/80">{t("landing.dashboard_weekly")}</span>
                  </div>
                  <div className="font-display text-4xl font-bold text-white"><CountUp to={32} suffix="h" /></div>
                </div>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-mono uppercase tracking-widest text-emerald-400/80">{t("landing.dashboard_growth")}</span>
                  </div>
                  <div className="font-display text-4xl font-bold text-white">+<CountUp to={28} suffix="%" /></div>
                </div>
              </div>
            </div>

            {/* heatmap */}
            <div className="mt-6 p-5 rounded-2xl bg-slate-950/50 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-mono uppercase tracking-widest text-white/60">{t("landing.dashboard_consistency")}</span>
                </div>
                <span className="text-[10px] text-white/30 font-mono">12 weeks</span>
              </div>
              <Heatmap />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function LiveTimer() {
  const [s, setS] = useState(7234);
  useEffect(() => {
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return <span>{h}:{m}:{sec}</span>;
}

function Heatmap() {
  const cells = useMemo(() => Array.from({ length: 12 * 7 }, () => Math.random()), []);
  return (
    <div className="grid grid-rows-7 grid-flow-col gap-1.5">
      {cells.map((v, i) => {
        const intensity = v;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.008, duration: 0.4 }}
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px]"
            style={{
              background: intensity < 0.2
                ? "hsl(217 33% 17%)"
                : `hsl(189 94% ${30 + intensity * 35}% / ${0.4 + intensity * 0.6})`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ============================================================ */
/*  FEATURES BENTO                                              */
/* ============================================================ */
function FeaturesBento() {
  const { t } = useTranslation();
  const features = [
    { icon: Timer, titleKey: "landing.feature_smart_timer_title", descKey: "landing.feature_smart_timer_desc", span: "md:col-span-2" },
    { icon: Target, titleKey: "landing.feature_pomodoro_title", descKey: "landing.feature_pomodoro_desc" },
    { icon: Headphones, titleKey: "landing.feature_sounds_title", descKey: "landing.feature_sounds_desc_full" },
    { icon: BarChart3, titleKey: "landing.feature_goals_title", descKey: "landing.feature_goals_desc", span: "md:col-span-2" },
    { icon: FileText, titleKey: "landing.feature_history_title", descKey: "landing.feature_history_desc_full" },
    { icon: Trophy, titleKey: "landing.feature_achievements_title", descKey: "landing.feature_achievements_desc", span: "md:col-span-2" },
  ];
  return (
    <section className="relative px-4 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/80">04 — {t("landing.features_eyebrow")}</span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white mt-4">{t("landing.features_title")}</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Reveal key={i} delay={(i % 3) * 0.08} className={f.span ?? ""}>
              <Tilt className="h-full">
                <div className="group h-full min-h-[220px] p-7 rounded-2xl glass hover:border-cyan-500/40 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative">
                    <div className="inline-flex p-3 rounded-xl bg-cyan-500/10 mb-5 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-500">
                      <f.icon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-white mb-2.5">{t(f.titleKey)}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{t(f.descKey)}</p>
                  </div>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  HOW IT WORKS - TIMELINE                                     */
/* ============================================================ */
function HowItWorksTimeline() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 30%"] });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const steps = [
    { icon: UserPlus, num: "01", titleKey: "landing.how_step_1_title", descKey: "landing.how_step_1_desc" },
    { icon: Settings2, num: "02", titleKey: "landing.how_step_2_title", descKey: "landing.how_step_2_desc" },
    { icon: TrendingUp, num: "03", titleKey: "landing.how_step_3_title", descKey: "landing.how_step_3_desc" },
  ];

  return (
    <section ref={ref} className="relative px-4 py-24 sm:py-32">
      <div className="max-w-4xl mx-auto">
        <Reveal className="text-center mb-16">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/80">05 — {t("landing.how_eyebrow")}</span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white mt-4">{t("landing.how_title")}</h2>
        </Reveal>

        <div className="relative pl-12 sm:pl-16">
          <div className="absolute left-4 sm:left-6 top-2 bottom-2 w-px bg-white/10" />
          <motion.div style={{ height: lineHeight }} className="absolute left-4 sm:left-6 top-2 w-px bg-gradient-to-b from-cyan-400 via-cyan-300 to-transparent" />

          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.1} className="relative pb-14 last:pb-0">
              <div className="absolute -left-12 sm:-left-16 top-0 flex items-center justify-center w-9 h-9 sm:w-12 sm:h-12 rounded-full glass-strong border border-cyan-500/40">
                <s.icon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
              </div>
              <div className="font-mono text-xs text-cyan-400/60 mb-2">{s.num}</div>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-white mb-2">{t(s.titleKey)}</h3>
              <p className="text-sm sm:text-base text-white/55 leading-relaxed max-w-xl">{t(s.descKey)}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  STATS                                                       */
/* ============================================================ */
function StatsSection() {
  const { t } = useTranslation();
  const stats = [
    { icon: Music, value: 14, suffix: "+", label: t("landing.stats_sounds_label") },
    { icon: Target, label: t("landing.stats_pomodoro_label"), text: t("landing.stats_pomodoro") },
    { icon: FileText, label: t("landing.stats_export_label"), text: t("landing.stats_export") },
    { icon: Globe, value: 12, label: t("landing.stats_languages_label") },
  ];
  return (
    <section className="relative px-4 py-24 sm:py-32 border-t border-white/5">
      <div className="absolute inset-0 aurora-bg opacity-30" />
      <div className="relative max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="p-7 rounded-2xl glass h-full">
                <s.icon className="h-5 w-5 text-cyan-400 mb-4" />
                <div className="font-display text-4xl sm:text-5xl font-bold text-gradient-cyan mb-2">
                  {s.value !== undefined ? <CountUp to={s.value} suffix={s.suffix} /> : s.text}
                </div>
                <div className="text-xs sm:text-sm text-white/50">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  GLOBAL TIMEZONES                                            */
/* ============================================================ */
function GlobalTimezones() {
  const { t } = useTranslation();
  const cities = [
    { name: "São Paulo", offset: -3, x: "32%", y: "68%" },
    { name: "New York", offset: -5, x: "25%", y: "40%" },
    { name: "London", offset: 0, x: "48%", y: "32%" },
    { name: "Tokyo", offset: 9, x: "82%", y: "44%" },
    { name: "Sydney", offset: 11, x: "88%", y: "75%" },
  ];
  return (
    <section className="relative px-4 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-400/80">06 — {t("landing.timezones_eyebrow")}</span>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white mt-4 max-w-3xl mx-auto">{t("landing.timezones_title")}</h2>
          <p className="text-white/55 text-sm sm:text-base mt-4 max-w-xl mx-auto">{t("landing.timezones_subtitle")}</p>
        </Reveal>

        <Reveal>
          <div className="relative aspect-[2/1] rounded-3xl glass-strong overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-50" />
            <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-20">
              <ellipse cx="100" cy="50" rx="95" ry="45" fill="none" stroke="hsl(189 94% 50%)" strokeWidth="0.3" />
              <ellipse cx="100" cy="50" rx="60" ry="30" fill="none" stroke="hsl(189 94% 50%)" strokeWidth="0.3" />
              <line x1="5" y1="50" x2="195" y2="50" stroke="hsl(189 94% 50%)" strokeWidth="0.3" />
              <line x1="100" y1="5" x2="100" y2="95" stroke="hsl(189 94% 50%)" strokeWidth="0.3" />
            </svg>
            {cities.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                style={{ left: c.x, top: c.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative">
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-cyan-400 animate-ping opacity-75" />
                  <div className="relative w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_20px_hsl(189_94%_50%/0.8)]" />
                </div>
                <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] sm:text-xs text-white/80 font-mono">
                  {c.name}
                  <div className="text-cyan-400/60 text-center">UTC{c.offset >= 0 ? `+${c.offset}` : c.offset}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  FINAL CTA                                                   */
/* ============================================================ */
function FinalCTA() {
  const { t } = useTranslation();
  return (
    <section className="relative px-4 py-32 sm:py-40 overflow-hidden">
      <div className="absolute inset-0 aurora-bg animate-aurora" />
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <Sparkles className="h-8 w-8 text-cyan-400 mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            {t("landing.final_cta_title")}
          </h2>
          <p className="text-sm sm:text-base text-white/60 mb-10 max-w-xl mx-auto">{t("landing.final_cta_subtitle")}</p>
          <Magnetic>
            <Button asChild size="lg" className="px-8 h-14 text-sm sm:text-base bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_20px_60px_-15px_hsl(189_94%_50%/0.7)]">
              <Link to="/auth" className="flex items-center gap-2">
                {t("landing.final_cta_button")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Magnetic>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
            {t("landing.trial_badge")}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================ */
/*  ROOT                                                        */
/* ============================================================ */
export default function Landing() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useLenis();

  useEffect(() => {
    if (!loading && user) navigate("/timer");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090f]">
        <Clock className="h-12 w-12 text-cyan-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="landing-root min-h-screen relative overflow-x-hidden">
      <ScrollProgress />
      <Hero />
      <MarqueeValues />
      <ProblemSection />
      <SolutionSection />
      <DashboardShowcase />
      <FeaturesBento />
      <HowItWorksTimeline />
      <StatsSection />
      <GlobalTimezones />
      <FinalCTA />
      <PricingSection />
      <div className="text-center pb-10">
        <Link to="/sac/new" className="text-sm text-white/40 hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5">
          <Headphones className="h-4 w-4" />
          {t("sidebar.support")}
        </Link>
      </div>
    </div>
  );
}
