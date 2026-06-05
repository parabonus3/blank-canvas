import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEO } from "@/components/SEO";
import { langFromI18n } from "@/lib/i18nRoutes";
import { findBlogPost } from "@/lib/blogPosts";
import NotFound from "@/pages/NotFound";
import logo from "@/assets/logo.png";

const BASE_URL = "https://timezoni.com";

/**
 * Route component for /<lang>/blog/<slug> native blog posts.
 * 404s if no post exists for the (lang, slug) pair.
 */
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const currentLang = langFromI18n(i18n.language);

  if (!slug) return <NotFound />;
  const post = findBlogPost(currentLang.code, slug);
  if (!post) return <NotFound />;

  const authPath = currentLang.prefix ? `/${currentLang.prefix}/auth` : "/auth";
  const articleUrl = `${BASE_URL}/${currentLang.prefix}/blog/${post.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "TimeZoni",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/og-image.jpg` },
    },
    datePublished: post.datePublished,
    dateModified: post.datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    inLanguage: currentLang.htmlLang,
  };

  return (
    <>
      <SEO
        title={post.seoTitle}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
        localeOnly
        jsonLd={[articleJsonLd]}
      />

      <div className="relative min-h-screen bg-[#07090f] text-white overflow-hidden">
        <div className="absolute inset-0 landing-gradient opacity-50" />
        <div className="absolute inset-0 grid-bg" />

        {/* Header */}
        <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-5">
          <Link to={currentLang.prefix ? `/${currentLang.prefix}` : "/"} className="flex items-center gap-2">
            <img src={logo} alt="TimeZoni" className="h-8 w-8" />
            <span className="font-display text-lg font-bold tracking-tight">TimeZoni</span>
          </Link>
          <LanguageSwitcher variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5" />
        </header>

        {/* Article header */}
        <article className="relative z-10 max-w-3xl mx-auto px-4 sm:px-8 pt-10 pb-20">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-[1.15] text-gradient-cyan">
              {post.title}
            </h1>
            <p className="text-lg text-white/75 mb-6 leading-relaxed">{post.lede}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/55">
              <span>{post.author}</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <time dateTime={post.datePublished}>{post.datePublished}</time>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime}
              </span>
            </div>
          </motion.header>

          {/* Sections */}
          <div className="space-y-12">
            {post.sections.map((section, i) => (
              <section key={i}>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-5 text-white">
                  {section.heading}
                </h2>
                <div className="space-y-4">
                  {section.paragraphs.map((p, j) => (
                    <p key={j} className="text-white/80 leading-relaxed text-base sm:text-lg">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 glass rounded-2xl p-8 sm:p-10 border border-cyan-500/20 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">{post.ctaHeading}</h2>
            <p className="text-white/70 mb-7">{post.ctaBody}</p>
            <Button
              asChild
              size="lg"
              className="px-8 h-12 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <Link to={authPath} className="flex items-center gap-2">
                {post.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Related */}
          {post.related && post.related.length > 0 && (
            <nav aria-label="Related" className="mt-12 border-t border-white/10 pt-8">
              <ul className="space-y-3">
                {post.related.map((r, i) => (
                  <li key={i}>
                    <Link
                      to={r.href}
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </article>
      </div>
    </>
  );
}
