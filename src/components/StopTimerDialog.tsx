import { useState } from "react";
import { useTranslation } from "react-i18next";
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

interface StopTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes?: string, tagIds?: string[]) => void;
  projectName?: string;
  duration?: string;
}

export function StopTimerDialog({
  open,
  onOpenChange,
  onConfirm,
  projectName,
  duration,
}: StopTimerDialogProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('timer.stop_session')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{projectName}</span>
            <span className="font-mono font-bold text-primary">{duration}</span>
          </div>
          <Textarea
            placeholder={t('timer.session_notes_placeholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            autoFocus
          />
          <TagPicker selectedTagIds={selectedTagIds} onTagsChange={setSelectedTagIds} />
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip}>
            {t('timer.skip_notes')}
          </Button>
          <Button onClick={handleConfirm}>
            {t('timer.save_and_stop')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
