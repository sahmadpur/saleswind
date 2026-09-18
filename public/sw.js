// Saleswind service worker: shows Web Push notifications and opens the linked page on click.
self.addEventListener("push", (event) => {
  let data = { body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    data.body = event.data ? event.data.text() : "";
  }
  event.waitUntil(
    self.registration.showNotification("Saleswind", {
      body: data.body,
      icon: "/apple-icon",
      badge: "/apple-icon",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const same = clients.find((c) => c.url === url);
      if (same) return same.focus();
      const any = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (any) return any.navigate(url).then((c) => c && c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
