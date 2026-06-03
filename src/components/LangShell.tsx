import { useEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { langFromPrefix } from "@/lib/i18nRoutes";
import NotFound from "@/pages/NotFound";

/**
 * Wraps the language-prefixed public routes (/:lang/...).
 * Validates the lang segment and switches i18next before rendering the child route.
 * Invalid lang -> NotFound (so paths like /timer/foo don't accidentally match).
 */
export function LangShell() {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const config = langFromPrefix(lang);

  useEffect(() => {
    if (config && i18n.language !== config.code) {
      i18n.changeLanguage(config.code);
    }
  }, [config, i18n]);

  if (!config) return <NotFound />;
  return <Outlet />;
}
