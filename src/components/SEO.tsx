import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { LANGUAGES, buildLangPath, langFromI18n } from "@/lib/i18nRoutes";
import { getSeoCopy, type SeoPageKey } from "@/lib/seoTranslations";

interface SEOProps {
  /** Page key for translated title/description. If provided, overrides title/description props. */
  pageKey?: SeoPageKey;
  /** Path without language prefix (e.g. "/pricing", "/"). Used to build hreflang alternates. */
  path?: string;
  /** Manual override when pageKey is not provided. */
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  /**
   * Page exists only in the current locale (no other-language versions).
   * Skip hreflang alternates and og:locale:alternate; emit canonical only.
   */
  localeOnly?: boolean;
  /** Extra JSON-LD blocks to inject (e.g. FAQPage, BreadcrumbList). */
  jsonLd?: object[];
}

const BASE_URL = "https://timezoni.com";

export function SEO({
  pageKey,
  path = "/",
  title,
  description,
  image,
  type = "website",
  noindex,
  localeOnly,
  jsonLd,
}: SEOProps) {
  const { i18n } = useTranslation();
  const currentLang = langFromI18n(i18n.language);

  const copy = pageKey ? getSeoCopy(pageKey, currentLang.code) : undefined;
  const finalTitle = copy?.title ?? title ?? "TimeZoni";
  const finalDescription = copy?.description ?? description ?? "";

  const ogImage = image || `${BASE_URL}/og-image.jpg`;
  const canonical = `${BASE_URL}${buildLangPath(currentLang.prefix, path)}`;
  const xDefaultUrl = `${BASE_URL}${buildLangPath("", path)}`;

  return (
    <Helmet
      htmlAttributes={{
        lang: currentLang.htmlLang,
        dir: currentLang.code.startsWith("ar") ? "rtl" : "ltr",
      }}
    >
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* hreflang alternates — skipped for locale-only pages */}
      {!localeOnly && LANGUAGES.map((l) => (
        <link
          key={l.hreflang}
          rel="alternate"
          hrefLang={l.hreflang}
          href={`${BASE_URL}${buildLangPath(l.prefix, path)}`}
        />
      ))}
      {!localeOnly && (
        <link rel="alternate" hrefLang="x-default" href={xDefaultUrl} />
      )}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={currentLang.ogLocale} />
      {!localeOnly && LANGUAGES.filter((l) => l.code !== currentLang.code).map((l) => (
        <meta key={l.ogLocale} property="og:locale:alternate" content={l.ogLocale} />
      ))}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd?.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
