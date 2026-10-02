import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarClock, Check, Clock3, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCancelRoomSession, useCreateRoomSession, useRoomSessions, useSetRoomSessionAttendance } from "@/hooks/useRoomSessions";
import { cn } from "@/lib/utils";

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function RoomSessionsCard({ roomId, roomTimezone, canManage }: { roomId: string; roomTimezone?: string; canManage: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useRoomSessions(roomId);
  const create = useCreateRoomSession();
  const cancel = useCancelRoomSession();
  const attendance = useSetRoomSessionAttendance();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(() => localInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(() => localInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const sessions = data?.sessions || [];
  const attendees = data?.attendees || [];

  const formatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: roomTimezone,
  }), [i18n.language, roomTimezone]);

  const save = async () => {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!title.trim() || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      toast({ title: t("room_sessions.validation"), variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({ roomId, title: title.trim(), description, startAt: start.toISOString(), endAt: end.toISOString() });
      setTitle(""); setDescription(""); setOpen(false);
      toast({ title: t("room_sessions.created") });
    } catch {
      toast({ title: t("room_sessions.save_error"), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-3 sm:p-5 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-primary" />{t("room_sessions.title")}</CardTitle>
        {canManage && <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="me-1 h-4 w-4" />{t("room_sessions.new")}</Button>}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
        {isLoading ? <><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></> : isError ? (
          <p className="text-sm text-destructive">{t("room_sessions.load_error")}</p>
        ) : sessions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("room_sessions.empty")}</p>
        ) : sessions.map((session) => {
          const now = Date.now();
          const start = new Date(session.start_at).getTime();
          const end = new Date(session.end_at).getTime();
          const joined = attendees.some((item) => item.session_id === session.id && item.user_id === user?.id);
          const count = attendees.filter((item) => item.session_id === session.id).length;
          const live = !session.is_cancelled && start <= now && end > now;
          const soon = !session.is_cancelled && start > now && start - now <= 30 * 60_000;
          return (
            <div key={session.id} className={cn("space-y-3 rounded-md border p-3", live && "border-success/50 bg-success/5", session.is_cancelled && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{session.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{formatter.format(new Date(session.start_at))}</p></div>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", live ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground")}>{t(`room_sessions.status_${session.is_cancelled ? "cancelled" : live ? "live" : end <= now ? "ended" : "scheduled"}`)}</span>
              </div>
              {session.description && <p className="text-xs text-muted-foreground">{session.description}</p>}
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{t("room_sessions.attendees", { count })}</div>
              {!session.is_cancelled && end > now && <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant={joined ? "outline" : "default"} onClick={() => attendance.mutate({ sessionId: session.id, roomId, confirmed: !joined })} disabled={attendance.isPending}>{joined ? <X className="me-1 h-3.5 w-3.5" /> : <Check className="me-1 h-3.5 w-3.5" />}{t(joined ? "room_sessions.leave" : "room_sessions.join")}</Button>
                {(live || soon) ? <Button size="sm" variant="secondary" onClick={() => navigate(`/timer?room=${roomId}`)}>{t("room_sessions.open_timer")}</Button> : canManage ? <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancel.mutate({ id: session.id, roomId })}>{t("room_sessions.cancel")}</Button> : <div />}
              </div>}
            </div>
          );
        })}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader><DialogTitle>{t("room_sessions.create_title")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="room-session-title">{t("room_sessions.name")}</Label><Input id="room-session-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} /></div>
            <div className="space-y-1.5"><Label htmlFor="room-session-description">{t("room_sessions.description")}</Label><Textarea id="room-session-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="room-session-start">{t("room_sessions.start")}</Label><Input id="room-session-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="room-session-end">{t("room_sessions.end")}</Label><Input id="room-session-end" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></div></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={create.isPending}>{t("common.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}