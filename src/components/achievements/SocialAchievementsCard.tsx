import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, Flag, Lock, Swords, Trophy, Users, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export const SOCIAL_ACHIEVEMENTS = [
  { type: "group_first", icon: Users },
  { type: "group_five", icon: UsersRound },
  { type: "kept_promise", icon: CalendarCheck2 },
  { type: "duel_win", icon: Swords },
  { type: "challenge_done", icon: Flag },
  { type: "same_room_7", icon: Trophy },
] as const;

/** Conquistas sociais: conferidas e liberadas apenas pelo servidor a partir do que a pessoa fez. */
export function SocialAchievementsCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: unlocked = [] } = useQuery({
    queryKey: ["socialAchievements", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("check_social_achievements");
      if (error) throw error;
      return ((data || []) as any[]).map((r) => (typeof r === "string" ? r : r.check_social_achievements ?? Object.values(r)[0])) as string[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const set = new Set(unlocked);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" />{t("social_ach.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("social_ach.subtitle", { done: set.size, total: SOCIAL_ACHIEVEMENTS.length })}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SOCIAL_ACHIEVEMENTS.map(({ type, icon: Icon }) => {
          const on = set.has(type);
          return (
            <div key={type} className={cn("flex items-start gap-3 rounded-xl border p-3", on ? "border-primary/40 bg-primary/5" : "opacity-70")}>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {on ? <Icon className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t(`social_ach.${type}.name`)}</p>
                <p className="text-xs text-muted-foreground">{t(`social_ach.${type}.desc`)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
