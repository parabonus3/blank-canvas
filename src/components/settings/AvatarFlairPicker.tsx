import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Lock, Check, Crown, Zap, Moon, Flower2, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AvatarFlair } from "@/components/avatar/AvatarFlair";
import {
  AVATAR_FLAIRS,
  getFlairsForTier,
  getFlairName,
  getFlairDescription,
  getCategoryLabel,
  DEFAULT_FLAIR_BY_TIER,
  type FlairCategory,
} from "@/lib/avatarFlairs";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  displayName: string;
  avatarUrl: string | null;
}

const CATEGORY_ICON: Record<FlairCategory, typeof Sparkles> = {
  classic: Sparkles,
  dark: Moon,
  feminine: Flower2,
  special: Star,
};

const CATEGORY_ACCENT: Record<FlairCategory, string> = {
  classic: "from-blue-500 to-cyan-400",
  dark: "from-zinc-700 to-zinc-900",
  feminine: "from-pink-400 to-rose-300",
  special: "from-amber-500 to-yellow-400",
};

const SECONDARY_CATEGORIES: FlairCategory[] = ["dark", "feminine", "special"];

export function AvatarFlairPicker({ displayName, avatarUrl }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const initials = (displayName || user?.email || "?")[0]?.toUpperCase() || "?";
  const currentFlair = profile?.avatar_flair || DEFAULT_FLAIR_BY_TIER[tier];
  const [selected, setSelected] = useState<string>(currentFlair);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setSelected(profile?.avatar_flair || DEFAULT_FLAIR_BY_TIER[tier]);
  }, [profile?.avatar_flair, tier]);

  const allowedSet = new Set(getFlairsForTier(tier).map(f => f.id));

  const handleSave = () => {
    if (!allowedSet.has(selected)) return;
    updateProfile.mutate({ avatar_flair: selected } as any);
  };

  const isFree = tier === "free";
  const hiddenCount = AVATAR_FLAIRS.filter(f => SECONDARY_CATEGORIES.includes(f.category)).length;

  const renderCategory = (catId: FlairCategory) => {
    const items = AVATAR_FLAIRS.filter(f => f.category === catId);
    if (items.length === 0) return null;
    const Icon = CATEGORY_ICON[catId];
    const accent = CATEGORY_ACCENT[catId];

    return (
      <section key={catId} className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
            accent
          )}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h3 className={cn(
            "text-sm font-bold uppercase tracking-wider bg-gradient-to-r bg-clip-text text-transparent",
            accent
          )}>
            {getCategoryLabel(catId, t)}
          </h3>
          <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>

        <div className={cn(
          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3",
          isFree && "pointer-events-none opacity-70 blur-[1.5px]"
        )}>
          {items.map((flair, idx) => {
            const isSelected = selected === flair.id;
            const isLocked = !allowedSet.has(flair.id);
            const isPremium = flair.tier === "premium";

            return (
              <button
                key={flair.id}
                type="button"
                disabled={isLocked || isFree}
                onClick={() => setSelected(flair.id)}
                style={{ animationDelay: `${idx * 30}ms` }}
                className={cn(
                  "group relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all duration-300",
                  "animate-fade-in",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/20 scale-[1.03]"
                    : "border-border hover:border-primary/40 hover:bg-muted/40 hover:scale-[1.02]",
                  isLocked && "opacity-60 cursor-not-allowed hover:scale-100"
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow z-10">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {isLocked && !isFree && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow z-10">
                    <Lock className="h-3 w-3" />
                  </span>
                )}

                <div className="py-3 px-1">
                  <AvatarFlair tier={isPremium ? "premium" : "pro"} flairId={flair.id}>
                    <Avatar className="h-14 w-14">
                      {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </AvatarFlair>
                </div>

                <div className="text-center space-y-0.5 min-h-[34px]">
                  <p className={cn(
                    "text-xs font-bold bg-gradient-to-r bg-clip-text text-transparent",
                    accent
                  )}>
                    {getFlairName(flair.id, t)}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                    {getFlairDescription(flair.id, t)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("settings.avatar_flair.title")}
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
          {isFree
            ? t("settings.avatar_flair.description_free")
            : t("settings.avatar_flair.description_paid")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {renderCategory("classic")}

        {showAll && SECONDARY_CATEGORIES.map(cat => renderCategory(cat))}

        {!isFree && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAll(prev => !prev)}
            className="w-full gap-2 border-dashed hover:border-solid hover:bg-primary/5"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" /> {t("settings.avatar_flair.show_less")}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> {t("settings.avatar_flair.show_more", { count: hiddenCount })}
              </>
            )}
          </Button>
        )}

        {isFree ? (
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2">
            <p className="text-sm font-medium">{t("settings.avatar_flair.free_cta_title")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.avatar_flair.free_cta_subtitle")}</p>
            <Button asChild size="sm" className="gradient-primary">
              <Link to="/pricing">{t("settings.avatar_flair.free_cta_button")}</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-card/95 backdrop-blur py-3 -mx-6 px-6 border-t">
            <p className="text-xs text-muted-foreground">
              {tier === "pro"
                ? t("settings.avatar_flair.upgrade_hint_pro")
                : t("settings.avatar_flair.upgrade_hint_premium")}
            </p>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || selected === currentFlair}
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
