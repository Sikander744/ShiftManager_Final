# PWA, Offline Access and Push Notifications

## 1. Components

| Part | File | Purpose |
|---|---|---|
| Web App Manifest | `frontend/public/manifest.webmanifest` | Name, short name, icons (192/512 + maskable), `start_url: /dashboard`, `display: standalone`, theme `#4f46e5`, background `#f5f7fb` |
| Manifest link + theme | `frontend/index.html` | `<link rel="manifest">`, `<meta name="theme-color">`, apple-touch-icon |
| Service worker | `frontend/public/sw.js` | App-shell pre-cache, network-first runtime caching, versioned cache clean-up, push + notification click handlers |
| Registration | `frontend/src/serviceWorkerRegistration.js` (called from `main.jsx`) | Registers `/sw.js`, logs scope and updates |
| Offline data | `frontend/src/utils/offlineStore.js` | IndexedDB store `shiftmanager-offline`, keys `<userId>:<name>`, cleared on logout |
| Offline-aware loading | `frontend/src/hooks/useCachedResource.js` | Online → fetch + save copy. Network error → show saved copy with timestamp. Reconnect → refresh |
| Online status | `frontend/src/hooks/useOnlineStatus.js` + banner in `Layout.jsx` | "You are offline" banner; create/edit/delete buttons disabled offline |
| Push client | `frontend/src/services/pushService.js`, `components/NotificationToggle.jsx` | Permission, subscribe with VAPID public key, save to API, unsubscribe |
| Push server | `backend/services/notificationService.js`, `notificationStrategies.js`, `events/notificationListeners.js` | Store subscriptions, send encrypted Web Push, delete expired ones |

## 2. Caching strategy (viva explanation)

- **Install:** pre-caches the *app shell* – `/`, `/index.html`, manifest, favicon and icons – into
  `shiftmanager-shell-v1`.
- **Activate:** deletes any older `shiftmanager-*` caches (cache versioning: bump `CACHE_VERSION`
  to force a clean update) and takes control of open pages.
- **Fetch:** for same-origin GET requests uses **network-first**: try the network so users always get
  the newest code; store a copy; if the network fails, answer from the cache; page navigations fall
  back to the cached `index.html` so React can start offline.
- **Not cached by the service worker:** API calls to `http://localhost:5000` (cross-origin). Personal
  data is saved deliberately by the app in **IndexedDB per user** and removed at logout, so a shared
  computer never shows one user's roster to another.

Why network-first? Rosters change often; stale code or data is worse than a slightly slower load.
Cache-first would be faster but could show outdated screens after a deployment.

## 3. Offline demo script (for screenshots and the viva)

Use the **production build** (service workers and caching behave as in production):

```powershell
cd C:\ShiftManager_Final\frontend
npm.cmd run build
npm.cmd run preview      # http://localhost:4173
```

1. Open `http://localhost:4173` in Chrome, sign in as an employee (register one with "Create an account" if needed).
2. Visit **Dashboard**, **My Shifts** and **My Leave** (this saves your data to IndexedDB).
3. DevTools (F12) → **Application**:
   - *Manifest* → name, icons, theme colour `[Screenshot placeholder]`
   - *Service workers* → `sw.js` "activated and is running" `[Screenshot placeholder]`
   - *Cache storage* → `shiftmanager-shell-v1` with index.html, assets, icons `[Screenshot placeholder]`
   - *IndexedDB* → `shiftmanager-offline` → `cache` → keys like `<userId>:my-shifts` `[Screenshot placeholder]`
4. DevTools → **Network** → throttling dropdown → **Offline**.
5. Reload the page. Expected: the app still opens, the yellow **"You are offline"** banner appears,
   and the shift table shows **"Offline mode – showing data saved on …"**. Edit/Create buttons are disabled.
   `[Screenshot placeholder]`
6. Set throttling back to **No throttling**. The banner disappears and data refreshes automatically
   (the hook reloads when the `online` event fires). `[Screenshot placeholder]`
7. Log out → check IndexedDB again: the user's keys are gone.

## 4. Push notification setup

1. Generate VAPID keys (once): `npx web-push generate-vapid-keys` → put them in `backend/.env`
   (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:...`). The private key stays on the
   server; the browser gets the public key from `GET /api/notifications/public-key`.
2. Start the backend – the log shows `Push delivery strategy: web-push` (or `console` if keys are missing).
3. Push requires a secure context: `http://localhost` is allowed; any other host needs HTTPS.

### How a notification travels

```
Manager approves leave
  → leaveService.reviewLeave() saves + emits "leave.reviewed"
  → notificationListeners → notificationService.notifyUsers([employeeId])
  → finds the employee's PushSubscription documents
  → web-push encrypts the payload with the subscription keys (p256dh/auth) and signs with VAPID
  → browser push service (e.g. FCM for Chrome) → employee's service worker "push" event
  → self.registration.showNotification("Leave approved", …)
  → click → notificationclick opens /leave
```

## 5. Push demo script (two browsers)

Use two different browser profiles (e.g. Chrome normal window + Edge, or two Chrome profiles) so each
has its own subscription.

1. **Browser A**: sign in as the manager `ankush12@gmail.com` / `12345678` → click **🔕 Notifications** in the top bar → *Allow*.
   Button turns to **🔔 On**. (MongoDB Compass → `pushsubscriptions` now has a document with the manager's `userId`.)
2. **Browser B**: sign in as a registered employee → enable notifications → *Allow*.
3. **Scenario A** – Browser B submits a leave request → Browser A shows **"New leave request"**.
4. **Scenario B** – Browser A approves it → Browser B shows **"Leave approved"**.
5. **Scenario C** – Browser A edits one of Ethan's shifts → Browser B shows **"Shift updated"**.
6. Test trigger (Postman, manager token): `POST /api/notifications/test` with `{}` → manager's own device
   receives "ShiftManager test notification". As employee → **403**.
7. Backend log shows e.g. `Push "Leave approved" -> users=1 sent=1 failed=0`.

`[Screenshot placeholder: OS notification for each scenario + backend log line]`
`[Screenshot placeholder: pushsubscriptions collection in Compass]`

Troubleshooting:

| Symptom | Fix |
|---|---|
| Button does nothing / "permission was not granted" | Site settings → Notifications → Allow, then click again |
| No notification but log shows `sent=1` | Windows *Focus assist* / Do-not-disturb, or Chrome notifications disabled in Windows Settings → System → Notifications |
| Log shows `failed=1` with 410 | Subscription expired – it is deleted automatically; enable notifications again |
| Log shows `Push delivery strategy: console` | VAPID keys missing in `.env` |

## 6. Automated push tests

`backend/tests/integration/notifications.test.js` (fake delivery strategy – no network):
subscription saved with correct `userId`; 401 without token; invalid subscriptions (missing keys,
non-URL, http) → 400; can't delete someone else's subscription; Scenario A/B/C notify exactly the
right user; expired (410) subscription removed; employee cannot trigger (403); manager test → 200.
