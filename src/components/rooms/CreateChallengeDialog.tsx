import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateChallenge, useUpdateChallenge, RoomChallenge } from "@/hooks/useRoomChallenges";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  editing?: RoomChallenge | null;
}

const EMOJIS = ["🎯", "🙏", "📖", "📚", "💻", "🏃", "🧘", "✍️", "🎨", "🎵", "🌱", "⏰"];

export function CreateChallengeDialog({ open, onOpenChange, roomId, editing }: Props) {
  const { t } = useTranslation();
  const create = useCreateChallenge();
  const update = useUpdateChallenge();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [periodType, setPeriodType] = useState<"daily" | "weekly">("daily");
  const [targetMinutes, setTargetMinutes] = useState("10");
  const [durationDays, setDurationDays] = useState("30");

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description || "");
      setEmoji(editing.emoji || "🎯");
      setPeriodType(editing.period_type);
      setTargetMinutes(String(editing.target_minutes));
      setDurationDays(editing.duration_days ? String(editing.duration_days) : "");
    } else {
      setTitle("");
      setDescription("");
      setEmoji("🎯");
      setPeriodType("daily");
      setTargetMinutes("10");
      setDurationDays("30");
    }
  }, [editing, open]);

  const handleSave = async () => {
    const t_min = Math.max(1, parseInt(targetMinutes) || 1);
    const dur = durationDays ? Math.max(1, parseInt(durationDays)) : null;
    if (editing) {
      await update.mutateAsync({
        id: editing.challenge_id,
        roomId,
        title,
        description: description.trim() || null,
        emoji,
        target_minutes: t_min,
        duration_days: dur,
      });
    } else {
      await create.mutateAsync({
        roomId,
        title: title.trim() || "Meta",
        description: description.trim() || null,
        emoji,
        period_type: periodType,
        target_minutes: t_min,
        duration_days: dur,
      });
    }
    onOpenChange(false);
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md max-h-[92dvh] sm:max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>
            {editing ? t("rooms.challenges.edit_title") : t("rooms.challenges.create_title")}
          </DialogTitle>
          <DialogDescription>{t("rooms.challenges.create_desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label>{t("rooms.challenges.emoji")}</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`h-9 w-9 rounded-md border text-lg flex items-center justify-center transition-colors ${
                    emoji === e ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("rooms.challenges.title_label")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("rooms.challenges.title_placeholder")}
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("rooms.challenges.description_label")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("rooms.challenges.description_placeholder")}
              rows={2}
              maxLength={200}
            />
          </div>

          {!editing && (
            <div className="space-y-2">
              <Label>{t("rooms.challenges.period_label")}</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("rooms.challenges.period_daily")}</SelectItem>
                  <SelectItem value="weekly">{t("rooms.challenges.period_weekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("rooms.challenges.target_minutes")}</Label>
              <Input
                type="number"
                min={1}
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("rooms.challenges.duration_days")}</Label>
              <Input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder={t("rooms.challenges.duration_optional")}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 px-6 py-4 border-t bg-background shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave} disabled={pending || !title.trim()}>
            {editing ? t("common.save") : t("rooms.challenges.create_btn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
