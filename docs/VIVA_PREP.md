# Demo Script and Viva Preparation

## 1. Before the demo (checklist)

```powershell
# MongoDB service running?
Get-Service MongoDB

# Terminal 1
cd C:\ShiftManager_Final\backend
node scripts/seed.js; node scripts/seed-demo-data.js   # manager: ankush12@gmail.com / 12345678 (register 1-2 employees first for demo data)
npm.cmd start

# Terminal 2 (PWA/push demo uses the production build)
cd C:\ShiftManager_Final\frontend
npm.cmd run build; npm.cmd run preview     # http://localhost:4173
```

- Two browser windows (e.g. Chrome = manager, Edge = employee), notifications allowed in both.
- Windows Focus Assist / Do Not Disturb **off**.
- Postman open with the collection; VS Code open on `services/shiftService.js`.
- MongoDB Compass connected to `shiftmanager`.

## 2. 10-minute demo flow

| Min | Show | Say (key points) |
|---|---|---|
| 0–1 | Problem + architecture diagram (`docs/UML.md` §8) | Spreadsheets/messages → central PWA; React ↔ Express ↔ MongoDB |
| 1–2 | Register page (try `role` in Postman → 400), login | bcrypt hash, JWT 1 h, public registration can't create managers |
| 2–4 | Manager: dashboard → create shift → overlapping shift (409) → edit → delete with confirmation | Validation on both sides; conflict detection; Repository + service layers |
| 4–5 | Employee window: notification "Shift updated"; My Shifts read-only | Observer pattern triggers push; data isolation enforced by the API |
| 5–6 | Employee submits leave → manager gets "New leave request" → approve → employee gets "Leave approved" | State machine pending→approved/rejected, final decisions |
| 6–7 | DevTools → Application (manifest, service worker, cache, IndexedDB) → Network Offline → reload | App shell cached by SW; personal data per user in IndexedDB; cleared on logout |
| 7–8 | Postman: employee tries PUT /shifts (403), invalid ID (400), no token (401) | Backend enforces permissions, not just hidden buttons |
| 8–9 | `npm test` (128 pass) + `npm test` in frontend (29 pass) | Unit + integration with a separate test DB |
| 9–10 | VS Code breakpoint in `assertNoConflict` with watches | Debugging approach; troubleshooting log |

## 3. Likely viva questions and model answers

**What problem does ShiftManager solve?** Small businesses lose track of rosters and leave in spreadsheets
and messages. ShiftManager centralises shifts and leave, prevents double-booking, and notifies people
of changes.

**How does a React component get data?** Pages call the `useCachedResource` hook, which calls a function
from `src/api/services.js`. That uses `apiRequest()` (fetch + Bearer token). The result is stored in
state, which re-renders the component. A copy is saved in IndexedDB for offline use.

**How does the Express backend handle a request?** `app.js` middleware (helmet, CORS, JSON parser,
sanitiser, logger) → router → `protect` (JWT + DB role) → `authorizeRoles` → controller → service
(rules) → repository (MongoDB) → JSON response. Errors are thrown as `AppError` and formatted by the
central error handler.

**What is CRUD here?** Shifts: create/read/update/delete by managers (employees read their own).
Leave: employees create/read/update/delete (cancel) their pending requests; managers read all and
update status.

**How are the models related?** One User has many Shifts (`employeeId`), many LeaveRequests
(`employeeId`, and `reviewedBy` for managers) and many PushSubscriptions (`userId`). Mongoose
`populate()` fills in names/emails.

**How does password hashing work?** bcrypt adds a random salt and runs a slow hash (cost 12 = 2¹²
rounds). We store only the hash. At login `bcrypt.compare` hashes the attempt with the same salt and
compares. Even the same password gives different hashes, and brute force is slow.

**How does JWT authentication work?** On login the server signs `{id, role}` with `JWT_SECRET` and an
expiry. The client sends it as `Authorization: Bearer`. The server verifies the signature and expiry on
each request; a tampered token fails verification. JWTs are signed, not encrypted – so no secrets inside.

**Why re-read the role from the database?** The role inside a token can be out of date (e.g. someone
demoted). Reading the current role means changes apply immediately – there's a test for this.

**How is employee data isolation enforced?** In the service layer: for employees the filter is always
`employeeId = req.user.id`, any `employeeId` query is ignored, and single-record reads check ownership
(403). The frontend only hides controls; the backend is the real boundary.

**How do service workers and offline caching work?** The SW is a script that runs separately from the
page and can intercept requests. On install it caches the app shell; on fetch it uses network-first
with cache fallback. API data is not cached by the SW – the app saves it to IndexedDB per user and
deletes it at logout so another user can't see it.

**How do push notifications work?** The browser creates a subscription (endpoint + keys) using our VAPID
public key; we store it against the user. When an event happens, `web-push` encrypts the message with
the subscription keys, signs it with our VAPID private key, and sends it to the browser's push service,
which wakes our service worker to show the notification.

**Which design patterns did you use and why?** Repository (DB access separated, reusable queries),
Observer (events trigger notifications without coupling), Strategy (swap Web Push / console / fake
delivery for tests). Plus layered architecture, middleware chain and a central error handler.

**How do your tests work?** Jest unit tests for pure functions and middleware; Supertest integration
tests call the real Express app against a separate MongoDB test database and check status codes, bodies
and database state. Vitest + Testing Library test React validation, routing guards and the API client.

**Tell us about a hard bug.** The Jest/MongoDB handshake error ("Missing required sub-document
'driver'") – diagnosed by printing the underlying error; caused by the driver's dynamic `import()` under
Jest; fixed with `--experimental-vm-modules`. Or the Step 9.6.2 "empty GET" – it was an empty
collection, found by checking `count` and querying MongoDB directly.

**What would you improve?** httpOnly refresh-token cookies instead of localStorage; admin screen to
promote managers; offline edits with background sync; calendar view; overnight shifts; MongoDB Atlas
replica set and HTTPS deployment; audit history.

## 4. Things to be honest about

- The JWT is in `localStorage` (trade-off for offline support) – explain the mitigations.
- Overnight shifts are not supported by design (two shifts instead).
- Offline mode is read-only.
- Manager accounts are created/promoted outside the public UI (seed script / Compass).
