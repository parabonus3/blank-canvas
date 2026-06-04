import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LocalizedLanding } from "@/components/LocalizedLanding";
import { findLandingBySlug } from "@/lib/localizedLandings";
import { langFromI18n } from "@/lib/i18nRoutes";
import NotFound from "@/pages/NotFound";

/**
 * Route component for /<lang>/<slug> keyword landings.
 * 404s if no config exists for the (lang, slug) pair.
 */
export default function LocalizedLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const currentLang = langFromI18n(i18n.language);

  if (!slug) return <NotFound />;
  const config = findLandingBySlug(currentLang.code, slug);
  if (!config) return <NotFound />;
  return <LocalizedLanding config={config} />;
}
