import { memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckSquare2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TaskChecklistItem } from "@/hooks/useTaskChecklists";

interface MemberLike {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  items: TaskChecklistItem[];
  members?: MemberLike[];
  onOpen?: () => void;
}

/**
 * Compact checklist block for the board card.
 * Header line: icon + counter + inline progress bar + avatars of who completed items.
 * Preview: next pending items (1 on very small screens, 2 from `sm`).
 */
function TaskChecklistPreviewComponent({ items, members = [], onOpen }: Props) {
  const { t } = useTranslation();

  const total = items.length;
  const done = items.filter(i => i.is_completed).length;
  const pending = items.filter(i => !i.is_completed);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const state: "empty" | "progress" | "complete" =
    total === 0 || done === 0 ? "empty" : done === total ? "complete" : "progress";

  // People who completed checklist items (most recent first).
  const doerIds = useMemo(() => {
    const seen: string[] = [];
    [...items]
      .filter(i => i.is_completed && i.completed_by)
      .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""))
      .forEach(i => { if (!seen.includes(i.completed_by!)) seen.push(i.completed_by!); });
    return seen;
  }, [items]);

  const memberMap = useMemo(() => {
    const m = new Map<string, MemberLike>();
    members.forEach(x => m.set(x.user_id, x));
    return m;
  }, [members]);

  const unknownIds = useMemo(() => doerIds.filter(id => !memberMap.has(id)), [doerIds, memberMap]);

  // Fallback profile lookup only for doers that are not board/task members.
  const { data: extraProfiles } = useQuery({
    queryKey: ["checklist_profiles", unknownIds.slice().sort().join(",")],
    queryFn: async () => {
      const map = new Map<string, MemberLike>();
      await Promise.all(unknownIds.map(async (uid) => {
        const { data } = await (supabase as any).rpc("get_member_public_stats", { _user_id: uid });
        const row = Array.isArray(data) ? data[0] : null;
        map.set(uid, {
          user_id: uid,
          display_name: row?.display_name ?? null,
          avatar_url: row?.avatar_url ?? null,
        });
      }));
      return map;
    },
    enabled: unknownIds.length > 0,
    staleTime: 300_000,
  });

  const doers: MemberLike[] = doerIds.map(id =>
    memberMap.get(id) || extraProfiles?.get(id) || { user_id: id, display_name: null, avatar_url: null }
  );
  const visibleDoers = doers.slice(0, 3);
  const restDoers = doers.length - visibleDoers.length;

  if (total === 0) return null;

  const barColor =
    state === "complete" ? "bg-emerald-500" : state === "progress" ? "bg-amber-500" : "bg-muted-foreground/30";
  const chipClass =
    state === "complete"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : state === "progress"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "border-border bg-muted text-muted-foreground";

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-md border bg-muted/30 px-2 py-1.5 space-y-1 transition-colors",
        onOpen && "cursor-pointer hover:bg-muted/60",
        state === "complete" && "border-emerald-500/30",
        state === "progress" && "border-amber-500/30"
      )}
      onClick={onOpen ? (e) => { e.stopPropagation(); onOpen(); } : undefined}
      role={onOpen ? "button" : undefined}
      aria-label={t("kanban.tab_checklist", "Checklist") as string}
    >
      {/* Header: chip + progress bar + doers */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            chipClass
          )}
        >
          <CheckSquare2 className="h-2.5 w-2.5" />
          {state === "complete"
            ? t("kanban.checklist_completed_label", "Concluído")
            : `${done}/${total}`}
        </span>

        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>

        {visibleDoers.length > 0 && (
          <div className="flex shrink-0 -space-x-1.5">
            {visibleDoers.map(d => {
              const initials = (d.display_name || "?").trim().slice(0, 2).toUpperCase();
              return (
                <Avatar
                  key={d.user_id}
                  className="h-4 w-4 border border-background text-[8px]"
                  title={t("kanban.checklist_by", "Concluído por {{name}}", { name: d.display_name || "—" }) as string}
                >
                  {d.avatar_url && <AvatarImage src={d.avatar_url} />}
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
              );
            })}
            {restDoers > 0 && (
              <div className="flex h-4 w-4 items-center justify-center rounded-full border border-background bg-muted text-[8px] font-semibold text-muted-foreground">
                +{restDoers}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending items preview */}
      {pending.length > 0 && (
        <div className="space-y-0.5">
          {pending.slice(0, 2).map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-1 text-[11px] leading-tight text-muted-foreground",
                idx === 1 && "hidden sm:flex"
              )}
            >
              <Circle className="h-2 w-2 shrink-0 opacity-50" />
              <span className="truncate">{item.title}</span>
            </div>
          ))}
          {pending.length > 1 && (
            <div className="text-[10px] leading-tight text-muted-foreground/70 sm:hidden">
              {t("kanban.checklist_more_items", "+{{count}} itens", { count: pending.length - 1 })}
            </div>
          )}
          {pending.length > 2 && (
            <div className="hidden text-[10px] leading-tight text-muted-foreground/70 sm:block">
              {t("kanban.checklist_more_items", "+{{count}} itens", { count: pending.length - 2 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const TaskChecklistPreview = memo(TaskChecklistPreviewComponent);
