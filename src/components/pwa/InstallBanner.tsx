import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";
import { SmartInstallButton } from "./SmartInstallButton";

const KEY = "tz_pwa_banner_dismissed_at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

interface InstallBannerProps {
  className?: string;
}

export function InstallBanner({ className }: InstallBannerProps) {
  const { t } = useTranslation();
  const { canInstall, isInstalled } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(isDismissed());
  }, []);

  if (isInstalled || !canInstall || dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "w-full border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 sm:px-4 py-2">
        <Download className="h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate">
            <span className="hidden sm:inline">{t("pwa.banner_title")}</span>
            <span className="sm:hidden">{t("pwa.install_button")}</span>
          </p>
        </div>
        <SmartInstallButton variant="compact" className="h-8 px-3 text-xs" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleDismiss}
          aria-label={t("pwa.banner_dismiss")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
