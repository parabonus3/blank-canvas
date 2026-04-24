import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";

interface Props {
  roomId: string;
}

export function RoomHeatmap({ roomId }: Props) {
  const { t } = useTranslation();

  const { data: heatmap = [] } = useQuery({
    queryKey: ["roomHeatmap", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_room_activity_heatmap", { _room_id: roomId });
      if (error) throw error;
      return (data || []) as { hour_of_day: number; total_minutes: number }[];
    },
    enabled: !!roomId,
  });

  if (heatmap.length === 0) return null;

  const maxMinutes = Math.max(...heatmap.map((h) => h.total_minutes), 1);

  // Fill all 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = heatmap.find((h) => h.hour_of_day === i);
    return { hour: i, minutes: found?.total_minutes || 0 };
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        {t("rooms.activity_heatmap")}
      </h3>
      <p className="text-xs text-muted-foreground">{t("rooms.heatmap_desc")}</p>
      <div className="flex items-end gap-[2px] h-20">
        {hours.map((h) => {
          const height = maxMinutes > 0 ? (h.minutes / maxMinutes) * 100 : 0;
          return (
            <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5" title={`${h.hour}h — ${h.minutes}min`}>
              <div
                className="w-full rounded-sm bg-primary/70 transition-all min-h-[2px]"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
    </div>
  );
}
