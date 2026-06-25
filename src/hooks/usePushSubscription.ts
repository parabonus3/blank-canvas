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

export function usePushSubscription() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [status, setStatus] = useState<PushStatus>("default");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // iOS Safari hides PushManager when not installed
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
      if (sub) setStatus("subscribed");
      else if (Notification.permission === "granted") setStatus("granted-not-subscribed");
      else setStatus("default");
    } catch {
      setStatus("default");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!user) throw new Error("not-authenticated");
    setLoading(true);
    try {
      if (isIOS() && !isStandalone()) {
        setStatus("needs-install");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const lang = (i18n.language || "en-US").slice(0, 5);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
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
      if (error) throw error;
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

  return { status, loading, subscribe, unsubscribe, refresh, sendTest, isIOSNotInstalled: isIOS() && !isStandalone() };
}
