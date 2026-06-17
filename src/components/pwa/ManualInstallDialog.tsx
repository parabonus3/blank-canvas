import { useTranslation } from "react-i18next";
import { MousePointerClick, Download, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BrowserKind } from "@/lib/browserDetect";

interface ManualInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  browser: BrowserKind;
}

export function ManualInstallDialog({ open, onOpenChange, browser }: ManualInstallDialogProps) {
  const { t } = useTranslation();
  const descKey =
    browser === "firefox"
      ? "pwa.manual_desc_firefox"
      : browser === "safari-mac"
        ? "pwa.manual_desc_safari_mac"
        : browser === "chromium"
          ? "pwa.manual_desc_chrome"
          : "pwa.manual_desc_other";

  const steps =
    browser === "chromium"
      ? [
          { icon: MousePointerClick, text: t("pwa.desktop_step_1") },
          { icon: Download, text: t("pwa.desktop_step_2") },
        ]
      : [{ icon: Info, text: t(descKey) }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("pwa.manual_title")}</DialogTitle>
          <DialogDescription>{t(descKey)}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 mt-2">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-muted-foreground">
                  {t("pwa.step")} {i + 1}
                </div>
                <div className="text-sm">{s.text}</div>
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
