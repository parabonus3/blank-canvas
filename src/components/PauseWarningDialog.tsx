import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

export const PAUSE_WARNING_KEY = "timezoni-pause-warning-dismissed";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PauseWarningDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [dontShow, setDontShow] = useState(false);

  const handleClose = () => {
    if (dontShow) {
      try {
        localStorage.setItem(PAUSE_WARNING_KEY, "1");
      } catch {}
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("timer.pause_warning_title")}
          </DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">
            {t("timer.pause_warning_body")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="dont-show-pause"
            checked={dontShow}
            onCheckedChange={(c) => setDontShow(!!c)}
          />
          <label
            htmlFor="dont-show-pause"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            {t("timer.pause_warning_dont_show")}
          </label>
        </div>
        <DialogFooter>
          <Button onClick={handleClose}>{t("timer.pause_warning_ok")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
