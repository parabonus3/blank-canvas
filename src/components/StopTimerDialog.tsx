import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TagPicker } from "@/components/TagPicker";
import { LazyRouteMap } from "@/components/gps/LazyRouteMap";
import { formatDistance, formatPace, type GeoPoint } from "@/lib/geo";

interface StopTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes?: string, tagIds?: string[]) => void;
  projectName?: string;
  duration?: string;
  /** Trajeto gravado nesta sessão (modo corrida). */
  runPoints?: GeoPoint[];
  runDistance?: number;
  runPace?: number | null;
}

export function StopTimerDialog({
  open,
  onOpenChange,
  onConfirm,
  projectName,
  duration,
  runPoints,
  runDistance,
  runPace,
}: StopTimerDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const hasRun = !!runPoints && runPoints.length > 1;

  const handleConfirm = () => {
    onConfirm(notes.trim() || undefined, selectedTagIds.length > 0 ? selectedTagIds : undefined);
    setNotes("");
    setSelectedTagIds([]);
  };

  const handleSkip = () => {
    onConfirm();
    setNotes("");
    setSelectedTagIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          hasRun
            ? "sm:max-w-2xl max-h-[88dvh] overflow-y-auto"
            : "sm:max-w-md max-h-[88dvh] overflow-y-auto"
        }
      >
        <DialogHeader>
          <DialogTitle>{t("timer.stop_session")}</DialogTitle>
        </DialogHeader>

        <div className={hasRun ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
          {hasRun && (
            <div className="space-y-2 order-first">
              <LazyRouteMap
                points={runPoints!}
                follow={false}
                interactive={false}
                className="h-36 sm:h-52 w-full"
              />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-muted/50 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("runs.distance")}
                  </p>
                  <p className="text-base font-bold font-mono tabular-nums">
                    {formatDistance(runDistance ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/50 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("runs.avg_pace")}
                  </p>
                  <p className="text-base font-bold font-mono tabular-nums">{formatPace(runPace)}</p>
                  <p className="text-[10px] text-muted-foreground">{t("runs.per_km")}</p>
                </div>
                <div className="rounded-xl bg-muted/50 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("runs.time")}
                  </p>
                  <p className="text-base font-bold font-mono tabular-nums">{duration}</p>
                </div>
              </div>
              <p className="flex items-start gap-1.5 rounded-lg bg-muted/40 border border-border p-2 text-[11px] leading-relaxed text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {t("runs.approx_note")}
              </p>
            </div>
          )}

          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted-foreground truncate">{projectName}</span>
              <span className="font-mono font-bold text-primary shrink-0">{duration}</span>
            </div>
            <Textarea
              placeholder={t("timer.session_notes_placeholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              autoFocus
            />
            <TagPicker selectedTagIds={selectedTagIds} onTagsChange={setSelectedTagIds} />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip}>
            {t("timer.skip_notes")}
          </Button>
          <Button onClick={handleConfirm}>{t("timer.save_and_stop")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
