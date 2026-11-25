# Testing Report

| Test type | Tool | Command | Result | Evidence file |
|---|---|---|---|---|
| Backend unit tests | Jest | `cd backend; npm.cmd test` | **51 passed** (inside the 128 total) | `docs/evidence/backend-jest-results.txt` |
| Backend integration (API + MongoDB) | Jest + Supertest | same | **77 passed** – **128/128 total** | same |
| Frontend unit/component | Vitest + Testing Library | `cd frontend; npm.cmd test` | **29/29 passed** | `docs/evidence/frontend-vitest-results.txt` |
| Live API smoke test | PowerShell | `powershell -ExecutionPolicy Bypass -File scripts\api-smoke-test.ps1` | **68/68 passed** | `docs/evidence/api-smoke-test-results.txt` |
| Postman collection | Postman / Newman | Import `postman/ShiftManager.postman_collection.json` → Run collection | **61 requests, 70 assertions, 0 failed** | `docs/evidence/postman-newman-results.txt` |
| End-to-end UI | Browser (manual script, executed by an automated browser agent) | 13 steps in §4 | **13/13 passed** | §4 below |
| Lint | ESLint | `cd frontend; npm.cmd run lint` | 0 problems | – |

`[Screenshot placeholder: backend npm test – 128 passed]`
`[Screenshot placeholder: frontend npm test – 29 passed]`
`[Screenshot placeholder: Postman Collection Runner – all green]`

## 1. Backend automated tests (Jest)

Integration tests import the Express `app` (from `app.js`) with Supertest and use a **separate
database `shiftmanager_test`**, which is cleared before each test and dropped afterwards.

| File | What it proves |
|---|---|
| `tests/unit/validators.test.js` | Email, required fields, real dates (leap years, 2026-02-30), HH:mm times, end-after-start, overlap detection incl. back-to-back, validateShift/validateLeave, unknown fields |
| `tests/unit/middlewareAndRules.test.js` | bcrypt hashing/compare; JWT sign/verify, forged secret rejected, expired token; `authorizeRoles` manager allowed / employee 403 / missing user 401; NoSQL `$` detection; leave state transitions |
| `tests/integration/auth.test.js` | Register (201, hash stored, no hash returned), duplicate 409, incomplete/short/invalid 400, role escalation 400; login 200/401 with generic message; NoSQL injection 400; malformed JSON 400; missing/invalid/expired token 401; stale role ignored (403); deleted user 401; unknown route 404 |
| `tests/integration/shifts.test.js` | Create 201 / employee 403 / 6 invalid inputs 400 / unknown employee 404 / manager as assignee 404 / overlap 409 / back-to-back OK; read: manager all, employee own only, filter cannot be widened, other's shift 403, date filters; update 200 with DB check, employee 403, invalid/missing/empty 400/404/400, end-before-start 400, conflict 409, no self-conflict; delete employee 403, manager 200 then 404 |
| `tests/integration/leaves.test.js` | Create pending (owner from token), spoofed employeeId/status 400, bad range/dates/reason 400, overlap 409, manager 403; read isolation, manager filter, other employee 403, invalid/unknown ID; edit/cancel pending, other employee 403, reviewed → 409; approve saves reviewer + timestamp, reject, employee 403, invalid status 400, approved→rejected 409 |
| `tests/integration/notifications.test.js` | Subscribe 201 with userId, 401 without token, 3 invalid subscriptions 400, delete only own; Scenario A/B/C notify exactly the right user; expired 410 subscription removed; test trigger 403/404/200 |

Assertions check **status codes, response structure and the database state** (e.g. the shift is really
unchanged after a 403).

## 2. Frontend automated tests (Vitest)

| File | What it proves |
|---|---|
| `src/test/validation.test.js` | Login/register/shift/leave form rules, date helpers |
| `src/test/apiClient.test.js` | Bearer header added; no token on public calls; 403 → ApiError with message; network failure → offline error (status 0); 401 fires the session-expired event |
| `src/test/components.test.jsx` | Login shows validation messages and does not call the API; invalid email message; calls login with entered values; shows server error; ProtectedRoute redirects anonymous users and employees, allows managers; StatusBadge, EmptyState rendering |

## 3. Postman / API test log

Run order matters (later requests use saved tokens/IDs). Dates use a random future year so the
collection can be re-run. Afterwards run `node scripts/cleanup-smoke.js` to remove test data.

| # | Test | Method & endpoint | Input (summary) | Expected | Actual | Pass |
|---|---|---|---|---|---|---|
| A1 | Login manager | POST /auth/login | ankush12@gmail.com / 12345678 | 200 + token, role manager | 200 | ✅ |
| A2 | Login employee | POST /auth/login | employee2 | 200, no passwordHash | 200 | ✅ |
| A3 | Register valid | POST /auth/register | name, unique email, password | 201, role employee | 201 | ✅ |
| A4 | Duplicate email | POST /auth/register | email of test employee A | 409 | 409 | ✅ |
| A5 | Incomplete registration | POST /auth/register | email only | 400 | 400 | ✅ |
| A6 | Privilege escalation | POST /auth/register | + `role: "manager"` | 400 | 400 | ✅ |
| A7 | Wrong password | POST /auth/login | wrong password | 401 | 401 | ✅ |
| A8 | NoSQL injection | POST /auth/login | `{ "$ne": "" }` | 400 | 400 | ✅ |
| A9 | Missing token | GET /protected | – | 401 | 401 | ✅ |
| A10 | Invalid token | GET /protected | Bearer invalidToken | 401 | 401 | ✅ |
| A11 | Employee on manager route | GET /manager/test | employee token | 403 | 403 | ✅ |
| S1 | Manager creates shift | POST /shifts | 09:00–13:00 Front Desk | 201 | 201 | ✅ |
| S2 | Conflicting shift | POST /shifts | 12:00–15:00 same day | 409 | 409 | ✅ |
| S3 | Back-to-back shift | POST /shifts | 13:00–15:00 | 201 | 201 | ✅ |
| S4 | Invalid date | POST /shifts | 2027-02-30 | 400 | 400 | ✅ |
| S5 | Invalid time | POST /shifts | 25:00 | 400 | 400 | ✅ |
| S6 | End before start | POST /shifts | 17:00–09:00 | 400 | 400 | ✅ |
| S7 | Empty location | POST /shifts | "   " | 400 | 400 | ✅ |
| S8 | Employee creates shift | POST /shifts | employee token | 403 | 403 | ✅ |
| S9 | Manager lists shifts | GET /shifts | – | 200 count + array | 200 | ✅ |
| S10 | Employee own shifts only | GET /shifts | employee token | only own employeeId | 200 ✔ | ✅ |
| S11 | Other employee's shift | GET /shifts/:id | employee3 token | 403 | 403 | ✅ |
| S12 | Manager updates shift | PUT /shifts/:id | start 08:00, Warehouse | 200, location updated | 200 | ✅ |
| S13 | Employee updates shift | PUT /shifts/:id | employee token | 403 | 403 | ✅ |
| S14 | Invalid shift ID | PUT /shifts/abc123 | – | 400 | 400 | ✅ |
| S15 | Missing shift | PUT /shifts/000…000 | – | 404 | 404 | ✅ |
| S16 | Update creates conflict | PUT /shifts/:id2 | start 12:00 | 409 | 409 | ✅ |
| S17 | Employee deletes shift | DELETE /shifts/:id | employee token | 403 | 403 | ✅ |
| S18 | Manager deletes shift | DELETE /shifts/:id | – | 200 | 200 | ✅ |
| S19 | Deleted shift | DELETE /shifts/:id | again | 404 | 404 | ✅ |
| L1 | Employee creates leave | POST /leaves | dates + reason | 201 pending | 201 | ✅ |
| L2 | Invalid date range | POST /leaves | end < start | 400 | 400 | ✅ |
| L3 | Overlapping leave | POST /leaves | overlapping dates | 409 | 409 | ✅ |
| L4 | Employee views own | GET /leaves | – | 200 | 200 | ✅ |
| L5 | Other employee's leave | GET /leaves/:id | employee3 token | 403 | 403 | ✅ |
| L6 | Update pending | PUT /leaves/:id | new reason | 200 | 200 | ✅ |
| L7 | Manager views all | GET /leaves | – | 200 | 200 | ✅ |
| L8 | Employee approves | PATCH /leaves/:id/status | employee token | 403 | 403 | ✅ |
| L9 | Manager approves | PATCH /leaves/:id/status | approved | 200, reviewedBy set | 200 | ✅ |
| L10 | Invalid transition | PATCH /leaves/:id/status | approved→rejected | 409 | 409 | ✅ |
| L11 | Edit reviewed leave | PUT /leaves/:id | – | 409 | 409 | ✅ |
| L12 | Manager rejects | PATCH /leaves/:id/status | rejected | 200 | 200 | ✅ |
| L13 | Other employee cancels | DELETE /leaves/:id | employee3 token | 403 | 403 | ✅ |
| L14 | Employee cancels pending | DELETE /leaves/:id | – | 200 | 200 | ✅ |
| N1 | Public key | GET /notifications/public-key | – | 200, no private key | 200 | ✅ |
| N2 | Subscribe without token | POST /notifications/subscribe | – | 401 | 401 | ✅ |
| N3 | Invalid subscription | POST /notifications/subscribe | endpoint "not-a-url" | 400 | 400 | ✅ |
| N4 | Unauthorized trigger | POST /notifications/test | employee token | 403 | 403 | ✅ |
| U1 | Employees list | GET /users/employees | manager / employee | 200 / 403 | 200 / 403 | ✅ |

## 4. End-to-end UI test (production build, port 4173)

| # | Step | Expected | Result |
|---|---|---|---|
| 1 | Open app, submit empty login | Redirect to /login; "Email is required", "Password is required" | ✅ |
| 2 | Manager login | Dashboard with 3 stat cards, upcoming shifts, pending leave | ✅ |
| 3 | Create shift | Success message, row in roster | ✅ |
| 4 | Overlapping shift | Red error "Shift conflicts with an existing shift (09:00-17:00)…" (API 409) | ✅ |
| 5 | End before start | Inline error, no request sent | ✅ |
| 6 | Edit shift location | "Shift updated…", table updated | ✅ |
| 7 | Delete shift | Confirmation dialog, then row removed | ✅ |
| 8 | Approve leave | Dialog → "Request approved…", appears in Approved tab | ✅ |
| 9 | Employee login | "Welcome, Ethan", next-shift card; My Shifts read-only (no form, no edit/delete) | ✅ |
| 10 | Employee leave create/edit/cancel | Pending badge, updated, cancelled after confirmation | ✅ |
| 11 | Leave end before start | Inline error, no request | ✅ |
| 12 | Unknown URL | "Page not found" card | ✅ |
| 13 | Mobile width 390px | Hamburger menu, tables become stacked cards | ✅ |

## 5. Offline / PWA test (production build)

| # | Step | Expected | Result |
|---|---|---|---|
| O1 | Sign in as employee, open Dashboard, My Shifts, My Leave | Data loads; copies saved to IndexedDB | ✅ 3 shifts loaded |
| O2 | Stop **both** the frontend server (4173) and the API (5000), reload `/shifts` | App opens from the service-worker cache (no browser error page); API call fails `ERR_CONNECTION_REFUSED`; cached shifts shown with "Offline mode – showing data saved on …" | ✅ 3 cached rows + notice |
| O3 | Navigate to Dashboard and My Leave while offline | Cached data + offline notice on each page | ✅ |
| O4 | Try to submit leave while server unreachable | Should be blocked | ⚠ Found enabled → error "Cannot reach the server" → **fixed** (TROUBLESHOOTING #14): controls now disabled whenever cached data is shown |
| O5 | Restart servers, reload | Live data, notice gone, form enabled | ✅ |
| O6 | Log out | Back to /login | ✅ |
| P1 | Click "Notifications" in the automated test browser | Public key fetched (200); subscription needs a browser push service | ⚠ The embedded test browser has no push service ("Registration failed – push service not available"). **Live delivery must be demonstrated in Chrome/Edge** (`PWA_AND_PUSH.md` §5); server-side delivery logic is covered by `notifications.test.js` |

## 6. How to capture the screenshots

1. Backend tests: run `npm.cmd test` in the VS Code terminal and screenshot the summary.
2. Postman: Collections → ShiftManager API → **Run** → screenshot the results; also open 3–4 individual
   requests (e.g. S1, S8, S16, L10) showing body, status and Test Results tab.
3. Smoke test: run the PowerShell script and screenshot the green PASS list.
