import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { IOSInstallDialog } from "./IOSInstallDialog";

export function InstallAppButton() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [iosOpen, setIosOpen] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleClick = async () => {
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    await promptInstall();
  };

  const label = t("pwa.install_button");
  const button = (
    <Button
      variant="outline"
      size={isCollapsed ? "icon" : "default"}
      onClick={handleClick}
      className={cn(
        "w-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
        !isCollapsed && "justify-start gap-3",
      )}
      aria-label={label}
    >
      <Download className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Button>
  );

  return (
    <>
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <IOSInstallDialog open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}
