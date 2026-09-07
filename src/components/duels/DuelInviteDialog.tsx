import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFriendProfiles, useFriendships } from "@/hooks/useFriendships";
import { useCreateDuel } from "@/hooks/useDuels";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Swords } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const DURATIONS = [3, 7, 14, 30];

export function DuelInviteDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { accepted, getFriendUserId } = useFriendships();
  const friendIds = useMemo(() => accepted.map((f) => getFriendUserId(f)), [accepted, getFriendUserId]);
  const { data: profiles = [] } = useFriendProfiles(friendIds);
  const create = useCreateDuel();

  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState(10);
  const [days, setDays] = useState(7);

  const reset = () => {
    setOpponentId(null);
    setTitle("");
    setHours(10);
    setDays(7);
  };

  const handleCreate = async () => {
    if (!opponentId) return;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days - 1);
    try {
      await create.mutateAsync({
        opponentId,
        title: title.trim() || null,
        targetMinutes: Math.max(1, Math.round(hours * 60)),
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
      });
      toast({ title: t("duels.invite_sent") });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({ title: t("duels.invite_error"), variant: "destructive" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Swords className="h-4 w-4 text-primary" />
            {t("duels.new_duel")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("duels.pick_friend")}</Label>
            {friendIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("duels.no_friends")}</p>
            ) : (
              <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                {friendIds.map((uid) => {
                  const p: any = profiles.find((x: any) => x.user_id === uid);
                  const active = opponentId === uid;
                  return (
                    <button
                      key={uid}
                      type="button"
                      onClick={() => setOpponentId(uid)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2 text-left transition-colors",
                        active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40",
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback>{(p?.display_name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {p?.display_name || t("rooms.anonymous")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="duel-title">
              {t("duels.title_label")}
            </Label>
            <Input
              id="duel-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("duels.title_placeholder")}
              maxLength={60}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="duel-hours">
                {t("duels.target_hours")}
              </Label>
              <Input
                id="duel-hours"
                type="number"
                min={1}
                max={500}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("duels.duration")}</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-lg border py-1.5 text-xs font-medium transition-colors",
                      days === d
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {t("duels.days", { count: d })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            disabled={!opponentId || create.isPending}
            onClick={handleCreate}
          >
            {t("duels.send_invite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
