// VAPID public key is safe to expose to the browser by design.
export const VAPID_PUBLIC_KEY =
  "BNA3KqHJSuVBfTc_uYQIdYtbRqo2d42ore5yatxq1-txDvBW81wH-STOA9z8qzc1HvzJEg_DDjyJxckv1q4VhIk";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
