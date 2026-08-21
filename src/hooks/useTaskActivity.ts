import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaskActivityRow {
  id: string;
  task_id: string | null;
  task_title?: string | null;
  user_id: string | null;
  action: string;
  meta: Record<string, any>;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useTaskActivity(taskId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ["task_activity", taskId, limit],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await (supabase as any).rpc("get_task_activity", {
        _task_id: taskId,
        _limit: limit,
      });
      if (error) throw error;
      return (data || []) as TaskActivityRow[];
    },
    enabled: !!taskId,
    staleTime: 15000,
  });
}

export function useBoardActivity(boardId: string | undefined, limit = 200) {
  return useQuery({
    queryKey: ["board_activity", boardId, limit],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await (supabase as any).rpc("get_board_activity", {
        _board_id: boardId,
        _limit: limit,
      });
      if (error) throw error;
      return (data || []) as TaskActivityRow[];
    },
    enabled: !!boardId,
    staleTime: 15000,
  });
}

/** Texto legível de uma ação, usando i18n com fallback embutido. */
export function activityLabel(
  row: TaskActivityRow,
  t: (k: string, def?: any, o?: any) => string,
  nameFor?: (userId: string) => string
): string {
  const m = row.meta || {};
  switch (row.action) {
    case "task_created": return t("activity.task_created", "criou o cartão");
    case "task_moved": return t("activity.task_moved", "moveu de {{from}} para {{to}}", { from: m.from || "—", to: m.to || "—" });
    case "task_completed": return t("activity.task_completed", "concluiu o cartão");
    case "task_reopened": return t("activity.task_reopened", "reabriu o cartão");
    case "task_due_changed": return m.due_date
      ? t("activity.task_due_changed", "definiu o prazo para {{date}}", { date: new Date(m.due_date).toLocaleDateString() })
      : t("activity.task_due_removed", "removeu o prazo");
    case "task_priority_changed": return t("activity.task_priority_changed", "mudou a prioridade para {{priority}}", { priority: t(`kanban.priority.${m.priority}`, m.priority) });
    case "task_renamed": return t("activity.task_renamed", "renomeou para \"{{to}}\"", { to: m.to });
    case "member_assigned": return t("activity.member_assigned", "adicionou {{name}} como responsável", { name: nameFor?.(m.target_user_id) || "—" });
    case "member_removed": return t("activity.member_removed", "removeu {{name}} dos responsáveis", { name: nameFor?.(m.target_user_id) || "—" });
    case "checklist_added": return t("activity.checklist_added", "adicionou o item \"{{title}}\"", { title: m.title });
    case "checklist_checked": return t("activity.checklist_checked", "concluiu o item \"{{title}}\"", { title: m.title });
    case "checklist_unchecked": return t("activity.checklist_unchecked", "desmarcou o item \"{{title}}\"", { title: m.title });
    case "comment_added": return t("activity.comment_added", "comentou: \"{{excerpt}}\"", { excerpt: m.excerpt });
    case "attachment_added": return t("activity.attachment_added", "anexou {{file}}", { file: m.file_name });
    case "time_logged": return t("activity.time_logged", "apontou {{min}} min", { min: Math.round((m.seconds || 0) / 60) });
    default: return row.action;
  }
}
