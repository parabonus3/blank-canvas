// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Generates a multi-language sitemap with hreflang alternates (xhtml:link)
// per Google's recommended format for internationalized sites.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://timezoni.com";

interface Lang {
  code: string;
  prefix: string;
  hreflang: string;
}

// Kept in sync with src/lib/i18nRoutes.ts
const LANGUAGES: Lang[] = [
  { code: "pt-BR", prefix: "",   hreflang: "pt-BR" },
  { code: "en-US", prefix: "en", hreflang: "en" },
  { code: "es-ES", prefix: "es", hreflang: "es" },
  { code: "fr-FR", prefix: "fr", hreflang: "fr" },
  { code: "de-DE", prefix: "de", hreflang: "de" },
  { code: "it-IT", prefix: "it", hreflang: "it" },
  { code: "ja-JP", prefix: "ja", hreflang: "ja" },
  { code: "ko-KR", prefix: "ko", hreflang: "ko" },
  { code: "zh-CN", prefix: "zh", hreflang: "zh-CN" },
  { code: "ru-RU", prefix: "ru", hreflang: "ru" },
  { code: "ar-SA", prefix: "ar", hreflang: "ar" },
  { code: "id-ID", prefix: "id", hreflang: "id" },
];

interface SitemapEntry {
  /** Path without language prefix (e.g. "/", "/pricing", "/auth"). */
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const today = new Date().toISOString().split("T")[0];

// Only public, indexable routes.
const entries: SitemapEntry[] = [
  { path: "/",        changefreq: "weekly",  priority: "1.0", lastmod: today },
  { path: "/pricing", changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/auth",    changefreq: "monthly", priority: "0.5", lastmod: today },
];

function buildLangPath(prefix: string, path: string): string {
  if (!prefix) return path;
  if (path === "/") return `/${prefix}`;
  return `/${prefix}${path}`;
}

function urlBlock(entry: SitemapEntry): string[] {
  // Emit one <url> per language. Each one carries the full set of
  // <xhtml:link rel="alternate" hreflang> pointing at all language variants,
  // plus x-default pointing at the no-prefix URL.
  return LANGUAGES.map((lang) => {
    const loc = `${BASE_URL}${buildLangPath(lang.prefix, entry.path)}`;
    const alternates = LANGUAGES.map(
      (alt) =>
        `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${BASE_URL}${buildLangPath(alt.prefix, entry.path)}" />`,
    );
    alternates.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${buildLangPath("", entry.path)}" />`,
    );

    return [
      `  <url>`,
      `    <loc>${loc}</loc>`,
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
      entry.priority ? `    <priority>${entry.priority}</priority>` : null,
      ...alternates,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n");
  });
}

function generateSitemap(entries: SitemapEntry[]): string {
  const urls = entries.flatMap(urlBlock);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

const xml = generateSitemap(entries);
writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} routes × ${LANGUAGES.length} langs = ${entries.length * LANGUAGES.length} URLs)`);
