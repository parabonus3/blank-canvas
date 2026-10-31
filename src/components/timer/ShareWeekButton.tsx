import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useTimezone } from "@/hooks/useTimezone";
import { usePersonalStreak } from "@/hooks/usePersonalStreak";
import { startOfWeekInTz } from "@/lib/timezone";
import { summarizeWeek, formatHm } from "@/lib/weekShare";

/** Lê uma cor do tema (variável CSS HSL) para desenhar no canvas. */
function themeColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Gera uma imagem do resumo da semana no próprio aparelho e abre o compartilhar do sistema. */
export function ShareWeekButton() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { timezone } = useTimezone();
  const { data: streak } = usePersonalStreak();
  const [open, setOpen] = useState(false);
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);

  const build = async (): Promise<Blob | null> => {
    const start = startOfWeekInTz(new Date(), timezone);
    const entries: { start_time: string; duration: number | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("time_entries").select("start_time, duration")
        .eq("user_id", user!.id).not("end_time", "is", null).gte("start_time", start.toISOString())
        .order("start_time").range(from, from + 999);
      if (error) throw error;
      entries.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const s = summarizeWeek(entries, timezone);
    const W = 1080, H = 1350;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    const primary = themeColor("--primary", "#16a34a");
    const bg = themeColor("--background", "#0b0b0b");
    const fg = themeColor("--foreground", "#fafafa");
    const muted = themeColor("--muted-foreground", "#a1a1aa");
    const card = themeColor("--card", "#18181b");
    const font = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', sans-serif";
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = primary; g.fillRect(0, 0, W, 16);
    g.textAlign = "center";
    let y = 150;
    if (showName) {
      if (profile?.avatar_url) {
        const img = await loadImage(profile.avatar_url);
        if (img) { g.save(); g.beginPath(); g.arc(W / 2, 150, 70, 0, Math.PI * 2); g.clip(); g.drawImage(img, W / 2 - 70, 80, 140, 140); g.restore(); y = 270; }
      }
      g.fillStyle = fg; g.font = `600 44px ${font}`; g.fillText(profile?.display_name || "", W / 2, y); y += 70;
    }
    g.fillStyle = muted; g.font = `500 40px ${font}`; g.fillText(t("share_week.heading"), W / 2, y); y += 170;
    g.fillStyle = primary; g.font = `800 180px ${font}`; g.fillText(formatHm(s.totalSeconds), W / 2, y); y += 70;
    g.fillStyle = muted; g.font = `400 36px ${font}`; g.fillText(t("share_week.focused"), W / 2, y); y += 80;

    const bestLabel = s.best
      ? new Intl.DateTimeFormat(i18n.language, { weekday: "long", timeZone: "UTC" }).format(new Date(`${s.best.key}T12:00:00Z`))
      : "—";
    const stats: [string, string][] = [
      [String(s.activeDays) + "/7", t("share_week.days")],
      [String(streak?.streak ?? 0), t("share_week.streak")],
      [bestLabel, t("share_week.best_day")],
    ];
    stats.forEach(([value, label], i) => {
      const top = y + i * 190;
      g.fillStyle = card; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(110, top, W - 220, 160, 32) : g.rect(110, top, W - 220, 160); g.fill();
      g.textAlign = "left"; g.fillStyle = muted; g.font = `400 34px ${font}`; g.fillText(label, 160, top + 95);
      g.textAlign = "right"; g.fillStyle = fg; g.font = `700 54px ${font}`; g.fillText(value, W - 160, top + 100);
    });
    g.textAlign = "center"; g.fillStyle = primary; g.font = `800 52px ${font}`; g.fillText("Timezoni", W / 2, H - 110);
    g.fillStyle = muted; g.font = `400 30px ${font}`; g.fillText("timezoni.com", W / 2, H - 60);
    return new Promise((r) => c.toBlob(r, "image/png"));
  };

  const share = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const blob = await build();
      if (!blob) throw new Error("image");
      const file = new File([blob], "timezoni-semana.png", { type: "image/png" });
      const nav = navigator as any;
      if (nav.canShare?.({ files: [file] })) {
        try { await nav.share({ files: [file], title: "Timezoni", text: t("share_week.text") }); } catch { /* cancelado */ }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast.success(t("share_week.downloaded"));
      }
      setOpen(false);
    } catch {
      toast.error(t("share_week.error"));
    } finally { setBusy(false); }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <Share2 className="h-3.5 w-3.5" />{t("share_week.button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("share_week.title")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("share_week.desc")}</p>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <Label htmlFor="share-name" className="text-sm">{t("share_week.show_name")}</Label>
            <Switch id="share-name" checked={showName} onCheckedChange={setShowName} />
          </div>
          <DialogFooter>
            <Button onClick={share} disabled={busy} className="w-full gap-1 sm:w-auto"><Share2 className="h-4 w-4" />{t("share_week.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
