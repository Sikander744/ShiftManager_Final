# Troubleshooting and Debugging Log

Each entry records a **real** problem met during development: symptoms, error, root cause, fix and retest.
Add your screenshots where marked.

---

## Problem 1 – `jwt is not defined`

| | |
|---|---|
| **Symptom** | Login request returned HTTP 500 "Login failed" |
| **Error** | Terminal: `Login error: jwt is not defined` (ReferenceError) |
| **Root cause** | `jwt.sign()` was used in `routes/authRoutes.js` but `require("jsonwebtoken")` was missing |
| **Fix** | Added `const jwt = require("jsonwebtoken");` (now in `services/authService.js`) |
| **Retest** | Login returned 200 with a token |
| **Evidence** | `[Screenshot placeholder: terminal error + successful Postman login]` |

## Problem 2 – Duplicate `authRoutes` declaration

| | |
|---|---|
| **Symptom** | Server crashed on start |
| **Error** | `SyntaxError: Identifier 'authRoutes' has already been declared` |
| **Root cause** | `const authRoutes = require(...)` was pasted twice in `server.js` |
| **Fix** | Removed the duplicate line |
| **Retest** | `node server.js` → "MongoDB Connected Successfully" |

## Problem 3 – File named `sever.js`

| | |
|---|---|
| **Symptom** | `node server.js` failed immediately |
| **Error** | `Error: Cannot find module 'C:\ShiftManager\backend\server.js'` (MODULE_NOT_FOUND) |
| **Root cause** | File was saved as `sever.js` (typo) |
| **Fix** | Renamed to `server.js` |
| **Lesson** | Read the path inside the error message carefully |

## Problem 4 – Manager account still had employee role

| | |
|---|---|
| **Symptom** | `manager1@example.com` received **403** on `/api/manager/test` |
| **Root cause** | Public registration (correctly) always creates `employee`; the role had not been changed in the DB, and later the old JWT still contained `role: "employee"` |
| **Fix** | Changed role to `manager` in MongoDB Compass and logged in again. **Improvement:** `authMiddleware.js` now re-reads the role from MongoDB on each request, so role changes apply immediately and stale tokens cannot keep old privileges (test: "stale role in token is ignored" in `auth.test.js`) |

## Problem 5 – Step 9.6.2: GET shifts showed no rows

| | |
|---|---|
| **Symptom** | PowerShell `Invoke-RestMethod ... /api/shifts \| Format-Table` printed nothing |
| **Investigation** | 1) Printed the raw response: `message=Shifts retrieved successfully count=0 shifts=0` → request succeeded (200, so the manager *was* authenticated). 2) Queried MongoDB directly: `users 2, shifts 0, leaverequests 0, pushsubscriptions 0` |
| **Root cause** | **Not a code bug** – the `shifts` collection was empty. The earlier test shift no longer existed (deleted in Compass or created against the other project copy `C:\ShiftManager`). `Format-Table` on an empty array prints nothing, which looked like a failure |
| **Fix** | Created a new shift → GET returned `count=1`. Then tested PUT: start 09:00→10:00, end 17:00→18:00, location Front Desk→Warehouse; MongoDB showed the new values and a newer `updatedAt`. Employee PUT → 403; invalid ID → 400; end-before-start → 400 |
| **Lesson** | Always inspect `count` and the raw JSON before assuming the code is wrong |
| **Evidence** | `[Screenshot placeholder: PowerShell output count=0 then count=1 + Compass document]` |

## Problem 6 – PowerShell variables are case-insensitive (test script)

| | |
|---|---|
| **Symptom** | First smoke-test run: 12 failures – `400 "A valid employeeId is required"` and `404 "Route not found: PUT /api/shifts/"` |
| **Root cause** | Script used `$e` (login response) and `$E` (token). PowerShell treats them as **the same variable**, so `$E = $e.body.token` overwrote the response and `$empId`/`$sid` became empty – producing URLs like `/api/shifts/` |
| **Fix** | Renamed to `$eLogin`, `$mLogin`; rerun → all shift checks passed |
| **Lesson** | The API was correct – the 404 URL in the error message revealed the empty ID |

## Problem 7 – Smoke test not repeatable (409 on rerun)

| | |
|---|---|
| **Symptom** | Second run: "Employee creates leave" → 409 overlap |
| **Root cause** | The approved leave from the previous run still existed (approved leave cannot be deleted by design) |
| **Fix** | Script now uses a random future year for its dates and runs `scripts/cleanup-smoke.js` at the end |

## Problem 8 – Rate limiter returned 429 during testing

| | |
|---|---|
| **Symptom** | "Duplicate email rejected" expected 409, got **429 Too many attempts** |
| **Root cause** | Rate limiter (20 requests / 15 min) counted *every* login/register, and repeated test runs exceeded it – the security feature was working |
| **Fix** | `skipSuccessfulRequests: true` (only failed attempts count), limit configurable with `AUTH_RATE_LIMIT`; limiter skipped under `NODE_ENV=test` |
| **Retest** | Smoke test 66/66 |

## Problem 9 – Jest: "Must use import to load ES Module" (web-push)

| | |
|---|---|
| **Symptom** | 4 integration suites failed to run |
| **Error** | `Must use import to load ES Module: node_modules/web-push/src/index.js` |
| **Root cause** | `web-push` v4 is an ES module. Node 24 allows `require()` of ESM, but Jest's CommonJS runtime does not |
| **Fix** | `notificationStrategies.js` loads `web-push` lazily inside `WebPushStrategy` (never constructed in tests, which inject a fake strategy) |

## Problem 10 – Jest could not connect to MongoDB

| | |
|---|---|
| **Symptom** | Every integration test: `Exceeded timeout of 20000 ms for a hook` at `mongoose.connect`; then `Cannot read properties of undefined (reading 'dropDatabase')` |
| **Debugging** | Wrote a one-off test printing the real error with `serverSelectionTimeoutMS: 3000`: `MongooseServerSelectionError: Missing required sub-document 'driver' in the client metadata document` |
| **Root cause** | MongoDB Node driver ≥ 7.6 builds its handshake metadata with a dynamic `import('os')`, which Jest's CommonJS VM blocks, so the server rejected the handshake (the app itself connected fine outside Jest) |
| **Fix** | Run Jest with `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand` (`npm test`) |
| **Retest** | 128/128 tests pass |

## Problem 11 – VAPID private key printed in the terminal

| | |
|---|---|
| **Symptom** | `npx web-push generate-vapid-keys --json` printed the private key into a shared log |
| **Root cause** | Generating secrets in a visible terminal |
| **Fix** | Discarded that pair; generated a new pair with a script that writes directly into `.env` without printing it |
| **Lesson** | Treat keys like passwords – never paste them into logs, screenshots or Git |

## Problem 12 – ESLint React-hooks errors in the frontend

| | |
|---|---|
| **Errors** | `Cannot update ref during render` (react-hooks/refs), `Calling setState synchronously within an effect` (react-hooks/set-state-in-effect), `Fast refresh only works when a file only exports components` |
| **Fix** | Ref updated inside `useEffect`; loading state only changed after the awaited fetch; `AuthContext`/`useAuth` moved to `context/useAuth.js` |
| **Retest** | `npm run lint` → 0 problems; 29 Vitest tests pass |

## Problem 13 – Port 5173 already in use

| | |
|---|---|
| **Error** | `Error: Port 5173 is already in use` |
| **Root cause** | The old project copy (`C:\ShiftManager\frontend`) Vite server was still running |
| **Fix** | Stop the old server (Ctrl+C in its terminal) or use the production preview on port 4173 (also allowed by CORS). `strictPort: true` in `vite.config.js` makes this obvious instead of silently switching to a port CORS would block |

## Problem 14 – "Changes are disabled" notice, but forms still enabled

| | |
|---|---|
| **Symptom** | Offline test with both servers stopped: cached data showed correctly with "Offline mode – … Changes are disabled", but the leave form's Submit button was still enabled; submitting showed "Cannot reach the server. You may be offline." |
| **Root cause** | Buttons were disabled only when `navigator.onLine` was false. When the *server* is down but the network is up, `navigator.onLine` stays `true` |
| **Fix** | Pages compute `canEdit = online && !cachedAt` – any time cached data is displayed, create/edit/delete/approve controls are disabled |
| **Lesson** | "Online" (browser has a network) is not the same as "server reachable" |

## Problem 15 - Replica set unreachable from Windows; demo hit the wrong server

| | |
|---|---|
| **Symptom** | First replication demo: `Seed failed: connect ETIMEDOUT 192.168.4.84:27018`, the shift was "NOT FOUND" on the secondary, and the backend log was empty |
| **Root cause** | (1) Members advertised `host.docker.internal`, which on Windows resolved to the LAN IP where the connection timed out. (2) The demo backend could not start, but another ShiftManager backend was already running on port 5000, so the API calls silently went to the normal local database instead of the replica set |
| **Fix** | All three mongod containers share one network namespace (`rs-net`) so members are `localhost:27018-27020` for both containers and Windows; the demo backend uses its own port **5055** and the script now stops if seeding or start-up fails. The stray test data in the local database was removed |
| **Retest** | Replication confirmed on a secondary; failover elected a new primary in under 1 s and the API kept working (`docs/evidence/replication-failover-demo.txt`) |
| **Lesson** | Always confirm *which* server answered a request - a successful response is not proof that the right component handled it |

---

## Logging and error handling in the code

- **Request logger** (`middleware/requestLogger.js`): every request → `[time] [INFO] PUT /api/shifts/… -> 200 (8ms)`; 4xx logged as WARN, 5xx as ERROR.
- **Business event logs**: `Push "Shift updated" -> users=1 sent=1 failed=0`.
- **Central error handler** (`middleware/errorMiddleware.js`): maps errors to safe JSON; logs stack traces for 500s on the server only.
- **Frontend**: `ApiError` with status; network failures → offline mode; `[SW]` and `[offline]` console messages.

## How to use the VS Code debugger (for screenshots)

1. Stop any backend running in a terminal (port 5000 must be free).
2. Open `backend/services/shiftService.js` and click in the gutter to set a **breakpoint** on the line
   `const clash = sameDay.find(...)` inside `assertNoConflict`.
3. Run and Debug (Ctrl+Shift+D) → **"Backend: debug server"** → F5 (config in `.vscode/launch.json`).
4. In Postman or the app, create a shift that overlaps an existing one.
5. Execution pauses. In the **WATCH** panel add:
   - `startTime`, `endTime`
   - `sameDay.length`
   - `sameDay.map(s => s.startTime + "-" + s.endTime)`
6. Step over (F10) and watch `clash` become the conflicting shift → request returns 409.
7. Other useful breakpoints: `middleware/authMiddleware.js` (watch `decoded`, `user.role`),
   `services/leaveService.js` `reviewLeave` (watch `leave.status`, `status`, `canTransition(leave.status, status)`).
8. Frontend: Chrome DevTools → Sources → `src/hooks/useCachedResource.js`, breakpoint in the `catch` block,
   go offline in the Network tab, reload → watch `err.isNetworkError` and `cached.savedAt`.

`[Screenshot placeholder: VS Code paused at breakpoint with WATCH panel]`
`[Screenshot placeholder: Chrome DevTools breakpoint in useCachedResource while offline]`
