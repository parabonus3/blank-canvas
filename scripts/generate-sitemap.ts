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

/** Page that exists only in one specific locale (no hreflang alternates). */
interface LocaleOnlyEntry {
  prefix: string; // language URL prefix
  path: string;   // path under that prefix (e.g. "/jishuushitsu")
  changefreq?: SitemapEntry["changefreq"];
  priority?: string;
  lastmod?: string;
}

const today = new Date().toISOString().split("T")[0];

// Multilingual routes — emitted once per language with hreflang alternates.
const entries: SitemapEntry[] = [
  { path: "/",        changefreq: "weekly",  priority: "1.0", lastmod: today },
  { path: "/pricing", changefreq: "monthly", priority: "0.8", lastmod: today },
  { path: "/auth",    changefreq: "monthly", priority: "0.5", lastmod: today },
];

// Single-locale landing pages (Sprint 1: JP + KR keyword targeting).
// Kept in sync with src/lib/localizedLandings.ts
const localeOnlyEntries: LocaleOnlyEntry[] = [
  // Sprint 1 — JP + KR
  { prefix: "ja", path: "/jishuushitsu",         changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "ja", path: "/benkyou-timer",        changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "ko", path: "/study-with-me",        changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "ko", path: "/gongbu-timer",         changefreq: "monthly", priority: "0.9", lastmod: today },
  // Sprint 2 — quick wins (EN/ES/DE/FR/IT/RU)
  { prefix: "en", path: "/study-timer-online",   changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "en", path: "/pomodoro-study-timer", changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "es", path: "/sala-de-estudio-online", changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "es", path: "/temporizador-de-estudio", changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "de", path: "/lernzeit-timer",       changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "de", path: "/online-lernraum",      changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "fr", path: "/minuteur-etude",       changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "it", path: "/timer-studio",         changefreq: "monthly", priority: "0.9", lastmod: today },
  { prefix: "ru", path: "/tajmer-uchyoby",       changefreq: "monthly", priority: "0.9", lastmod: today },
  // Phase E — native blog posts (JP + KR)
  { prefix: "ja", path: "/blog/online-jishuushitsu-tsukaikata", changefreq: "monthly", priority: "0.7", lastmod: today },
  { prefix: "ko", path: "/blog/study-with-me-gongbu-supgwan",   changefreq: "monthly", priority: "0.7", lastmod: today },
];

function buildLangPath(prefix: string, path: string): string {
  if (!prefix) return path;
  if (path === "/") return `/${prefix}`;
  return `/${prefix}${path}`;
}

function urlBlock(entry: SitemapEntry): string[] {
  // Emit one <url> per language with full hreflang alternates + x-default.
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

function localeOnlyBlock(entry: LocaleOnlyEntry): string {
  const loc = `${BASE_URL}${buildLangPath(entry.prefix, entry.path)}`;
  return [
    `  <url>`,
    `    <loc>${loc}</loc>`,
    entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
    entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
    entry.priority ? `    <priority>${entry.priority}</priority>` : null,
    `  </url>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function generateSitemap(): string {
  const multi = entries.flatMap(urlBlock);
  const single = localeOnlyEntries.map(localeOnlyBlock);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...multi,
    ...single,
    `</urlset>`,
  ].join("\n");
}

const xml = generateSitemap();
writeFileSync(resolve("public/sitemap.xml"), xml);
const total = entries.length * LANGUAGES.length + localeOnlyEntries.length;
console.log(`sitemap.xml written (${entries.length} routes × ${LANGUAGES.length} langs + ${localeOnlyEntries.length} locale-only = ${total} URLs)`);

