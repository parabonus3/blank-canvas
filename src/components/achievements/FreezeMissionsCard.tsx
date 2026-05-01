import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Check, Target, Flame, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFreezeMissions, FreezeMissionType } from "@/hooks/useFreezeMissions";

const MISSION_META: Record<FreezeMissionType, { icon: React.ElementType; color: string }> = {
  weekly_bronze: { icon: Target, color: "text-amber-600" },
  weekly_gold: { icon: Flame, color: "text-yellow-500" },
  monthly_legendary: { icon: Crown, color: "text-purple-500" },
};

export function FreezeMissionsCard() {
  const { t } = useTranslation();
  const { missions, isLoading } = useFreezeMissions();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Shield className="h-5 w-5 text-primary" />
          {t("freeze_missions.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("freeze_missions.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
        {!isLoading && missions.map((m) => {
          const meta = MISSION_META[m.mission_type];
          const Icon = meta.icon;
          const pct = m.progress_target > 0 ? Math.min(100, (m.progress_current / m.progress_target) * 100) : 0;
          return (
            <div
              key={m.mission_type}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                m.completed ? "bg-primary/5 border-primary/30" : "bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", meta.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {t(`freeze_missions.${m.mission_type}_title`)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(`freeze_missions.${m.mission_type}_desc`)}
                    </div>
                  </div>
                </div>
                {m.completed ? (
                  <Badge variant="default" className="text-xs flex-shrink-0">
                    <Check className="h-3 w-3 mr-1" />
                    {t("freeze_missions.completed")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs flex-shrink-0 whitespace-nowrap">
                    +{m.freezes_reward} <Shield className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Progress value={pct} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {Math.floor(m.progress_current)}/{Math.floor(m.progress_target)}
                </span>
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          {t("freeze_missions.monthly_cap")}
        </p>
      </CardContent>
    </Card>
  );
}
