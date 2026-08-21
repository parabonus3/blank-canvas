import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBoardMembers } from "@/hooks/useBoardCollab";

export interface BoardMemberStat {
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  assigned: number;
  done: number;
  seconds: number;
  checkDone: number;
  overdue: number;
}

/** Métricas por membro do quadro: cartões atribuídos, concluídos, itens de checklist e tempo apontado. */
export function useBoardTeamStats(boardId: string | undefined) {
  const { data: members = [] } = useBoardMembers(boardId);

  return useQuery({
    queryKey: ["board_team_stats", boardId, members.length],
    queryFn: async () => {
      if (!boardId) return [] as BoardMemberStat[];

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, is_completed, due_date")
        .eq("board_id", boardId);
      const taskList = tasks || [];
      const taskIds = taskList.map((t: any) => t.id);
      const taskById = new Map(taskList.map((t: any) => [t.id, t]));

      const base = new Map<string, BoardMemberStat>();
      members.forEach((m: any) =>
        base.set(m.user_id, {
          user_id: m.user_id,
          name: m.display_name || "—",
          avatar_url: m.avatar_url || null,
          role: m.role,
          assigned: 0,
          done: 0,
          seconds: 0,
          checkDone: 0,
          overdue: 0,
        })
      );
      const ensure = (uid: string) => {
        if (!base.has(uid)) {
          base.set(uid, {
            user_id: uid, name: "—", avatar_url: null, role: "member",
            assigned: 0, done: 0, seconds: 0, checkDone: 0, overdue: 0,
          });
        }
        return base.get(uid)!;
      };

      if (taskIds.length) {
        const [{ data: tm }, { data: logs }, { data: checks }] = await Promise.all([
          (supabase as any).from("task_members").select("task_id, user_id").in("task_id", taskIds),
          (supabase as any).from("task_time_logs").select("user_id, seconds").in("task_id", taskIds),
          (supabase as any).from("task_checklists").select("completed_by, is_completed").in("task_id", taskIds),
        ]);

        const now = new Date();
        (tm || []).forEach((r: any) => {
          const s = ensure(r.user_id);
          s.assigned += 1;
          const tk: any = taskById.get(r.task_id);
          if (tk?.is_completed) s.done += 1;
          else if (tk?.due_date && new Date(tk.due_date) < now) s.overdue += 1;
        });
        (logs || []).forEach((r: any) => { ensure(r.user_id).seconds += r.seconds || 0; });
        (checks || []).forEach((r: any) => {
          if (r.is_completed && r.completed_by) ensure(r.completed_by).checkDone += 1;
        });
      }

      return Array.from(base.values()).sort((a, b) => b.seconds - a.seconds || b.done - a.done);
    },
    enabled: !!boardId,
    staleTime: 30000,
  });
}
