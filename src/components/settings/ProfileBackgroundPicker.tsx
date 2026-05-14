import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Lock, Check, Crown, Zap, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import {
  WALLPAPERS,
  WALLPAPER_NONE,
  getWallpapersForTier,
  type WallpaperDef,
} from "@/lib/wallpapers";

function PreviewSwatch({ def }: { def: WallpaperDef | null }) {
  return (
    <div
      className={cn(
        "h-20 w-full rounded-lg border border-border/60 overflow-hidden relative",
        def?.animationClass,
      )}
      style={{
        background: def?.background ?? "hsl(var(--muted))",
        backgroundSize: "cover",
      }}
    >
      {!def && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
          —
        </div>
      )}
    </div>
  );
}

export function ProfileBackgroundPicker() {
  const { t } = useTranslation();
  const { tier } = useSubscription();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const current = profile?.profile_background || "none";
  const [selected, setSelected] = useState<string>(current);

  useEffect(() => {
    setSelected(profile?.profile_background || "none");
  }, [profile?.profile_background]);

  const allowedSet = new Set(getWallpapersForTier(tier).map((w) => w.id));
  const isFree = tier === "free";

  const handleSave = () => {
    updateProfile.mutate({ profile_background: selected } as any);
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <ImageIcon className="h-5 w-5 text-primary" />
          {t("settings.profile_background.title")}
          {tier === "premium" && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0">
              <Crown className="h-3 w-3 mr-1" /> {t("settings.avatar_flair.badge_premium")}
            </Badge>
          )}
          {tier === "pro" && (
            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white border-0">
              <Zap className="h-3 w-3 mr-1" /> {t("settings.avatar_flair.badge_pro")}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {t("settings.profile_background.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {/* "None" option */}
          <button
            type="button"
            onClick={() => setSelected("none")}
            className={cn(
              "group relative flex flex-col items-stretch gap-2 rounded-xl border-2 p-2 transition-all",
              selected === "none"
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/40",
            )}
          >
            {selected === "none" && (
              <span className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
            <PreviewSwatch def={null} />
            <p className="text-xs font-medium text-center">
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
                  "group relative flex flex-col items-stretch gap-2 rounded-xl border-2 p-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/40",
                  isLocked && "opacity-60 cursor-not-allowed",
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {isLocked && (
                  <span className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
                <PreviewSwatch def={w} />
                <p className="text-xs font-medium text-center capitalize">
                  {t(`wallpapers.${w.id}`, { defaultValue: w.id.replace(/-/g, " ").replace(/^(free|pro|premium)\s/, "") })}
                </p>
                {w.tier === "premium" && (
                  <span className="absolute top-2 left-2 text-amber-500">
                    <Sparkles className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isFree ? (
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2">
            <p className="text-sm font-medium">
              {t("settings.profile_background.upgrade_title")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.profile_background.upgrade_desc")}
            </p>
            <Button asChild size="sm" className="gradient-primary">
              <Link to="/pricing">{t("settings.avatar_flair.free_cta_button")}</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-card/95 backdrop-blur py-3 -mx-6 px-6 border-t">
            <p className="text-xs text-muted-foreground">
              {tier === "pro"
                ? t("settings.profile_background.hint_pro")
                : t("settings.profile_background.hint_premium")}
            </p>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || selected === current}
              size="sm"
            >
              {updateProfile.isPending
                ? t("settings.avatar_flair.saving")
                : t("settings.avatar_flair.save")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
