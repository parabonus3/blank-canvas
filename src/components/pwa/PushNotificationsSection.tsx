import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Prefs = {
  room_goal_reminder: boolean;
  streak_risk: boolean;
  room_challenge_deadline: boolean;
  friend_activity: boolean;
  re_engagement: boolean;
  chat_mentions: boolean;
  weekly_recap: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  max_per_day: number;
};

const DEFAULTS: Prefs = {
  room_goal_reminder: true,
  streak_risk: true,
  room_challenge_deadline: true,
  friend_activity: true,
  re_engagement: true,
  chat_mentions: true,
  weekly_recap: true,
  quiet_hours_start: 22,
  quiet_hours_end: 8,
  max_per_day: 3,
};

export function PushNotificationsSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { status, loading, subscribe, unsubscribe, sendTest } = usePushSubscription();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [savingTest, setSavingTest] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs(data as unknown as Prefs);
    })();
  }, [user]);

  const update = async (patch: Partial<Prefs>) => {
    if (!user) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next });
  };

  const handleTest = async () => {
    setSavingTest(true);
    try {
      await sendTest();
      toast.success(t("push.test_sent"));
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setSavingTest(false);
    }
  };

  const subscribed = status === "subscribed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          {t("push.title")}
        </CardTitle>
        <CardDescription>{t("push.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "unsupported" && (
          <p className="text-sm text-muted-foreground">{t("push.unsupported")}</p>
        )}
        {status === "needs-install" && (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
            <Smartphone className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{t("push.ios_install_required")}</p>
          </div>
        )}
        {status === "denied" && (
          <p className="text-sm text-destructive">{t("push.denied")}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!subscribed && status !== "needs-install" && status !== "unsupported" && status !== "denied" && (
            <Button onClick={subscribe} disabled={loading} className="gap-2">
              <Bell className="h-4 w-4" />
              {t("push.enable")}
            </Button>
          )}
          {subscribed && (
            <>
              <Button variant="outline" onClick={unsubscribe} disabled={loading} className="gap-2">
                <BellOff className="h-4 w-4" />
                {t("push.disable")}
              </Button>
              <Button variant="secondary" onClick={handleTest} disabled={savingTest} className="gap-2">
                <BellRing className="h-4 w-4" />
                {t("push.send_test")}
              </Button>
            </>
          )}
        </div>

        {subscribed && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {(
                [
                  ["room_goal_reminder", "push.kinds.room_goal"],
                  ["streak_risk", "push.kinds.streak"],
                  ["room_challenge_deadline", "push.kinds.challenge"],
                  ["weekly_recap", "push.kinds.weekly"],
                  ["friend_activity", "push.kinds.friends"],
                  ["chat_mentions", "push.kinds.mentions"],
                  ["re_engagement", "push.kinds.reengage"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border p-3">
                  <Label htmlFor={key} className="text-sm">{t(label)}</Label>
                  <Switch
                    id={key}
                    checked={prefs[key] as boolean}
                    onCheckedChange={(v) => update({ [key]: v } as any)}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <Label className="text-xs">{t("push.quiet_start")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={prefs.quiet_hours_start}
                  onChange={(e) => update({ quiet_hours_start: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">{t("push.quiet_end")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={prefs.quiet_hours_end}
                  onChange={(e) => update({ quiet_hours_end: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">{t("push.max_per_day")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={prefs.max_per_day}
                  onChange={(e) => update({ max_per_day: Number(e.target.value) })}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
