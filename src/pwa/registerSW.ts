// Guarded service worker registration for TimeZoni PWA.
// Never registers in dev, iframes, Lovable previews, or when ?sw=off is set.
// Dispatches `pwa:update-available` and `pwa:ready` events for the UI.

const SW_URL = "/sw.js";

function isLovablePreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

function shouldSkipRegistration(): boolean {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (isLovablePreviewHost(host)) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  return false;
}

async function unregisterAppServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((reg) => {
          const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || "";
          return url.endsWith("/sw.js") || url.endsWith("/service-worker.js");
        })
        .map((reg) => reg.unregister()),
    );
  } catch {
    /* noop */
  }
}

export function registerSW(): void {
  if (shouldSkipRegistration()) {
    void unregisterAppServiceWorkers();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((reg) => {
        // Already-waiting worker means update is ready right now
        if (reg.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(
            new CustomEvent("pwa:update-available", { detail: { registration: reg } }),
          );
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // New update available
                window.dispatchEvent(
                  new CustomEvent("pwa:update-available", { detail: { registration: reg } }),
                );
              } else {
                // First install complete
                window.dispatchEvent(new CustomEvent("pwa:ready"));
              }
            }
          });
        });

        // Check for updates periodically (every 30 min) and on tab focus
        const checkForUpdate = () => reg.update().catch(() => undefined);
        setInterval(checkForUpdate, 30 * 60 * 1000);
        window.addEventListener("focus", checkForUpdate);
      })
      .catch(() => {
        /* noop */
      });

    // When the new SW takes control, reload so users see the new version
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}

export async function applyUpdateAndReload(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    window.location.reload();
    return;
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
    // controllerchange listener will reload
  } else {
    window.location.reload();
  }
}
