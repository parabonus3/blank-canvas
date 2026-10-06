import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, Check, Clock3, Pencil, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useCancelRoomSession,
  useCreateRoomSession,
  usePastRoomSessions,
  useRoomSessions,
  useRoomTimezone,
  useSetRoomSessionAttendance,
  useUpdateRoomSession,
  type RoomSession,
} from "@/hooks/useRoomSessions";
import { cn } from "@/lib/utils";

type MemberLite = { user_id: string; display_name?: string | null; avatar_url?: string | null };

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function RoomSessionsCard({ roomId, canManage, members = [] }: { roomId: string; canManage: boolean; members?: MemberLite[] }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const { data, isLoading, isError } = useRoomSessions(roomId);
  const past = usePastRoomSessions(roomId, view === "past");
  const { data: roomTimezone } = useRoomTimezone(roomId);
  const create = useCreateRoomSession();
  const update = useUpdateRoomSession();
  const cancel = useCancelRoomSession();
  const attendance = useSetRoomSessionAttendance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoomSession | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const sessions = data?.sessions || [];
  const attendees = data?.attendees || [];
  const memberMap = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);

  const formatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: roomTimezone,
  }), [i18n.language, roomTimezone]);

  const openForm = (session?: RoomSession) => {
    setEditing(session || null);
    setTitle(session?.title || "");
    setDescription(session?.description || "");
    setStartAt(localInputValue(session ? new Date(session.start_at) : new Date(Date.now() + 60 * 60 * 1000)));
    setEndAt(localInputValue(session ? new Date(session.end_at) : new Date(Date.now() + 2 * 60 * 60 * 1000)));
    setOpen(true);
  };

  const save = async () => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!title.trim() || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      toast({ title: t("room_sessions.validation"), variant: "destructive" });
      return;
    }
    const payload = { roomId, title: title.trim(), description, startAt: start.toISOString(), endAt: end.toISOString() };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await create.mutateAsync(payload);
      setOpen(false);
      toast({ title: t(editing ? "room_sessions.updated" : "room_sessions.created") });
    } catch {
      toast({ title: t("room_sessions.save_error"), variant: "destructive" });
    }
  };

  const list = view === "upcoming" ? sessions : past.data || [];
  const loading = view === "upcoming" ? isLoading : past.isLoading;
  const failed = view === "upcoming" ? isError : past.isError;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-4 pb-3 sm:p-5 sm:pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base"><CalendarClock className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{t("room_sessions.title")}</span></CardTitle>
        {canManage && <Button size="sm" variant="outline" onClick={() => openForm()}><Plus className="h-4 w-4" />{t("room_sessions.new")}</Button>}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
          {(["upcoming", "past"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded px-2 py-1.5 text-xs font-medium transition-colors", view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
              {t(`room_sessions.tab_${v}`)}
            </button>
          ))}
        </div>
        {loading ? <><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></> : failed ? (
          <p className="text-sm text-destructive">{t("room_sessions.load_error")}</p>
        ) : list.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t(view === "upcoming" ? "room_sessions.empty" : "room_sessions.empty_past")}</p>
        ) : list.map((session) => {
          const now = Date.now();
          const start = new Date(session.start_at).getTime();
          const end = new Date(session.end_at).getTime();
          const going = attendees.filter((item) => item.session_id === session.id);
          const joined = going.some((item) => item.user_id === user?.id);
          const live = !session.is_cancelled && start <= now && end > now;
          const soon = !session.is_cancelled && start > now && start - now <= 30 * 60_000;
          const status = session.is_cancelled ? "cancelled" : live ? "live" : end <= now ? "ended" : "scheduled";
          return (
            <div key={session.id} className={cn("space-y-3 rounded-md border p-3", live && "border-success/50 bg-success/5", session.is_cancelled && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{session.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5 shrink-0" />{formatter.format(new Date(session.start_at))}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", live ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground")}>{t(`room_sessions.status_${status}`)}</span>
                  {canManage && status === "scheduled" && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("room_sessions.edit")} onClick={() => openForm(session)}><Pencil className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>
              {session.description && <p className="text-xs text-muted-foreground">{session.description}</p>}
              {view === "upcoming" && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {going.slice(0, 5).map((a) => {
                      const m = memberMap.get(a.user_id);
                      return (
                        <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                          {m?.avatar_url && <AvatarImage src={m.avatar_url} />}
                          <AvatarFallback className="text-[10px]">{(m?.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{t("room_sessions.attendees", { count: going.length })}</span>
                </div>
              )}
              {view === "upcoming" && !session.is_cancelled && end > now && (
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant={joined ? "outline" : "default"} onClick={() => attendance.mutate({ sessionId: session.id, roomId, confirmed: !joined })} disabled={attendance.isPending}>
                    {joined ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}{t(joined ? "room_sessions.leave" : "room_sessions.join")}
                  </Button>
                  {(live || soon) ? (
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/timer?room=${roomId}`)}>{t("room_sessions.open_timer")}</Button>
                  ) : canManage ? (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancel.mutate({ id: session.id, roomId })}>{t("room_sessions.cancel")}</Button>
                  ) : <div />}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>{t(editing ? "room_sessions.edit_title" : "room_sessions.create_title")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="room-session-title">{t("room_sessions.name")}</Label><Input id="room-session-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></div>
            <div className="space-y-1.5"><Label htmlFor="room-session-description">{t("room_sessions.description")}</Label><Textarea id="room-session-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="room-session-start">{t("room_sessions.start")}</Label><Input id="room-session-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="room-session-end">{t("room_sessions.end")}</Label><Input id="room-session-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={save} disabled={create.isPending || update.isPending}>{t("common.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
