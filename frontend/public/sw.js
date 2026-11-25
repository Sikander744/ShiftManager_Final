/* ShiftManager service worker
 *
 * 1. App-shell caching  - the HTML/JS/CSS/icons needed to start the app are
 *    cached so the app opens with no network connection.
 * 2. Strategy           - NETWORK FIRST for same-origin GET requests:
 *    always try the network (fresh code), store a copy, and fall back to the
 *    cache when offline. Navigations fall back to the cached index.html.
 * 3. API calls (http://localhost:5000) are cross-origin and are NOT handled
 *    or cached here - personal data is stored per user in IndexedDB by the
 *    app instead, and wiped on logout.
 * 4. Push           - shows notifications sent by the backend (web-push).
 */
const CACHE_VERSION = "v1";
const CACHE_NAME = `shiftmanager-shell-${CACHE_VERSION}`;
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((error) => console.error("[SW] Pre-cache failed:", error))
  );
});

// Remove caches from older versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("shiftmanager-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests (never API calls or other sites)
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Ignore Vite dev-server live-reload internals
  if (url.pathname.startsWith("/@vite") || url.searchParams.has("token")) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match("/index.html");
      if (shell) return shell;
    }
    return new Response("Offline and not cached", { status: 503, statusText: "Offline" });
  }
}

/* ---------------- Push notifications ---------------- */
self.addEventListener("push", (event) => {
  let data = { title: "ShiftManager", body: "You have a new update." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/dashboard" }
    })
  );
});

// Clicking a notification focuses an open tab or opens the related page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
