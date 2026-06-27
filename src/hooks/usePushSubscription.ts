import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/pushConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export type PushStatus =
  | "unsupported"
  | "needs-install" // iOS without standalone
  | "denied"
  | "default"
  | "granted-not-subscribed"
  | "subscribed";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

async function upsertSubscription(
  userId: string,
  sub: PushSubscription,
  lang: string,
): Promise<void> {
  const json = sub.toJSON();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent,
      lang,
      timezone: tz,
      last_seen_at: new Date().toISOString(),
      failure_count: 0,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("[push] upsert failed", error);
    throw new Error(error.message || "Failed to save subscription");
  }
}

export function usePushSubscription() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [status, setStatus] = useState<PushStatus>("default");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      if (isIOS() && !isStandalone()) {
        setStatus("needs-install");
      } else {
        setStatus("unsupported");
      }
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setStatus("subscribed");
        // Reconcile: if the browser still has a subscription but the DB row is
        // missing (e.g. from the era when GRANTs were missing), re-upsert it
        // silently so future scheduled pushes can find this device.
        if (user) {
          try {
            const { data } = await supabase
              .from("push_subscriptions")
              .select("id")
              .eq("endpoint", sub.endpoint)
              .maybeSingle();
            if (!data) {
              const lang = (i18n.language || "en-US").slice(0, 5);
              await upsertSubscription(user.id, sub, lang);
              console.info("[push] reconciled missing subscription row");
            }
          } catch (e) {
            console.warn("[push] reconcile check failed", e);
          }
        }
      } else if (Notification.permission === "granted") {
        setStatus("granted-not-subscribed");
      } else {
        setStatus("default");
      }
    } catch (e) {
      console.warn("[push] refresh error", e);
      setStatus("default");
    }
  }, [user, i18n.language]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!user) throw new Error("not-authenticated");
    setLoading(true);
    try {
      if (isIOS() && !isStandalone()) {
        setStatus("needs-install");
        throw new Error("ios-install-required");
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        throw new Error(perm === "denied" ? "permission-denied" : "permission-dismissed");
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
          });
        } catch (e: any) {
          console.error("[push] pushManager.subscribe failed", e);
          throw new Error(e?.message || "push-subscribe-failed");
        }
      }
      const lang = (i18n.language || "en-US").slice(0, 5);
      await upsertSubscription(user.id, sub, lang);
      setStatus("subscribed");
    } finally {
      setLoading(false);
    }
  }, [user, i18n.language]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus(Notification.permission === "granted" ? "granted-not-subscribed" : "default");
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    const { error } = await supabase.functions.invoke("send-push", {
      body: { kind: "test" },
    });
    if (error) throw error;
  }, []);

  const runDiagnostics = useCallback(async () => {
    const result = {
      permission: typeof Notification !== "undefined" ? Notification.permission : "unsupported",
      serviceWorker: false as boolean | string,
      pushSubscription: null as string | null,
      dbRow: false,
      lastSent: null as string | null,
    };
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        result.serviceWorker = reg ? reg.scope : false;
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            result.pushSubscription = sub.endpoint.slice(0, 60) + "…";
            const { data } = await supabase
              .from("push_subscriptions")
              .select("id")
              .eq("endpoint", sub.endpoint)
              .maybeSingle();
            result.dbRow = !!data;
          }
        }
      }
      if (user) {
        const { data } = await supabase
          .from("notification_log")
          .select("sent_at")
          .eq("user_id", user.id)
          .order("sent_at", { ascending: false })
          .limit(1);
        result.lastSent = data?.[0]?.sent_at ?? null;
      }
    } catch (e) {
      console.warn("[push] diagnostics error", e);
    }
    return result;
  }, [user]);

  return {
    status,
    loading,
    subscribe,
    unsubscribe,
    refresh,
    sendTest,
    runDiagnostics,
    isIOSNotInstalled: isIOS() && !isStandalone(),
  };
}
