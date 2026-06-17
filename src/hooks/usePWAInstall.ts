import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPhoneOrIPad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac with touch
  const isIPadOS = navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return isIPhoneOrIPad || isIPadOS;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mq || iosStandalone);
}

export function usePWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectStandalone());
  const isIOS = detectIOS();

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled);

    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setIsInstalled(detectStandalone());
    mq?.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [deferred]);

  return {
    canPrompt: Boolean(deferred),
    canInstall: Boolean(deferred) || (isIOS && !isInstalled),
    isIOS,
    isInstalled,
    promptInstall,
  };
}
