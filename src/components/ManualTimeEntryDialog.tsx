import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useSaveTimeEntryTags } from "@/hooks/useTags";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProjectPicker } from "@/components/ProjectPicker";
import { TagPicker } from "@/components/TagPicker";
import { toast } from "sonner";

interface ManualTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualTimeEntryDialog({ open, onOpenChange }: ManualTimeEntryDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();
  const saveEntryTags = useSaveTimeEntryTags();

  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const activeProjects = projects?.filter(p => p.is_active) || [];

  const handleSave = async () => {
    if (!user || !projectId || !date || !startTime || !endTime) return;

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (end <= start) {
      toast.error(t('history.end_before_start'));
      return;
    }

    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

    setSaving(true);
    const { data, error } = await supabase.from("time_entries").insert({
      user_id: user.id,
      project_id: projectId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration: durationSeconds,
      notes: notes.trim() || null,
    }).select().single();

    if (error) {
      setSaving(false);
      toast.error(t('common.error'));
      return;
    }

    // Save tags if any
    if (selectedTagIds.length > 0 && data) {
      await saveEntryTags.mutateAsync({ timeEntryId: data.id, tagIds: selectedTagIds });
    }

    setSaving(false);
    toast.success(t('history.manual_entry_added'));
    queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setProjectId("");
    setDate(new Date().toISOString().slice(0, 10));
    setStartTime("09:00");
    setEndTime("10:00");
    setNotes("");
    setSelectedTagIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('history.add_manual_entry')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('history.project')}</Label>
            <ProjectPicker
              value={projectId}
              onValueChange={setProjectId}
              projects={activeProjects}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('history.date')}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('history.start')}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('history.end')}</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('timer.session_notes_placeholder')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('timer.session_notes_placeholder')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('tags.title')}</Label>
            <TagPicker selectedTagIds={selectedTagIds} onTagsChange={setSelectedTagIds} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!projectId || saving}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
