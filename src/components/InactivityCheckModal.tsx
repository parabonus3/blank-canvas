import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const INACTIVITY_STATE_KEY = "timezoni-inactivity-state";
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const COUNTDOWN_DURATION = 300; // 5 minutes

interface InactivityState {
  startTime: number;        // timer start (ms)
  lastConfirmedAt: number;  // last presence confirmation (ms)
}

function loadState(): InactivityState | null {
  try {
    const raw = localStorage.getItem(INACTIVITY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InactivityState;
    if (!parsed.startTime || !parsed.lastConfirmedAt) return null;
    return parsed;
  } catch { return null; }
}

function saveState(state: InactivityState) {
  try { localStorage.setItem(INACTIVITY_STATE_KEY, JSON.stringify(state)); } catch {}
}

interface Props {
  elapsed: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null; // ms - timer start time, null when not running
  entryId?: string | null;  // active time_entry id, used to credit a confirmed presence interval
  onPause: () => void;
  onResume: () => void;
  onAdjustPaused: (extraSeconds: number) => void;
}

/** Clear the inactivity check so a fresh session starts from 0 */
export function resetInactivityCheck() {
  try { localStorage.removeItem(INACTIVITY_STATE_KEY); } catch {}
}

/** Initialize inactivity tracking when timer starts */
export function initInactivityCheck(startTime: number) {
  saveState({ startTime, lastConfirmedAt: startTime });
}

export function InactivityCheckModal({ isRunning, isPaused, startTime, entryId, onPause, onResume, onAdjustPaused }: Props) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const scheduledTimeoutRef = useRef<number | null>(null);
  const adjustedShownRef = useRef(false);

  // Ensure state is initialized when timer is running
  useEffect(() => {
    if (!isRunning || !startTime) return;
    const existing = loadState();
    if (!existing || existing.startTime !== startTime) {
      saveState({ startTime, lastConfirmedAt: startTime });
    }
  }, [isRunning, startTime]);

  // Trigger logic — checks gap and pauses if needed
  const checkInactivity = () => {
    if (!isRunning || isPaused || showModal) return;
    const state = loadState();
    if (!state) return;

    const gap = Date.now() - state.lastConfirmedAt;
    if (gap < CHECK_INTERVAL_MS) return;

    // Subtract "ghost time" beyond the 2h tolerance
    const ghostMs = gap - CHECK_INTERVAL_MS;
    if (ghostMs > 0) {
      const ghostSec = Math.floor(ghostMs / 1000);
      onAdjustPaused(ghostSec);
      if (!adjustedShownRef.current) {
        adjustedShownRef.current = true;
        const hours = (ghostMs / 3600000).toFixed(1);
        toast.warning(t("timer.inactivity_adjusted", { hours }));
      }
    }

    onPause();
    setShowModal(true);
    setCountdown(COUNTDOWN_DURATION);
  };

  // Schedule a setTimeout for when 2h gap will occur (resilient to throttling)
  useEffect(() => {
    if (!isRunning || isPaused || showModal) {
      if (scheduledTimeoutRef.current) {
        clearTimeout(scheduledTimeoutRef.current);
        scheduledTimeoutRef.current = null;
      }
      return;
    }

    const state = loadState();
    if (!state) return;

    const remaining = state.lastConfirmedAt + CHECK_INTERVAL_MS - Date.now();
    if (remaining <= 0) {
      checkInactivity();
      return;
    }

    scheduledTimeoutRef.current = window.setTimeout(() => {
      checkInactivity();
      // Background notification
      if (typeof document !== "undefined" && document.hidden && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(t("timer.inactivity_title"), {
            body: t("timer.inactivity_desc"),
            icon: "/favicon.ico",
          });
        } catch {}
      }
    }, remaining + 100);

    // Fallback: setInterval curto resiste melhor a throttling do browser quando a aba volta ao foreground.
    // Garante que mesmo se o setTimeout for suspenso por horas em background, ao retornar a aba o check dispara em < 30s.
    const intervalId = window.setInterval(() => {
      checkInactivity();
    }, 30000);

    return () => {
      if (scheduledTimeoutRef.current) {
        clearTimeout(scheduledTimeoutRef.current);
        scheduledTimeoutRef.current = null;
      }
      clearInterval(intervalId);
    };
  }, [isRunning, isPaused, showModal, startTime]);

  // Visibility change — when tab returns to foreground, check immediately
  useEffect(() => {
    if (!isRunning) return;
    const handler = () => {
      if (!document.hidden) checkInactivity();
    };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler);
    };
  }, [isRunning, isPaused, showModal]);

  // Reset adjusted flag whenever user starts fresh
  useEffect(() => {
    if (!isRunning) adjustedShownRef.current = false;
  }, [isRunning]);

  // Countdown UI (timer already paused)
  useEffect(() => {
    if (!showModal) return;
    if (countdown <= 0) { setShowModal(false); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showModal, countdown]);

  const handleConfirm = async () => {
    const state = loadState();
    const startT = state?.startTime ?? Date.now();
    saveState({ startTime: startT, lastConfirmedAt: Date.now() });
    // Server-side: credit a confirmed presence interval to the active entry,
    // which raises the dynamic max duration cap (2h * (1 + confirmed_intervals), up to 24h).
    if (entryId) {
      try {
        await (supabase.rpc as any)("confirm_presence_time_entry", { _entry_id: entryId });
      } catch {}
    }
    // Heartbeat to server: confirm presence in any active room membership
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("room_members")
          .update({ last_active_at: new Date().toISOString() } as any)
          .eq("user_id", user.id);
      }
    } catch {}
    setShowModal(false);
    onResume();
  };

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <Dialog open={showModal} onOpenChange={(open) => { if (!open) setShowModal(false); }}>
      <DialogContent className="sm:max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t("timer.inactivity_title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("timer.inactivity_desc")}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("timer.inactivity_desc")}</p>
        <div className="text-3xl font-mono font-bold text-warning my-4">
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
        <p className="text-xs text-muted-foreground">{t("timer.inactivity_warning")}</p>
        <Button onClick={handleConfirm} className="w-full mt-2" size="lg">
          {t("timer.im_here")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
