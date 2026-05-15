import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Clock, Timer, Headphones, Target, BarChart3, Trophy, AlertTriangle, Eye, Zap, UserPlus, Settings2, TrendingUp, Music, FileText, Globe } from "lucide-react";
import { PricingSection } from "@/components/landing/PricingSection";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

// Framer Motion helpers
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function MotionSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// Animated SVG Clock Component
function AnimatedClock() {
  return (
    <div className="relative">
      <div className="absolute inset-0 animate-pulse-slow">
        <svg className="w-full h-full" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.3" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.2" />
        </svg>
      </div>
      <svg className="w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 relative z-10" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="70" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.8" />
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const x1 = 100 + 55 * Math.cos(angle);
          const y1 = 100 + 55 * Math.sin(angle);
          const x2 = 100 + 65 * Math.cos(angle);
          const y2 = 100 + 65 * Math.sin(angle);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary))" strokeWidth={i % 3 === 0 ? "3" : "1.5"} opacity="0.6" />
          );
        })}
        <line x1="100" y1="100" x2="100" y2="55" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" style={{ transformOrigin: "100px 100px", animation: "rotate-slow 43200s linear infinite" }} />
        <line x1="100" y1="100" x2="100" y2="40" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" style={{ transformOrigin: "100px 100px", animation: "rotate-slow 3600s linear infinite" }} />
        <line x1="100" y1="100" x2="100" y2="35" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinecap="round" style={{ transformOrigin: "100px 100px", animation: "rotate-slow 60s linear infinite" }} />
        <circle cx="100" cy="100" r="6" fill="hsl(var(--primary))" />
        <circle cx="100" cy="100" r="3" fill="hsl(var(--background))" />
      </svg>
    </div>
  );
}

// Floating Particles
function FloatingParticles() {
  const particles = useMemo(() =>
    [...Array(20)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 4 + 2,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 10,
    })), []
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
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Problem Section
function ProblemSection() {
  const { t } = useTranslation();
  const problems = [
    { icon: Clock, titleKey: "landing.problem_1_title", descKey: "landing.problem_1_desc" },
    { icon: AlertTriangle, titleKey: "landing.problem_2_title", descKey: "landing.problem_2_desc" },
    { icon: Eye, titleKey: "landing.problem_3_title", descKey: "landing.problem_3_desc" },
  ];

  return (
    <MotionSection className="px-4 py-16 sm:py-24 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2 variants={fadeUp} transition={{ duration: 0.5 }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-10 sm:mb-14">
          {t("landing.problem_title")}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {problems.map((p, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200 shadow-sm text-left hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className="p-2.5 rounded-lg bg-red-50 w-fit mb-4">
                <p.icon className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{t(p.titleKey)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(p.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

// Solution Section
function SolutionSection() {
  const { t } = useTranslation();
  return (
    <MotionSection className="px-4 py-16 sm:py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 mb-6">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-primary">{t("landing.solution_title")}</span>
        </motion.div>
        <motion.h2 variants={fadeUp} transition={{ duration: 0.5 }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t("landing.solution_title")}
        </motion.h2>
        <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-sm sm:text-base md:text-lg text-gray-500 max-w-xl mx-auto">
          {t("landing.solution_subtitle")}
        </motion.p>
      </div>
    </MotionSection>
  );
}

// Features Section
function FeaturesSection() {
  const { t } = useTranslation();
  const features = [
    { icon: Timer, titleKey: "landing.feature_smart_timer_title", descKey: "landing.feature_smart_timer_desc", accent: "primary" },
    { icon: Target, titleKey: "landing.feature_pomodoro_title", descKey: "landing.feature_pomodoro_desc", accent: "accent" },
    { icon: Headphones, titleKey: "landing.feature_sounds_title", descKey: "landing.feature_sounds_desc_full", accent: "primary" },
    { icon: BarChart3, titleKey: "landing.feature_goals_title", descKey: "landing.feature_goals_desc", accent: "accent" },
    { icon: FileText, titleKey: "landing.feature_history_title", descKey: "landing.feature_history_desc_full", accent: "primary" },
    { icon: Trophy, titleKey: "landing.feature_achievements_title", descKey: "landing.feature_achievements_desc", accent: "accent" },
  ];

  return (
    <MotionSection className="px-4 py-16 sm:py-24 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-primary/40 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`p-2.5 rounded-lg ${f.accent === "primary" ? "bg-cyan-50" : "bg-teal-50"} w-fit mb-4`}>
                <f.icon className={`h-5 w-5 ${f.accent === "primary" ? "text-primary" : "text-accent"}`} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{t(f.titleKey)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

// How It Works Section
function HowItWorksSection() {
  const { t } = useTranslation();
  const steps = [
    { icon: UserPlus, num: "1", titleKey: "landing.how_step_1_title", descKey: "landing.how_step_1_desc" },
    { icon: Settings2, num: "2", titleKey: "landing.how_step_2_title", descKey: "landing.how_step_2_desc" },
    { icon: TrendingUp, num: "3", titleKey: "landing.how_step_3_title", descKey: "landing.how_step_3_desc" },
  ];

  return (
    <MotionSection className="px-4 py-16 sm:py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <motion.h2 variants={fadeUp} transition={{ duration: 0.5 }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 text-center mb-10 sm:mb-14">
          {t("landing.how_title")}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((s, i) => (
            <motion.div key={i} variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.15 }} className="text-center">
              <div className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-cyan-50 border-2 border-primary/30 flex items-center justify-center mb-4">
                <span className="text-xl sm:text-2xl font-bold text-primary">{s.num}</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{t(s.titleKey)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(s.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

// Stats Section
function StatsSection() {
  const { t } = useTranslation();
  const stats = [
    { icon: Music, value: t("landing.stats_sounds"), label: t("landing.stats_sounds_label") },
    { icon: Target, value: t("landing.stats_pomodoro"), label: t("landing.stats_pomodoro_label") },
    { icon: FileText, value: t("landing.stats_export"), label: t("landing.stats_export_label") },
    { icon: Globe, value: t("landing.stats_languages"), label: t("landing.stats_languages_label") },
  ];

  return (
    <MotionSection className="px-4 py-16 sm:py-24 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="text-center p-5 sm:p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <s.icon className="h-5 w-5 text-primary mx-auto mb-3" />
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
              <div className="text-xs sm:text-sm text-gray-400">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </MotionSection>
  );
}

// Final CTA Section
function FinalCTASection() {
  const { t } = useTranslation();
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={staggerContainer}
      className="relative z-10 px-4 py-16 sm:py-24 landing-bg"
    >
      <div className="max-w-2xl mx-auto text-center">
        <motion.h2 variants={fadeUp} transition={{ duration: 0.5 }} className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
          {t("landing.final_cta_title")}
        </motion.h2>
        <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-sm sm:text-base text-white/60 mb-8 max-w-lg mx-auto">
          {t("landing.final_cta_subtitle")}
        </motion.p>
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
          <Button
            asChild
            size="lg"
            className="px-8 py-6 text-base sm:text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            <Link to="/auth">{t("landing.final_cta_button")}</Link>
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/timer");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Clock className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* === DARK HERO === */}
      <div className="relative landing-bg">
        <div className="absolute inset-0 landing-gradient" />

        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <LanguageSwitcher variant="ghost" className="text-white hover:bg-white/10" />
        </div>

        <FloatingParticles />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-3 sm:px-4">
          <div className="mb-4 sm:mb-8 animate-fade-in">
            <AnimatedClock />
          </div>

          <div className="flex items-center gap-2 mb-3 sm:mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <img src={logo} alt="TimeZoni" className="h-9 w-9 sm:h-14 sm:w-14" />
            <span className="text-lg sm:text-2xl font-bold tracking-tight text-white">TimeZoni</span>
          </div>

          <div className="text-center max-w-xl mx-auto mb-5 sm:mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 sm:mb-4">
              <span className="text-white">{t("landing.hero_tagline")}</span>
            </h1>
            <p className="text-xs sm:text-base md:text-lg text-white/70 max-w-md mx-auto px-3">
              {t("landing.hero_subtitle")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 mb-6 animate-fade-in w-full max-w-xs sm:max-w-none sm:w-auto px-2 sm:px-0" style={{ animationDelay: "0.3s" }}>
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <Link to="/auth">{t("landing.cta_start")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg border-border/50 hover:bg-muted/50"
            >
              <Link to="/auth">{t("landing.cta_login")}</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* === LIGHT SECTIONS (clean cut, no gradient) === */}
      <div className="landing-light-body">
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
      </div>

      {/* === DARK CLOSING (clean cut) === */}
      <div className="landing-bg">
        <FinalCTASection />
        <PricingSection />
        {/* Support button */}
        <div className="text-center pb-8">
          <Link to="/sac/new" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <Headphones className="h-4 w-4" />
            {t("sidebar.support")}
          </Link>
        </div>
      </div>
    </div>
  );
}
