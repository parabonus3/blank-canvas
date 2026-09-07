import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDuels } from "@/hooks/useDuels";
import { DuelCard } from "./DuelCard";
import { DuelInviteDialog } from "./DuelInviteDialog";
import { Plus, Swords } from "lucide-react";

export function DuelsSection() {
  const { t } = useTranslation();
  const { data: duels = [], isLoading, isError } = useDuels();
  const [showInvite, setShowInvite] = useState(false);

  const { openDuels, pastDuels } = useMemo(() => {
    const open = duels.filter((d) => d.status === "pending" || d.status === "active");
    const past = duels.filter((d) => d.status === "finished" || d.status === "declined");
    return { openDuels: open, pastDuels: past.slice(0, 5) };
  }, [duels]);

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          {t("duels.title")}
        </CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowInvite(true)}>
          <Plus className="h-3.5 w-3.5" />
          {t("duels.new_duel")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : isError ? (
          <p className="text-xs text-destructive">{t("duels.load_error")}</p>
        ) : duels.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("duels.empty")}</p>
        ) : (
          <>
            {openDuels.map((d) => (
              <DuelCard key={d.id} duel={d} />
            ))}
            {pastDuels.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("duels.history")}
                </p>
                {pastDuels.map((d) => (
                  <DuelCard key={d.id} duel={d} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <DuelInviteDialog open={showInvite} onOpenChange={setShowInvite} />
    </Card>
  );
}
