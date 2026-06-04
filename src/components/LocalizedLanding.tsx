import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO } from "@/components/SEO";
import { langFromI18n } from "@/lib/i18nRoutes";
import { useTranslation } from "react-i18next";
import type { LocalizedLandingConfig } from "@/lib/localizedLandings";
import logo from "@/assets/logo.png";

interface Props {
  config: LocalizedLandingConfig;
}

/**
 * SEO-focused landing for a single target keyword in a single locale.
 * Lean by design — H1 with exact-match keyword, intro, bullets, prose,
 * FAQ section + FAQPage JSON-LD. CTA routes to /<lang>/auth.
 */
export function LocalizedLanding({ config }: Props) {
  const { i18n } = useTranslation();
  const currentLang = langFromI18n(i18n.language);
  const authPath = currentLang.prefix ? `/${currentLang.prefix}/auth` : "/auth";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <SEO
        title={config.title}
        description={config.description}
        path={`/${config.slug}`}
        localeOnly
        jsonLd={[faqJsonLd]}
      />

      <div className="relative min-h-screen bg-[#07090f] text-white overflow-hidden">
        <div className="absolute inset-0 landing-gradient opacity-60" />
        <div className="absolute inset-0 grid-bg" />

        {/* Header */}
        <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-5">
          <Link to={currentLang.prefix ? `/${currentLang.prefix}` : "/"} className="flex items-center gap-2">
            <img src={logo} alt="TimeZoni" className="h-8 w-8" />
            <span className="font-display text-lg font-bold tracking-tight">TimeZoni</span>
          </Link>
          <LanguageSwitcher variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5" />
        </header>

        {/* Hero */}
        <section className="relative z-10 px-4 sm:px-8 pt-10 pb-20 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs sm:text-sm text-white/80 mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            TimeZoni
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
          >
            <span className="text-gradient-cyan">{config.keyword}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto mb-10"
          >
            {config.intro}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              asChild
              size="lg"
              className="px-7 h-12 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_10px_40px_-10px_hsl(189_94%_50%/0.6)]"
            >
              <Link to={authPath} className="flex items-center gap-2">
                {config.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-7 h-12 bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
            >
              <Link to={authPath}>{config.ctaSecondary}</Link>
            </Button>
          </motion.div>
        </section>

        {/* Bullets */}
        <section className="relative z-10 px-4 sm:px-8 pb-20 max-w-4xl mx-auto">
          <div className="glass rounded-2xl p-6 sm:p-10 border border-white/5">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-8 text-center">
              {config.whyHeading}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-4">
              {config.bullets.map((b, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Body prose */}
        <section className="relative z-10 px-4 sm:px-8 pb-20 max-w-3xl mx-auto">
          <p className="text-base sm:text-lg text-white/75 leading-relaxed">
            {config.body}
          </p>
        </section>

        {/* FAQ */}
        <section className="relative z-10 px-4 sm:px-8 pb-24 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-8 text-center">
            {config.faqHeading}
          </h2>
          <div className="space-y-4">
            {config.faqs.map((f, i) => (
              <details
                key={i}
                className="group glass rounded-xl border border-white/5 p-5 open:bg-white/[0.03]"
              >
                <summary className="cursor-pointer font-semibold text-white/95 list-none flex justify-between items-center gap-4">
                  <span>{f.q}</span>
                  <span className="text-cyan-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-white/70 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative z-10 px-4 sm:px-8 pb-24 max-w-2xl mx-auto text-center">
          <div className="glass rounded-2xl p-8 sm:p-12 border border-cyan-500/20">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
              {config.keyword}
            </h2>
            <p className="text-white/70 mb-8">{config.intro}</p>
            <Button
              asChild
              size="lg"
              className="px-8 h-12 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <Link to={authPath} className="flex items-center gap-2">
                {config.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
