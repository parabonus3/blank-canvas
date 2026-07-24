import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, Plus, Clock } from "lucide-react";
import { useBoardMembers, useTaskMembers, useAssignTaskMember, useUnassignTaskMember, useTaskMemberTimeTotals } from "@/hooks/useBoardCollab";
import { useActiveTimeEntry } from "@/hooks/useTimeEntries";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

/** Who is currently focusing on this task (live time_entries). */
function useTaskActiveUsers(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_active_users", taskId],
    queryFn: async () => {
      if (!taskId) return new Set<string>();
      const { data } = await supabase
        .from("time_entries")
        .select("user_id")
        .eq("task_id", taskId)
        .is("end_time", null);
      return new Set((data || []).map((e: any) => e.user_id));
    },
    enabled: !!taskId,
    refetchInterval: 20000,
  });
}

interface Props {
  taskId: string;
  boardId: string;
}

export function TaskMemberAssigner({ taskId, boardId }: Props) {
  const { t } = useTranslation();
  const { data: boardMembers = [] } = useBoardMembers(boardId);
  const { data: assigned = [] } = useTaskMembers(taskId);
  const { data: timeMap = new Map<string, number>() } = useTaskMemberTimeTotals(taskId);
  const { data: activeSet = new Set<string>() } = useTaskActiveUsers(taskId);
  const assign = useAssignTaskMember();
  const unassign = useUnassignTaskMember();

  const assignedByUser = new Map(assigned.map(a => [a.user_id, a]));

  if (boardMembers.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{t("kanban.no_members")}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("kanban.assign_members")}</p>
      <div className="space-y-1.5">
        {boardMembers.map(m => {
          const isAssigned = assignedByUser.has(m.user_id);
          const isActive = activeSet.has(m.user_id);
          const totalSec = timeMap.get(m.user_id) || 0;
          const initials = (m.display_name || "?").trim().slice(0, 2).toUpperCase();
          return (
            <div
              key={m.user_id}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                isAssigned ? "bg-primary/5 border-primary/30" : "bg-card/50 border-border"
              )}
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                </Avatar>
                {isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-background animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.display_name || "—"}</div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="uppercase tracking-wide">{t(`kanban.member_role_${m.role}`, m.role)}</span>
                  {totalSec > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />{fmtHM(totalSec)}
                    </span>
                  )}
                  {isActive && (
                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                      {t("kanban.focusing_now")}
                    </span>
                  )}
                </div>
              </div>
              {isAssigned ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1"
                  onClick={() => {
                    const row = assignedByUser.get(m.user_id);
                    if (row) unassign.mutate({ taskId, memberId: row.id });
                  }}
                >
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs">{t("kanban.unassign")}</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={() => assign.mutate({ taskId, userId: m.user_id })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs">{t("kanban.assign")}</span>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
