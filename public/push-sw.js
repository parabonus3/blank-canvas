/* TimeZoni push handlers — loaded via workbox importScripts */
/* eslint-disable no-restricted-globals */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { title: "TimeZoni", body: event.data ? event.data.text() : "" };
    } catch {
      data = {};
    }
  }
  const title = data.title || "TimeZoni";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    tag: data.tag || data.kind || "timezoni",
    renotify: true,
    data: {
      url: data.url || "/",
      kind: data.kind || "generic",
      logId: data.logId || null,
    },
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            await client.focus();
            client.postMessage({ type: "PUSH_NAV", url: targetUrl });
            return;
          }
        } catch { /* noop */ }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
