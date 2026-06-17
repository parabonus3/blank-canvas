import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { applyUpdateAndReload } from "@/pwa/registerSW";

export function UpdatePrompt() {
  const { t } = useTranslation();
  const shownRef = useRef(false);

  useEffect(() => {
    const onUpdate = () => {
      if (shownRef.current) return;
      shownRef.current = true;
      toast(t("pwa.update_available_title"), {
        description: t("pwa.update_available_desc"),
        duration: Infinity,
        action: {
          label: t("pwa.update_now"),
          onClick: () => {
            void applyUpdateAndReload();
          },
        },
        cancel: {
          label: t("pwa.update_later"),
          onClick: () => {
            shownRef.current = false;
          },
        },
      });
    };
    window.addEventListener("pwa:update-available", onUpdate as EventListener);
    return () => window.removeEventListener("pwa:update-available", onUpdate as EventListener);
  }, [t]);

  return null;
}
