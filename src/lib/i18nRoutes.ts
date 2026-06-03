// SEO i18n config: supported languages, URL prefixes, hreflang codes.
// "" prefix means the default (no prefix in URL).

export interface LangConfig {
  /** i18next code (matches keys in src/i18n/index.ts resources) */
  code: string;
  /** URL prefix segment (without slashes). Empty string = default. */
  prefix: string;
  /** hreflang value Google expects */
  hreflang: string;
  /** Open Graph locale */
  ogLocale: string;
  /** <html lang> attribute */
  htmlLang: string;
}

export const LANGUAGES: LangConfig[] = [
  { code: "pt-BR", prefix: "",   hreflang: "pt-BR", ogLocale: "pt_BR", htmlLang: "pt-BR" },
  { code: "en-US", prefix: "en", hreflang: "en",    ogLocale: "en_US", htmlLang: "en" },
  { code: "es-ES", prefix: "es", hreflang: "es",    ogLocale: "es_ES", htmlLang: "es" },
  { code: "fr-FR", prefix: "fr", hreflang: "fr",    ogLocale: "fr_FR", htmlLang: "fr" },
  { code: "de-DE", prefix: "de", hreflang: "de",    ogLocale: "de_DE", htmlLang: "de" },
  { code: "it-IT", prefix: "it", hreflang: "it",    ogLocale: "it_IT", htmlLang: "it" },
  { code: "ja-JP", prefix: "ja", hreflang: "ja",    ogLocale: "ja_JP", htmlLang: "ja" },
  { code: "ko-KR", prefix: "ko", hreflang: "ko",    ogLocale: "ko_KR", htmlLang: "ko" },
  { code: "zh-CN", prefix: "zh", hreflang: "zh-CN", ogLocale: "zh_CN", htmlLang: "zh-CN" },
  { code: "ru-RU", prefix: "ru", hreflang: "ru",    ogLocale: "ru_RU", htmlLang: "ru" },
  { code: "ar-SA", prefix: "ar", hreflang: "ar",    ogLocale: "ar_SA", htmlLang: "ar" },
  { code: "id-ID", prefix: "id", hreflang: "id",    ogLocale: "id_ID", htmlLang: "id" },
];

export const DEFAULT_LANG = LANGUAGES[0];

export const SUPPORTED_PREFIXES = new Set(
  LANGUAGES.map((l) => l.prefix).filter(Boolean),
);

/** Find the language config from a URL prefix segment (or "" for default). */
export function langFromPrefix(prefix: string | undefined): LangConfig | undefined {
  if (!prefix) return DEFAULT_LANG;
  return LANGUAGES.find((l) => l.prefix === prefix);
}

/** Map an i18next language code (e.g. "en-US", "en", "en-GB") to a LangConfig. */
export function langFromI18n(code: string | undefined): LangConfig {
  if (!code) return DEFAULT_LANG;
  const exact = LANGUAGES.find((l) => l.code === code);
  if (exact) return exact;
  const base = code.split("-")[0];
  const baseMatch = LANGUAGES.find((l) => l.code.startsWith(base + "-") || l.code === base);
  return baseMatch ?? DEFAULT_LANG;
}

/** Build a path with the language prefix (e.g. ("en", "/pricing") -> "/en/pricing"). */
export function buildLangPath(prefix: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!prefix) return normalized;
  if (normalized === "/") return `/${prefix}`;
  return `/${prefix}${normalized}`;
}
