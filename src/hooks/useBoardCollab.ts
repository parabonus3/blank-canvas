import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";


export type BoardRole = "owner" | "editor" | "viewer";

/** Current user's role on a board. Returns null while loading or if not a member. */
export function useBoardRole(boardId: string | undefined): BoardRole | null {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["board_role", boardId, user?.id],
    queryFn: async (): Promise<BoardRole | null> => {
      if (!boardId || !user) return null;
      const { data: board } = await supabase.from("boards").select("user_id").eq("id", boardId).maybeSingle();
      if (board?.user_id === user.id) return "owner";
      const { data: mem } = await (supabase as any)
        .from("board_members").select("role").eq("board_id", boardId).eq("user_id", user.id).maybeSingle();
      const r = (mem?.role as BoardRole | undefined) ?? null;
      if (r === "owner" || r === "editor" || r === "viewer") return r;
      return r ? "editor" : null;
    },
    enabled: !!boardId && !!user,
  });
  return (data as BoardRole | null | undefined) ?? null;
}

export function useUpdateBoardMemberRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: "editor" | "viewer"; boardId: string }) => {
      const { error } = await (supabase as any).from("board_members").update({ role }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["board_members", v.boardId] });
      qc.invalidateQueries({ queryKey: ["board_role", v.boardId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

/** Friend code of the current user, used to share with others so they can invite you. */
export function useMyFriendCode() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_friend_code", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("friend_code").eq("user_id", user.id).maybeSingle();
      return (data?.friend_code as string) || null;
    },
    enabled: !!user,
  });
}

/** Sum of time_entries duration_seconds per user for a specific task. */
export function useTaskMemberTimeTotals(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_member_time_totals", taskId],
    queryFn: async () => {
      const map = new Map<string, number>();
      if (!taskId) return map;
      const { data } = await supabase
        .from("time_entries")
        .select("user_id, duration")
        .eq("task_id", taskId);
      (data || []).forEach((e: any) => {
        map.set(e.user_id, (map.get(e.user_id) || 0) + (e.duration || 0));
      });
      return map;
    },
    enabled: !!taskId,
  });
}

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: string;
  added_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface BoardInvitation {
  id: string;
  board_id: string;
  inviter_id: string;
  invitee_id?: string;
  status?: string;
  created_at: string;
  board_title?: string | null;
  board_color?: string | null;
  inviter_name?: string | null;
  inviter_avatar?: string | null;
}


export interface TaskMember {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

async function fetchProfileMap(userIds: string[]) {
  const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (!userIds.length) return map;
  // Try direct profiles query first (works for self + tables the caller owns).
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", userIds);
  (data || []).forEach((p: any) => map.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }));
  // Fall back to the public RPC for user_ids not returned (RLS strips other users' rows).
  const missing = userIds.filter(id => !map.has(id));
  await Promise.all(missing.map(async (uid) => {
    const { data: rows } = await (supabase as any).rpc("get_member_public_stats", { _user_id: uid });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row) map.set(uid, { display_name: row.display_name ?? null, avatar_url: row.avatar_url ?? null });
  }));
  return map;
}

/** All members of a board (includes the owner as a virtual member). */
export function useBoardMembers(boardId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["board_members", boardId],
    queryFn: async () => {
      if (!boardId) return [] as BoardMember[];
      const { data: board } = await supabase.from("boards").select("user_id").eq("id", boardId).maybeSingle();
      const { data: rows, error } = await (supabase as any)
        .from("board_members")
        .select("*")
        .eq("board_id", boardId);
      if (error) throw error;

      const ids = new Set<string>((rows || []).map((r: any) => r.user_id));
      if (board?.user_id) ids.add(board.user_id);
      const profiles = await fetchProfileMap(Array.from(ids));

      const members: BoardMember[] = [];
      if (board?.user_id) {
        const p = profiles.get(board.user_id);
        members.push({
          id: `owner:${board.user_id}`,
          board_id: boardId,
          user_id: board.user_id,
          role: "owner",
          added_at: "",
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
        });
      }
      (rows || []).forEach((r: any) => {
        if (r.user_id === board?.user_id) return;
        const p = profiles.get(r.user_id);
        members.push({
          id: r.id,
          board_id: r.board_id,
          user_id: r.user_id,
          role: r.role,
          added_at: r.added_at,
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
        });
      });
      return members;
    },
    enabled: !!boardId,
  });

  useEffect(() => {
    if (!boardId) return;
    const ch = supabase
      .channel(`board-members-${boardId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "board_members", filter: `board_id=eq.${boardId}` }, () => {
        qc.invalidateQueries({ queryKey: ["board_members", boardId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [boardId, qc]);

  return query;
}

/** Map raw postgres exception messages to translated user-facing text. */
function inviteErrorKey(msg: string): string {
  const m = (msg || "").toLowerCase();
  if (m.includes("user not found")) return "kanban.invite_err_user_not_found";
  if (m.includes("already a member")) return "kanban.invite_err_already_member";
  if (m.includes("cannot invite yourself")) return "kanban.invite_err_self";
  if (m.includes("only owner")) return "kanban.invite_err_not_owner";
  if (m.includes("not authenticated")) return "kanban.invite_err_auth";
  return "kanban.invite_err_generic";
}

export function useInviteToBoard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ boardId, friendCode }: { boardId: string; friendCode: string }) => {
      const { data, error } = await (supabase as any).rpc("invite_to_board_by_code", {
        _board_id: boardId,
        _friend_code: friendCode.trim().toUpperCase(),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["board_invitations", v.boardId] });
      qc.invalidateQueries({ queryKey: ["board_outgoing_invitations", v.boardId] });
      toast({ title: t("kanban.invite_sent") });
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: t(inviteErrorKey(e?.message)), variant: "destructive" }),
  });
}


export function useRemoveBoardMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, boardId }: { memberId: string; boardId: string }) => {
      const { error } = await (supabase as any).from("board_members").delete().eq("id", memberId);
      if (error) throw error;
      return boardId;
    },
    onSuccess: (boardId) => qc.invalidateQueries({ queryKey: ["board_members", boardId] }),
  });
}

/** Invitations sent to the current user (across all boards). */
export function useMyBoardInvitations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["my_board_invitations", user?.id],
    queryFn: async () => {
      if (!user) return [] as BoardInvitation[];
      const { data, error } = await (supabase as any)
        .from("board_invitations")
        .select("*")
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const invs = (data || []) as any[];
      if (!invs.length) return [] as BoardInvitation[];

      const boardIds = Array.from(new Set(invs.map(i => i.board_id)));
      const inviterIds = Array.from(new Set(invs.map(i => i.inviter_id)));
      const [{ data: boards }, profiles] = await Promise.all([
        supabase.from("boards").select("id,title").in("id", boardIds),
        fetchProfileMap(inviterIds),
      ]);
      const bmap = new Map((boards || []).map((b: any) => [b.id, b.title]));
      return invs.map(i => ({
        ...i,
        board_title: bmap.get(i.board_id) || null,
        inviter_name: profiles.get(i.inviter_id)?.display_name || null,
      })) as BoardInvitation[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`board-invitations-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "board_invitations", filter: `invitee_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["my_board_invitations", user.id] });
        qc.invalidateQueries({ queryKey: ["boards"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return query;
}

export function useAcceptBoardInvitation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await (supabase as any).rpc("accept_board_invitation", { _invitation_id: invitationId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_board_invitations"] });
      qc.invalidateQueries({ queryKey: ["boards"] });
      toast({ title: "✅ Convite aceito" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useRejectBoardInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await (supabase as any)
        .from("board_invitations")
        .update({ status: "rejected" })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_board_invitations"] }),
  });
}

/** Pending invitations sent by the current user for a specific board. */
export function useBoardOutgoingInvitations(boardId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["board_outgoing_invitations", boardId, user?.id],
    queryFn: async () => {
      if (!boardId || !user) return [] as { id: string; invitee_id: string; status: string }[];
      const { data, error } = await (supabase as any)
        .from("board_invitations")
        .select("id, invitee_id, status")
        .eq("board_id", boardId)
        .eq("inviter_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
      return (data || []) as { id: string; invitee_id: string; status: string }[];
    },
    enabled: !!boardId && !!user,
  });

  useEffect(() => {
    if (!boardId) return;
    const ch = supabase
      .channel(`board-out-invites-${boardId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "board_invitations", filter: `board_id=eq.${boardId}` }, () => {
        qc.invalidateQueries({ queryKey: ["board_outgoing_invitations", boardId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [boardId, qc]);

  return query;
}

export function useCancelBoardInvitation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string; boardId: string }) => {
      const { error } = await (supabase as any)
        .from("board_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["board_outgoing_invitations", v.boardId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

/** Invite a friend directly by user_id via secure RPC (no profiles read, RLS-safe). */
export function useInviteFriendToBoard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async ({ boardId, userId }: { boardId: string; userId: string }) => {
      const { data, error } = await (supabase as any).rpc("invite_to_board_by_user", {
        _board_id: boardId,
        _user_id: userId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["board_outgoing_invitations", v.boardId] });
      qc.invalidateQueries({ queryKey: ["board_members", v.boardId] });
      toast({ title: t("kanban.invite_sent") });
    },
    onError: (e: any) =>
      toast({ title: t("common.error"), description: t(inviteErrorKey(e?.message)), variant: "destructive" }),
  });

}

/** Members of a specific task, with profile info. */
export function useTaskMembers(taskId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["task_members", taskId],
    queryFn: async () => {
      if (!taskId) return [] as TaskMember[];
      const { data, error } = await (supabase as any)
        .from("task_members")
        .select("*")
        .eq("task_id", taskId);
      if (error) throw error;
      const rows = (data || []) as any[];
      if (!rows.length) return [] as TaskMember[];
      const profiles = await fetchProfileMap(rows.map(r => r.user_id));
      return rows.map(r => ({
        ...r,
        display_name: profiles.get(r.user_id)?.display_name || null,
        avatar_url: profiles.get(r.user_id)?.avatar_url || null,
      })) as TaskMember[];
    },
    enabled: !!taskId,
  });

  useEffect(() => {
    if (!taskId) return;
    const ch = supabase
      .channel(`task-members-${taskId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "task_members", filter: `task_id=eq.${taskId}` }, () => {
        qc.invalidateQueries({ queryKey: ["task_members", taskId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [taskId, qc]);

  return query;
}

/** Bulk fetch task_members for all tasks in a board (for card avatars). */
export function useBoardTaskMembers(boardId: string | undefined) {
  return useQuery({
    queryKey: ["board_task_members", boardId],
    queryFn: async () => {
      if (!boardId) return new Map<string, TaskMember[]>();
      const { data: tasks } = await supabase.from("tasks").select("id").eq("board_id", boardId);
      const taskIds = (tasks || []).map((t: any) => t.id);
      if (!taskIds.length) return new Map<string, TaskMember[]>();
      const { data: rows } = await (supabase as any)
        .from("task_members")
        .select("*")
        .in("task_id", taskIds);
      const list = (rows || []) as any[];
      const uids = Array.from(new Set(list.map(r => r.user_id)));
      const profiles = await fetchProfileMap(uids);
      const map = new Map<string, TaskMember[]>();
      list.forEach(r => {
        const arr = map.get(r.task_id) || [];
        arr.push({
          ...r,
          display_name: profiles.get(r.user_id)?.display_name || null,
          avatar_url: profiles.get(r.user_id)?.avatar_url || null,
        });
        map.set(r.task_id, arr);
      });
      return map;
    },
    enabled: !!boardId,
  });
}

export function useAssignTaskMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from("task_members")
        .insert({ task_id: taskId, user_id: userId, assigned_by: user?.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["task_members", v.taskId] });
      qc.invalidateQueries({ queryKey: ["board_task_members"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
}

export function useUnassignTaskMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, memberId }: { taskId: string; memberId: string }) => {
      const { error } = await (supabase as any).from("task_members").delete().eq("id", memberId);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ["task_members", taskId] });
      qc.invalidateQueries({ queryKey: ["board_task_members"] });
    },
  });
}

/** Live time_entries (end_time IS NULL) that reference tasks of a board -> map<task_id, user_id[]>. */
export function useActiveTaskWorkers(boardId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["active_task_workers", boardId],
    queryFn: async () => {
      if (!boardId) return { byTask: new Map<string, string[]>(), profiles: new Map<string, { display_name: string | null; avatar_url: string | null }>() };
      const { data: tasks } = await supabase.from("tasks").select("id").eq("board_id", boardId);
      const taskIds = (tasks || []).map((t: any) => t.id);
      if (!taskIds.length) return { byTask: new Map<string, string[]>(), profiles: new Map() };
      const { data: entries } = await supabase
        .from("time_entries")
        .select("task_id, user_id")
        .in("task_id", taskIds)
        .is("end_time", null);
      const byTask = new Map<string, string[]>();
      const uids = new Set<string>();
      (entries || []).forEach((e: any) => {
        if (!e.task_id) return;
        const arr = byTask.get(e.task_id) || [];
        arr.push(e.user_id);
        byTask.set(e.task_id, arr);
        uids.add(e.user_id);
      });
      const profiles = await fetchProfileMap(Array.from(uids));
      return { byTask, profiles };
    },
    enabled: !!boardId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!boardId) return;
    const ch = supabase
      .channel(`active-workers-${boardId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "time_entries" }, () => {
        qc.invalidateQueries({ queryKey: ["active_task_workers", boardId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [boardId, qc]);

  return query;
}
