import { useState, useEffect } from "react";
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
  FLAIR_CATEGORIES,
  getFlairsForTier,
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

export function AvatarFlairPicker({ displayName, avatarUrl }: Props) {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const initials = (displayName || user?.email || "?")[0]?.toUpperCase() || "?";
  const currentFlair = profile?.avatar_flair || DEFAULT_FLAIR_BY_TIER[tier];
  const [selected, setSelected] = useState<string>(currentFlair);
  const [expanded, setExpanded] = useState<Record<FlairCategory, boolean>>({
    classic: false, dark: false, feminine: false, special: false,
  });
  const PREVIEW_COUNT = 4;

  useEffect(() => {
    setSelected(profile?.avatar_flair || DEFAULT_FLAIR_BY_TIER[tier]);
  }, [profile?.avatar_flair, tier]);

  const allowedSet = new Set(getFlairsForTier(tier).map(f => f.id));

  const handleSave = () => {
    if (!allowedSet.has(selected)) return;
    updateProfile.mutate({ avatar_flair: selected } as any);
  };

  const isFree = tier === "free";

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-5 w-5 text-primary" />
          Estilo do Avatar
          {tier === "premium" && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0">
              <Crown className="h-3 w-3 mr-1" /> Premium
            </Badge>
          )}
          {tier === "pro" && (
            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white border-0">
              <Zap className="h-3 w-3 mr-1" /> Pro
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isFree
            ? "Disponível em Pro e Premium — escolha um efeito animado para seu avatar (estilo Discord Nitro)."
            : "Escolha um efeito animado. Aparece em salas, lista de amigos e perfis."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {FLAIR_CATEGORIES.map((cat) => {
          const items = AVATAR_FLAIRS.filter(f => f.category === cat.id);
          if (items.length === 0) return null;
          const Icon = CATEGORY_ICON[cat.id];

          return (
            <section key={cat.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                  CATEGORY_ACCENT[cat.id]
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <h3 className={cn(
                  "text-sm font-bold uppercase tracking-wider bg-gradient-to-r bg-clip-text text-transparent",
                  CATEGORY_ACCENT[cat.id]
                )}>
                  {cat.label}
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
                          CATEGORY_ACCENT[flair.category]
                        )}>
                          {flair.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
                          {flair.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {isFree ? (
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2">
            <p className="text-sm font-medium">Desbloqueie efeitos animados no seu avatar.</p>
            <p className="text-xs text-muted-foreground">
              Pro: efeitos Clássicos, Dark e Femininos • Premium: todos os 18 efeitos exclusivos
            </p>
            <Button asChild size="sm" className="gradient-primary">
              <Link to="/pricing">Ver planos</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-card/95 backdrop-blur py-3 -mx-6 px-6 border-t">
            <p className="text-xs text-muted-foreground">
              {tier === "pro"
                ? "Faça upgrade para Premium e desbloqueie todos os efeitos especiais."
                : "Você tem acesso a todos os efeitos disponíveis."}
            </p>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || selected === currentFlair}
              size="sm"
            >
              {updateProfile.isPending ? "Salvando..." : "Salvar estilo"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
