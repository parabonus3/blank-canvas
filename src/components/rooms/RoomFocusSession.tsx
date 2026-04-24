import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Square, Timer, Users, UserPlus, UserMinus, Clock, CheckCircle, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { playFocusStart, playSuccess } from "@/lib/soundEffects";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

interface RoomMemberLike {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  focus_session_joined?: boolean;
}

interface Props {
  roomId: string;
  focusSessionEndAt?: string | null;
  focusSessionDuration?: number | null;
  focusSessionStartedBy?: string | null;
  focusSessionStartAt?: string | null;
  memberProfiles?: Map<string, { display_name?: string; avatar_url?: string }>;
  isChalkboard?: boolean;
  members?: RoomMemberLike[];
}

export function RoomFocusSession({
  roomId,
  focusSessionEndAt,
  focusSessionDuration,
  focusSessionStartedBy,
  focusSessionStartAt,
  memberProfiles,
  isChalkboard = false,
  members = [],
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [remaining, setRemaining] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [starting, setStarting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const isActive = focusSessionEndAt && new Date(focusSessionEndAt) > new Date();
  const isCountdown = focusSessionStartAt && new Date(focusSessionStartAt) > new Date() && !isActive;

  // Active session countdown
  useEffect(() => {
    if (!isActive || !focusSessionEndAt) {
      setRemaining(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(focusSessionEndAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [focusSessionEndAt, isActive]);

  // Pre-session countdown
  useEffect(() => {
    if (!isCountdown || !focusSessionStartAt) {
      setCountdownRemaining(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(focusSessionStartAt).getTime() - Date.now()) / 1000));
      setCountdownRemaining(diff);
      // When countdown reaches zero, auto-start the session
      if (diff <= 0) {
        autoStartSession();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [focusSessionStartAt, isCountdown]);

  const autoStartSession = useCallback(async () => {
    if (!user || !focusSessionDuration) return;
    const endAt = new Date(Date.now() + focusSessionDuration * 60 * 1000).toISOString();
    await supabase
      .from("study_rooms")
      .update({
        focus_session_end_at: endAt,
        focus_session_start_at: null,
      } as any)
      .eq("id", roomId);
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  }, [user, roomId, focusSessionDuration, queryClient]);

  // Celebration when session ends
  useEffect(() => {
    if (focusSessionEndAt && remaining === 0 && focusSessionDuration && focusSessionDuration > 0) {
      const endTime = new Date(focusSessionEndAt);
      const now = new Date();
      if (Math.abs(now.getTime() - endTime.getTime()) < 5000 && user) {
        // Trigger celebration
        setShowCelebration(true);
        playSuccess();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => setShowCelebration(false), 5000);

        supabase.from("room_activity_log").insert({
          room_id: roomId,
          user_id: user.id,
          action_type: "focus_ended",
          metadata: { duration: focusSessionDuration },
        }).then();
      }
    }
  }, [remaining, focusSessionEndAt, focusSessionDuration]);

  const startSession = useCallback(async (minutes: number, delayMinutes?: number) => {
    if (!user) return;
    setStarting(true);
    try {
      if (delayMinutes && delayMinutes > 0) {
        // Schedule session with countdown
        const startAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
        const { error } = await supabase
          .from("study_rooms")
          .update({
            focus_session_start_at: startAt,
            focus_session_duration: minutes,
            focus_session_started_by: user.id,
            focus_session_end_at: null,
          } as any)
          .eq("id", roomId);
        if (error) throw error;

        await supabase.from("room_activity_log").insert({
          room_id: roomId,
          user_id: user.id,
          action_type: "focus_scheduled",
          metadata: { duration: minutes, delay: delayMinutes },
        });

        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        toast({ title: t("rooms.focus_scheduled_toast", { minutes: delayMinutes }) });
      } else {
        // Start immediately
        playFocusStart();
        const endAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
        const { error } = await supabase
          .from("study_rooms")
          .update({
            focus_session_end_at: endAt,
            focus_session_duration: minutes,
            focus_session_started_by: user.id,
            focus_session_start_at: null,
          } as any)
          .eq("id", roomId);
        if (error) throw error;

        await supabase.from("room_activity_log").insert({
          room_id: roomId,
          user_id: user.id,
          action_type: "focus_started",
          metadata: { duration: minutes },
        });

        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        toast({ title: t("rooms.focus_started_toast", { minutes }) });
      }
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  }, [user, roomId, queryClient, t, toast]);

  const stopSession = useCallback(async () => {
    const { error } = await supabase
      .from("study_rooms")
      .update({
        focus_session_end_at: null,
        focus_session_duration: null,
        focus_session_started_by: null,
        focus_session_start_at: null,
      } as any)
      .eq("id", roomId);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    }
  }, [roomId, queryClient]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const cdMinutes = Math.floor(countdownRemaining / 60);
  const cdSeconds = countdownRemaining % 60;
  const totalDurationSec = (focusSessionDuration || 1) * 60;
  const progress = isActive ? ((totalDurationSec - remaining) / totalDurationSec) * 100 : 0;
  const starterName = focusSessionStartedBy ? memberProfiles?.get(focusSessionStartedBy)?.display_name : null;
  const participants = members.filter(m => (m as any).focus_session_joined);
  const iJoined = participants.some(p => p.user_id === user?.id);
  const id = roomId;

  const toggleJoinSession = useCallback(async () => {
    if (!user || !id) return;
    const newVal = !iJoined;
    const { error } = await supabase.from("room_members")
      .update({ focus_session_joined: newVal })
      .eq("room_id", roomId)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      return;
    }
    // Log activity
    await supabase.from("room_activity_log").insert({
      room_id: roomId,
      user_id: user.id,
      action_type: newVal ? "focus_joined" : "focus_left",
    });
    queryClient.invalidateQueries({ queryKey: ["roomMembers", roomId] });
    toast({
      title: newVal ? t("rooms.focus_joined_toast") : t("rooms.focus_left_toast"),
    });
  }, [user, roomId, iJoined, queryClient, t, toast]);

  // Reset focus_session_joined when session ends
  useEffect(() => {
    if (!isActive && !isCountdown && iJoined && user) {
      supabase.from("room_members")
        .update({ focus_session_joined: false })
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .then();
    }
  }, [isActive, isCountdown]);

  const renderParticipants = () => {
    if (!isActive && !isCountdown) return null;
    return (
      <div className="space-y-2">
        {participants.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              {t("rooms.focus_participants")} ({participants.length})
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {participants.map(p => (
            <div key={p.user_id} className="flex items-center gap-1 bg-primary/10 rounded-full px-2 py-0.5">
              <span className="text-[10px] font-medium">{p.display_name || "?"}</span>
            </div>
          ))}
        </div>
        {!iJoined ? (
          <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={toggleJoinSession}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            {t("rooms.join_session")}
          </Button>
        ) : (
          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={toggleJoinSession}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            {t("rooms.leave_session")}
          </Button>
        )}
      </div>
    );
  };
  // === CELEBRATION BANNER ===
  const celebrationBanner = (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "rounded-xl p-4 text-center space-y-1",
            isChalkboard ? "bg-green-500/20" : "bg-green-500/10 border border-green-500/30"
          )}
        >
          <PartyPopper className={cn("h-6 w-6 mx-auto", isChalkboard ? "text-yellow-300" : "text-green-600")} />
          <p className={cn("font-bold text-sm", isChalkboard ? "text-yellow-300" : "text-green-600")}>
            {t("rooms.focus_completed_celebration")}
          </p>
          <p className={cn("text-xs", isChalkboard ? "chalk-text opacity-70" : "text-muted-foreground")}>
            +{focusSessionDuration}min • {participants.length} {t("rooms.focus_participants").toLowerCase()}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // === COUNTDOWN STATE (pre-session) ===
  if (isCountdown) {
    const countdownContent = (
      <>
        <div className="flex items-center gap-2">
          <Clock className={cn("h-5 w-5 animate-pulse", isChalkboard ? "opacity-90" : "text-primary")} />
          <span className={cn("font-semibold text-sm", isChalkboard ? "chalk-text" : "text-primary")}>
            {t("rooms.focus_starting_soon")}
          </span>
        </div>
        <div className="text-center">
          <div className={cn("text-4xl font-mono font-bold tabular-nums", isChalkboard ? "chalk-text" : "text-primary")}>
            {String(cdMinutes).padStart(2, "0")}:{String(cdSeconds).padStart(2, "0")}
          </div>
          <p className={cn("text-xs mt-1", isChalkboard ? "chalk-text opacity-50" : "text-muted-foreground")}>
            {t("rooms.focus_countdown_desc", { minutes: focusSessionDuration })}
          </p>
        </div>
        {starterName && (
          <span className={cn("text-xs flex items-center gap-1", isChalkboard ? "chalk-text opacity-60" : "text-muted-foreground")}>
            <Users className="h-3 w-3" />
            {t("rooms.focus_started_by", { name: starterName })}
          </span>
        )}
        {focusSessionStartedBy === user?.id && (
          <Button variant="outline" size="sm" className="w-full" onClick={stopSession}>
            <Square className="h-3.5 w-3.5 mr-1.5" />
            {t("rooms.focus_cancel")}
          </Button>
        )}
        {renderParticipants()}
      </>
    );

    if (isChalkboard) {
      return <div className="space-y-3">{countdownContent}</div>;
    }
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4 animate-pulse">
        {countdownContent}
      </div>
    );
  }

  // === ACTIVE SESSION ===
  if (isActive && isChalkboard) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between chalk-text">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 animate-pulse opacity-90" />
            <span className="font-semibold text-sm">{t("rooms.focus_active")}</span>
          </div>
          {starterName && (
            <span className="text-xs opacity-60 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t("rooms.focus_started_by", { name: starterName })}
            </span>
          )}
        </div>
        <div className="text-center">
          <div className="text-5xl font-mono font-bold chalk-text tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <p className="text-xs chalk-text opacity-50 mt-1">
            {t("rooms.focus_duration_label", { minutes: focusSessionDuration })}
          </p>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-300/60 transition-all duration-1000 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        {focusSessionStartedBy === user?.id && (
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-white/90 text-gray-900 border-white/20 hover:bg-white font-medium"
            onClick={stopSession}
          >
            <Square className="h-3.5 w-3.5 mr-1.5" />
            {t("rooms.focus_stop")}
          </Button>
        )}
        {renderParticipants()}
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary animate-pulse" />
            <h3 className="font-semibold text-primary">{t("rooms.focus_active")}</h3>
          </div>
          {starterName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {t("rooms.focus_started_by", { name: starterName })}
            </span>
          )}
        </div>
        <div className="text-center">
          <div className="text-5xl font-mono font-bold text-primary tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("rooms.focus_duration_label", { minutes: focusSessionDuration })}
          </p>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        {focusSessionStartedBy === user?.id && (
          <Button variant="outline" size="sm" className="w-full border-foreground/20 text-foreground" onClick={stopSession}>
            <Square className="h-3.5 w-3.5 mr-1.5" />
            {t("rooms.focus_stop")}
          </Button>
        )}
        {renderParticipants()}
      </div>
    );
  }

  // === START SESSION UI ===
  const sessionButtons = (chalkStyle = false) => (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2", chalkStyle ? "chalk-text opacity-70" : "")}>
        <Timer className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{t("rooms.focus_session")}</span>
      </div>
      <p className={cn("text-xs", chalkStyle ? "chalk-text opacity-50" : "text-muted-foreground")}>
        {t("rooms.focus_desc")}
      </p>
      
      {/* Instant start */}
      <div className="flex gap-2 flex-wrap">
        {[25, 45, 60].map((min) => (
          <Button
            key={min}
            variant="outline"
            size="sm"
            disabled={starting}
            onClick={() => startSession(min)}
            className={cn(
              "flex-1 focus-start-glow",
              chalkStyle && "min-w-fit px-4 border-white/30 bg-white/10 text-white font-semibold hover:bg-white/20"
            )}
          >
            <Play className="h-3 w-3 mr-1" />
            {min} min
          </Button>
        ))}
      </div>

      {/* Scheduled start with countdown */}
      <div className="border-t border-border/50 pt-2">
        <p className={cn("text-[10px] uppercase tracking-wider font-semibold mb-2", chalkStyle ? "chalk-text opacity-50" : "text-muted-foreground")}>
          {t("rooms.focus_schedule")}
        </p>
        <div className="flex gap-2 flex-wrap">
          {[{ delay: 1, dur: 25 }, { delay: 2, dur: 25 }, { delay: 5, dur: 45 }].map(({ delay, dur }) => (
            <Button
              key={`${delay}-${dur}`}
              variant="ghost"
              size="sm"
              disabled={starting}
              onClick={() => startSession(dur, delay)}
              className={cn("text-xs", chalkStyle && "text-white/70 hover:bg-white/10")}
            >
              <Clock className="h-3 w-3 mr-1" />
              {t("rooms.focus_in_minutes", { delay, duration: dur })}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isChalkboard) {
    return <>{celebrationBanner}{sessionButtons(true)}</>;
  }

  return (
    <div className="space-y-3">
      {celebrationBanner}
      <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4">
        {sessionButtons(false)}
      </div>
    </div>
  );
}
