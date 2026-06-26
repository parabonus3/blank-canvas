import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle, ChevronDown } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCreateChallenge, useUpdateChallenge, RoomChallenge } from "@/hooks/useRoomChallenges";
import { ChallengeTemplatePicker } from "./ChallengeTemplatePicker";
import type { ChallengeTemplate } from "@/lib/roomChallengeTemplates";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  editing?: RoomChallenge | null;
}

const EMOJIS = ["🎯", "🙏", "📖", "📚", "💻", "💼", "🏃", "🧘", "✍️", "🎨", "🎵", "🌱", "⏰", "📝", "🧠", "☕"];

function FieldLabel({
  htmlFor,
  children,
  tip,
  helpLabel,
}: {
  htmlFor?: string;
  children: ReactNode;
  tip: string;
  helpLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="m-0">
        {children}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={helpLabel}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
          {tip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

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
  const [selectedTplId, setSelectedTplId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description || "");
      setEmoji(editing.emoji || "🎯");
      setPeriodType(editing.period_type);
      setTargetMinutes(String(editing.target_minutes));
      setDurationDays(editing.duration_days ? String(editing.duration_days) : "");
      setSelectedTplId(null);
      setAdvancedOpen(true);
    } else {
      setTitle("");
      setDescription("");
      setEmoji("🎯");
      setPeriodType("daily");
      setTargetMinutes("10");
      setDurationDays("30");
      setSelectedTplId(null);
      setAdvancedOpen(false);
    }
  }, [editing, open]);

  const handlePickTemplate = (tpl: ChallengeTemplate) => {
    setSelectedTplId(tpl.id);
    setEmoji(tpl.emoji);
    setPeriodType(tpl.period);
    setTargetMinutes(String(tpl.targetMinutes));
    setDurationDays(tpl.durationDays ? String(tpl.durationDays) : "");
    setTitle(t(`rooms.challenges.templates.items.${tpl.id}.title`));
    setDescription(t(`rooms.challenges.templates.items.${tpl.id}.desc`));
    setAdvancedOpen(true);
  };

  const handlePickBlank = () => {
    setSelectedTplId(null);
    setTitle("");
    setDescription("");
    setEmoji("🎯");
    setPeriodType("daily");
    setTargetMinutes("10");
    setDurationDays("30");
    setAdvancedOpen(true);
  };

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
        title: title.trim() || t("rooms.challenges.title_placeholder"),
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
  const helpLabel = t("rooms.challenges.help", "Help");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[92dvh] sm:max-h-[88vh] flex flex-col gap-0 p-0">
        <TooltipProvider delayDuration={150}>
          <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-2 shrink-0">
            <DialogTitle>
              {editing ? t("rooms.challenges.edit_title") : t("rooms.challenges.create_title")}
            </DialogTitle>
            <DialogDescription>{t("rooms.challenges.create_desc")}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
            {!editing && (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("rooms.challenges.templates.pick_template")}
                </div>
                <ChallengeTemplatePicker
                  selectedId={selectedTplId}
                  onSelect={handlePickTemplate}
                  onPickBlank={handlePickBlank}
                />
              </div>
            )}

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              {!editing && (
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <span>{t("rooms.challenges.templates.customize")}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                  </button>
                </CollapsibleTrigger>
              )}

              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <FieldLabel tip={t("rooms.challenges.tooltip_emoji")} helpLabel={helpLabel}>
                    {t("rooms.challenges.emoji")}
                  </FieldLabel>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                  <FieldLabel htmlFor="challenge-title" tip={t("rooms.challenges.tooltip_title")} helpLabel={helpLabel}>
                    {t("rooms.challenges.title_label")}
                  </FieldLabel>
                  <Input
                    id="challenge-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("rooms.challenges.title_placeholder")}
                    maxLength={80}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="challenge-desc" tip={t("rooms.challenges.tooltip_description")} helpLabel={helpLabel}>
                    {t("rooms.challenges.description_label")}
                  </FieldLabel>
                  <Textarea
                    id="challenge-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("rooms.challenges.description_placeholder")}
                    rows={2}
                    maxLength={200}
                  />
                </div>

                {!editing && (
                  <div className="space-y-2">
                    <FieldLabel tip={t("rooms.challenges.tooltip_period")} helpLabel={helpLabel}>
                      {t("rooms.challenges.period_label")}
                    </FieldLabel>
                    <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t("rooms.challenges.period_daily")}</SelectItem>
                        <SelectItem value="weekly">{t("rooms.challenges.period_weekly")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="challenge-minutes" tip={t("rooms.challenges.tooltip_target_minutes")} helpLabel={helpLabel}>
                      {t("rooms.challenges.target_minutes")}
                    </FieldLabel>
                    <Input
                      id="challenge-minutes"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={targetMinutes}
                      onChange={(e) => setTargetMinutes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="challenge-duration" tip={t("rooms.challenges.tooltip_duration_days")} helpLabel={helpLabel}>
                      {t("rooms.challenges.duration_days")}
                    </FieldLabel>
                    <Input
                      id="challenge-duration"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      placeholder={t("rooms.challenges.duration_optional")}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 px-5 sm:px-6 py-4 border-t bg-background shrink-0">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={pending || !title.trim()}>
              {editing ? t("common.save") : t("rooms.challenges.create_btn")}
            </Button>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
