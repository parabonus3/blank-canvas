import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Pause, Play, Trash2, Users, DoorOpen, Clock3, Loader2 } from "lucide-react";
import { useSeedAction, useSeedStats } from "@/hooks/useSeedData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export function SeedDataTab() {
  const { t } = useTranslation();
  const { data, isLoading } = useSeedStats();
  const action = useSeedAction();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState("");
  const [progress, setProgress] = useState(0);

  const generate = async () => {
    setProgress(1);
    if ((data?.users ?? 0) === 0) {
      for (let offset = 0; offset < 796; offset += 5) {
        await action.mutateAsync({ action: "seed_users", payload: { offset } });
        setProgress(Math.min(20, Math.round(((offset + 5) / 796) * 20)));
      }
    } else {
      setProgress(20);
    }
    for (let offset = 0; offset < (data?.target_rooms ?? 80); offset += 5) {
      await action.mutateAsync({ action: "seed_rooms", payload: { offset } });
      setProgress(20 + Math.round(((offset + 5) / (data?.target_rooms ?? 80)) * 20));
    }
    setProgress(40);
    for (let offset = 0; offset < Math.max(data?.users ?? 796, 796); offset += 5) {
      await action.mutateAsync({ action: "seed_history", payload: { offset } });
      setProgress(40 + Math.round(((offset + 5) / Math.max(data?.users ?? 796, 796)) * 60));
    }
    setProgress(100);
    toast({ title: t("seed_admin.completed_title"), description: t("seed_admin.completed_desc") });
  };

  const togglePresence = () => action.mutate({ action: "set_presence", payload: { enabled: !data?.presence_enabled } });
  const purge = async () => {
    await action.mutateAsync({ action: "purge" });
    setConfirm(""); setProgress(0);
    toast({ title: t("seed_admin.removed_title"), description: t("seed_admin.removed_desc") });
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>;
  const ready = (data?.locales ?? []).every((locale) => locale.rooms >= locale.target_rooms && locale.with_history >= locale.members);
  return <div className="space-y-5">
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <Stat icon={Users} label={t("seed_admin.people")} value={data?.users ?? 0} />
      <Stat icon={DoorOpen} label={t("seed_admin.rooms")} value={data?.rooms ?? 0} />
      <Stat icon={Clock3} label={t("seed_admin.sessions")} value={data?.sessions ?? 0} />
    </div>

    <Card>
       <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot className="h-5 w-5 text-primary" />{t("seed_admin.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
         <p className="text-sm text-muted-foreground">{t("seed_admin.description")}</p>
         {action.isPending && <div className="space-y-2"><Progress value={progress} /><p className="text-xs text-muted-foreground">{t("seed_admin.generating", { progress })}</p></div>}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={generate} disabled={action.isPending || ready}>
            {action.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
             {ready ? t("seed_admin.complete") : t("seed_admin.complete_missing")}
          </Button>
          <Button variant="outline" onClick={togglePresence} disabled={action.isPending || !ready}>
            {data?.presence_enabled ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
             {data?.presence_enabled ? t("seed_admin.pause") : t("seed_admin.activate")}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="text-base">{t("seed_admin.by_language")}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {(data?.locales ?? []).map((locale) => (
            <div key={locale.locale} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 sm:grid-cols-[1fr_repeat(4,minmax(70px,auto))] sm:items-center">
              <div className="font-medium">{t(`seed_admin.languages.${locale.locale}`)}</div>
              <div className="text-sm font-semibold sm:text-center">{locale.rooms}/{locale.target_rooms} <span className="font-normal text-muted-foreground">{t("seed_admin.rooms_short")}</span></div>
              <div className="hidden text-sm text-muted-foreground sm:block">{locale.users} {t("seed_admin.people_short")}</div>
              <div className="hidden text-sm text-muted-foreground sm:block">{locale.members} {t("seed_admin.members_short")}</div>
              <div className="hidden text-sm text-muted-foreground sm:block">{locale.with_history} {t("seed_admin.history_short")}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {(data?.users ?? 0) > 0 && <Card className="border-destructive/30">
       <CardHeader><CardTitle className="text-base text-destructive">{t("seed_admin.remove_title")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
         <p className="text-sm text-muted-foreground">{t("seed_admin.remove_desc")}</p>
         <div className="flex flex-col sm:flex-row gap-2"><Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="REMOVER" className="sm:max-w-xs" /><Button variant="destructive" disabled={confirm !== "REMOVER" || action.isPending} onClick={purge}><Trash2 className="h-4 w-4 mr-2" />{t("seed_admin.remove_all")}</Button></div>
      </CardContent>
    </Card>}
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <Card><CardContent className="p-3 sm:p-4"><Icon className="h-4 w-4 text-primary mb-2" /><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl sm:text-2xl font-bold">{value.toLocaleString()}</p></CardContent></Card>;
}