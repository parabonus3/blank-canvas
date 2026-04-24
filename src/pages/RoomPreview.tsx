import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Wifi, BookOpen, Clock, Target, Timer, GraduationCap, Briefcase, Sparkles, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { JoinPasswordDialog } from "@/components/rooms/JoinPasswordDialog";

const typeIcons: Record<string, any> = {
  study: GraduationCap,
  reading: BookOpen,
  work: Briefcase,
  custom: Sparkles,
};

function formatHours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface PreviewData {
  room_id: string;
  name: string;
  description: string | null;
  room_type: string;
  member_count: number;
  online_count: number;
  studying_count: number;
  total_seconds: number;
  goal_hours: number | null;
  goal_label: string | null;
  focus_session_end_at: string | null;
  focus_session_duration: number | null;
  top_members: { display_name: string; total_seconds: number }[];
}

export default function RoomPreview() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const refUserId = searchParams.get("ref");

  // Fetch referrer name
  const [refName, setRefName] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    supabase.rpc("get_room_public_preview", { _invite_code: code }).then(({ data: rows }) => {
      if (rows && rows.length > 0) {
        const row = rows[0] as any;
        setData({
          ...row,
          top_members: typeof row.top_members === "string" ? JSON.parse(row.top_members) : row.top_members || [],
        });
      }
      setLoading(false);
    });
  }, [code]);

  useEffect(() => {
    if (!refUserId) return;
    supabase.rpc("get_member_public_stats", { _user_id: refUserId }).then(({ data: rows }) => {
      if (rows && rows.length > 0) setRefName(rows[0].display_name);
    });
  }, [refUserId]);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const handleJoin = async () => {
    if (!code) return;
    if (!user) {
      navigate(`/auth?redirect=/rooms?join=${code}`);
      return;
    }
    // Check if room has password
    if (data?.room_id) {
      try {
        const { data: hasPassword } = await supabase.rpc("room_has_password", { _room_id: data.room_id });
        if (hasPassword) {
          setPasswordDialogOpen(true);
          return;
        }
      } catch {}
    }
    doJoin();
  };

  const doJoin = async (password?: string) => {
    if (!code) return;
    setJoining(true);
    try {
      const { data: roomId } = await supabase.rpc("join_room_by_invite_code", {
        _code: code,
        _password: password || null,
      });
      if (roomId) navigate(`/rooms/${roomId}`);
      else navigate(`/rooms?join=${code}`);
    } catch (e: any) {
      if (e?.message?.includes("Invalid password")) throw e;
      navigate(`/rooms?join=${code}`);
    }
  };

  // Focus session countdown
  const [focusRemaining, setFocusRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!data?.focus_session_end_at) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(data.focus_session_end_at!).getTime() - Date.now()) / 1000));
      setFocusRemaining(diff > 0 ? diff : null);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [data?.focus_session_end_at]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">{t("rooms.room_not_found")}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          {t("rooms.back_to_rooms")}
        </Button>
      </div>
    );
  }

  const Icon = typeIcons[data.room_type] || Sparkles;
  const goalPercent = data.goal_hours ? Math.min(100, ((data.total_seconds / 3600) / data.goal_hours) * 100) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 max-w-2xl mx-auto w-full">
        <img src={logo} alt="TimeZoni" className="h-8 w-8" onClick={() => navigate("/")} />
        <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
          {t("landing.cta_login")}
        </Button>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Referrer */}
          {refName && (
            <div className="text-center text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{refName}</span>{" "}
              {t("rooms.invited_you")}
            </div>
          )}

          {/* Room Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-lg">
            {/* Name */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{data.name}</h1>
                {data.description && (
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold">{data.member_count}</p>
                  <p className="text-xs text-muted-foreground">{t("rooms.members")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Wifi className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{data.online_count}</p>
                  <p className="text-xs text-muted-foreground">{t("rooms.online_now")}</p>
                </div>
              </div>
              {/* Studying now - highlighted */}
              <div className={cn(
                "flex items-center gap-2 rounded-lg p-3",
                data.studying_count > 0
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-muted/50"
              )}>
                <BookOpen className={cn("h-4 w-4", data.studying_count > 0 ? "text-green-600 animate-pulse" : "text-blue-500")} />
                <div>
                  <p className={cn("text-lg font-bold", data.studying_count > 0 && "text-green-600")}>
                    {data.studying_count}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("rooms.studying_now")}</p>
                </div>
                {data.studying_count > 0 && (
                  <div className="ml-auto relative flex items-center">
                    <span className="absolute inline-flex h-2 w-2 rounded-full bg-green-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-lg font-bold">{formatHours(data.total_seconds)}</p>
                  <p className="text-xs text-muted-foreground">{t("rooms.total_hours")}</p>
                </div>
              </div>
            </div>

            {/* Focus session active */}
            {focusRemaining !== null && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
                <Timer className="h-5 w-5 text-primary animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-primary">{t("rooms.focus_active")}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(focusRemaining / 60)}:{String(focusRemaining % 60).padStart(2, "0")} {t("rooms.remaining")}
                  </p>
                </div>
              </div>
            )}

            {/* Goal progress */}
            {goalPercent !== null && data.goal_hours && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">{data.goal_label || t("rooms.collective_goal")}</span>
                </div>
                <Progress value={goalPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {(data.total_seconds / 3600).toFixed(1)}h {t("rooms.of")} {data.goal_hours}h ({goalPercent.toFixed(0)}%)
                </p>
              </div>
            )}

            {/* Top members */}
            {data.top_members.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">{t("rooms.top_members")}</h3>
                <div className="space-y-1.5">
                  {data.top_members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-primary w-5">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </span>
                      <span className="flex-1 truncate">{m.display_name || t("rooms.anonymous")}</span>
                      <span className="text-muted-foreground">{formatHours(m.total_seconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full text-base h-12"
              onClick={handleJoin}
              disabled={joining}
            >
              {focusRemaining !== null
                ? `🔴 ${t("rooms.join_focus_session")}`
                : data.studying_count > 0
                  ? `🟢 ${t("rooms.join_and_study_together")}`
                  : t("rooms.join_and_start")}
            </Button>
            {data.studying_count > 0 && (
              <p className="text-center text-xs text-green-600 font-medium animate-pulse">
                {t("rooms.live_studying_count", { count: data.studying_count })}
              </p>
            )}
          </div>
        </div>
      </main>

      <JoinPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        roomName={data.name}
        onSubmit={async (password) => { await doJoin(password); }}
        isPending={joining}
      />
    </div>
  );
}
