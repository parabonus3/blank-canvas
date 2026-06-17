import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { detectBrowser } from "@/lib/browserDetect";
import { IOSInstallDialog } from "./IOSInstallDialog";
import { ManualInstallDialog } from "./ManualInstallDialog";

type Variant = "hero" | "compact" | "icon";

interface SmartInstallButtonProps {
  variant?: Variant;
  className?: string;
  /**
   * When true, always render even if no native prompt is available
   * (so user can see manual install instructions). Default true.
   */
  alwaysShow?: boolean;
}

export function SmartInstallButton({
  variant = "compact",
  className,
  alwaysShow = true,
}: SmartInstallButtonProps) {
  const { t } = useTranslation();
  const { canPrompt, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const browser = useMemo(detectBrowser, []);

  if (isInstalled) return null;
  if (!alwaysShow && !canPrompt && !isIOS) return null;

  const handleClick = async () => {
    if (canPrompt) {
      await promptInstall();
      return;
    }
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    setManualOpen(true);
  };

  const label = variant === "hero" ? t("pwa.hero_cta") : t("pwa.install_button");

  const sizeClass =
    variant === "hero"
      ? "h-12 px-7 text-sm sm:text-base"
      : variant === "icon"
        ? "h-9 w-9 p-0"
        : "";

  const styleClass =
    variant === "hero"
      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_10px_40px_-10px_hsl(189_94%_50%/0.6)]"
      : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary";

  return (
    <>
      <Button
        type="button"
        variant={variant === "hero" ? "default" : "outline"}
        size={variant === "hero" ? "lg" : variant === "icon" ? "icon" : "default"}
        onClick={handleClick}
        className={cn(
          variant !== "icon" && "gap-2 justify-center",
          sizeClass,
          styleClass,
          className,
        )}
        aria-label={label}
      >
        <Download className={cn("shrink-0", variant === "hero" ? "h-5 w-5" : "h-4 w-4")} />
        {variant !== "icon" && <span className="truncate">{label}</span>}
      </Button>
      <IOSInstallDialog open={iosOpen} onOpenChange={setIosOpen} />
      <ManualInstallDialog open={manualOpen} onOpenChange={setManualOpen} browser={browser} />
    </>
  );
}
