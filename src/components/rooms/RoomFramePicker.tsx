import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Image as ImageIcon, Lock, Check, Sparkles, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  WALLPAPERS,
  getWallpapersForTier,
  type WallpaperDef,
} from "@/lib/wallpapers";

interface Props {
  roomId: string;
  currentBackground?: string | null;
}

function PreviewSwatch({ def }: { def: WallpaperDef | null }) {
  return (
    <div
      className={cn(
        "h-16 w-full rounded-lg overflow-hidden relative",
        def ? "p-[3px]" : "border border-border/60",
        def?.animationClass,
      )}
      style={
        def
          ? {
              background: def.borderBackground,
              backgroundSize: def.animationClass ? "300% 300%" : "100% 100%",
            }
          : undefined
      }
    >
      <div className="h-full w-full rounded-[inherit] bg-card" />
    </div>
  );
}

export function RoomFramePicker({ roomId, currentBackground }: Props) {
  const { t } = useTranslation();
  const { tier } = useSubscription();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selected, setSelected] = useState<string>(currentBackground || "none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(currentBackground || "none");
  }, [currentBackground]);

  const allowedSet = new Set(getWallpapersForTier(tier).map((w) => w.id));
  const isFree = tier === "free";

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("study_rooms")
        .update({ room_background: selected } as any)
        .eq("id", roomId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      toast({ title: t("common.success") });
    } catch (e: any) {
      toast({
        title: t("common.error"),
        description: e.message,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2 flex-wrap">
        <ImageIcon className="h-4 w-4 text-primary" />
        {t("rooms.background.title")}
        {tier === "premium" && (
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px]">
            <Crown className="h-2.5 w-2.5 mr-0.5" /> Premium
          </Badge>
        )}
        {tier === "pro" && (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white border-0 text-[10px]">
            <Zap className="h-2.5 w-2.5 mr-0.5" /> Pro
          </Badge>
        )}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t("rooms.background.description")}
      </p>

      {isFree ? (
        <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2">
          <p className="text-sm font-medium">{t("rooms.background.upgrade_title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("rooms.background.upgrade_desc")}
          </p>
          <Button asChild size="sm" className="gradient-primary">
            <Link to="/pricing">{t("settings.avatar_flair.free_cta_button")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setSelected("none")}
              className={cn(
                "relative flex flex-col gap-1.5 rounded-lg border-2 p-1.5 transition-all",
                selected === "none"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              {selected === "none" && (
                <span className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-2.5 w-2.5" />
                </span>
              )}
              <PreviewSwatch def={null} />
              <p className="text-[10px] font-medium text-center">
                {t("settings.profile_background.none")}
              </p>
            </button>
            {WALLPAPERS.map((w) => {
              const isSelected = selected === w.id;
              const isLocked = !allowedSet.has(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setSelected(w.id)}
                  className={cn(
                    "relative flex flex-col gap-1.5 rounded-lg border-2 p-1.5 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                    isLocked && "opacity-60 cursor-not-allowed",
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {isLocked && (
                    <span className="absolute top-1 right-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
                      <Lock className="h-2.5 w-2.5" />
                    </span>
                  )}
                  <PreviewSwatch def={w} />
                  <p className="text-[10px] font-medium text-center capitalize">
                    {t(`wallpapers.${w.id}`, {
                      defaultValue: w.id.replace(/-/g, " ").replace(/^(free|pro|premium)\s/, ""),
                    })}
                  </p>
                  {w.tier === "premium" && (
                    <span className="absolute top-1 left-1 text-amber-500">
                      <Sparkles className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || selected === (currentBackground || "none")}
            >
              {saving ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
