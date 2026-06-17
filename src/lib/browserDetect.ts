export type BrowserKind =
  | "chromium"      // Chrome, Edge, Brave, Opera, Samsung
  | "firefox"
  | "safari-mac"
  | "safari-ios"
  | "other";

export function detectBrowser(): BrowserKind {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIOS) return "safari-ios";
  if (/Firefox\//.test(ua) || /FxiOS/.test(ua)) return "firefox";
  // Chromium-based (includes Edg, OPR, SamsungBrowser, Brave)
  if (/Chrome\/|Chromium\/|Edg\/|OPR\/|SamsungBrowser\//.test(ua)) return "chromium";
  if (/Safari\//.test(ua)) return "safari-mac";
  return "other";
}
