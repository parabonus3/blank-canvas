import { useState, useEffect } from "react";
import { Sparkles, Lock, Check, Crown, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AvatarFlair } from "@/components/avatar/AvatarFlair";
import { AVATAR_FLAIRS, getFlairsForTier, DEFAULT_FLAIR_BY_TIER, type AvatarFlairDef } from "@/lib/avatarFlairs";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  displayName: string;
  avatarUrl: string | null;
}

export function AvatarFlairPicker({ displayName, avatarUrl }: Props) {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const initials = (displayName || user?.email || "?")[0]?.toUpperCase() || "?";
  const currentFlair = profile?.avatar_flair || DEFAULT_FLAIR_BY_TIER[tier];
  const [selected, setSelected] = useState<string>(currentFlair);

  useEffect(() => {
    setSelected(profile?.avatar_flair || DEFAULT_FLAIR_BY_TIER[tier]);
  }, [profile?.avatar_flair, tier]);

  const visibleFlairs = AVATAR_FLAIRS;
  const allowedSet = new Set(getFlairsForTier(tier).map(f => f.id));

  const handleSave = () => {
    if (!allowedSet.has(selected)) return;
    updateProfile.mutate({ avatar_flair: selected } as any);
  };

  const isFree = tier === "free";

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
            : "Escolha um efeito animado para seu avatar. Aparece em salas, lista de amigos e perfis."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className={cn(
          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4",
          isFree && "pointer-events-none opacity-70 blur-[1.5px]"
        )}>
          {visibleFlairs.map((flair, idx) => {
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
                  "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                  "animate-fade-in",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "border-border hover:border-primary/40 hover:bg-muted/40",
                  isLocked && "opacity-60 cursor-not-allowed"
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                {isLocked && !isFree && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                    <Lock className="h-3 w-3" />
                  </span>
                )}

                <div className="py-3">
                  <AvatarFlair tier={isPremium ? "premium" : "pro"} flairId={flair.id}>
                    <Avatar className="h-14 w-14">
                      {avatarUrl && <AvatarImage src={avatarUrl} />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </AvatarFlair>
                </div>

                <div className="text-center space-y-0.5">
                  <p className={cn(
                    "text-xs font-semibold",
                    isPremium
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent"
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

        {isFree ? (
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center space-y-2">
            <p className="text-sm font-medium">
              Desbloqueie efeitos animados no seu avatar.
            </p>
            <p className="text-xs text-muted-foreground">
              Pro: 4 efeitos animados • Premium: 7 efeitos exclusivos
            </p>
            <Button asChild size="sm" className="gradient-primary">
              <Link to="/pricing">Ver planos</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {tier === "pro" ? "Faça upgrade para Premium e desbloqueie 7 efeitos exclusivos." : "Aproveite todos os efeitos disponíveis."}
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
