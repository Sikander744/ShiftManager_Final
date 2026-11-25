/**
 * Registers the service worker (public/sw.js).
 * The service worker caches the app shell so ShiftManager opens offline
 * and receives push notifications even when the tab is closed.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.info("[SW] Service workers are not supported in this browser");
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.info("[SW] Registered with scope:", registration.scope);

      // Log when a new version is installed (shown in DevTools console)
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            console.info("[SW] New version available - it will be used after reload");
          }
        });
      });
    } catch (error) {
      console.error("[SW] Registration failed:", error);
    }
  });
}
