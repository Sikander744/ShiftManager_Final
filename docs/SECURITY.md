# Security Measures

## 1. Authentication

| Measure | Where | Notes |
|---|---|---|
| Passwords hashed with **bcrypt (cost 12)** | `services/authService.js` | Plain passwords are never stored or logged |
| `passwordHash` hidden | `models/User.js` | `select: false` + `toJSON` transform removes it from every response |
| JWT signed with secret from `.env`, **expires in 1h** | `authService.signToken` | Payload only `{ id, role }` – no personal data |
| Token verification on every protected request | `middleware/authMiddleware.js` | Missing → 401, invalid → 401, expired → 401 "Session expired" |
| **Current role re-read from MongoDB** | `authMiddleware.js` | A stale/forged role claim cannot grant access; deleted users are rejected |
| Generic login error | `authService.login` | Same 401 message for unknown email / wrong password (no account enumeration) |
| Brute-force protection | `routes/authRoutes.js` | `express-rate-limit`: 30 failed attempts / 15 min / IP → 429 |
| Frontend logout | `context/AuthContext.jsx` | Clears token, user, per-user IndexedDB data and the push subscription |
| Auto-logout on expiry | `api/client.js` | Any 401 with a stored token fires `sm:unauthorized` → logout + message |

## 2. Authorization and data isolation

| Rule | Enforcement |
|---|---|
| Manager-only routes (create/update/delete shift, approve leave, list employees, stats, test push) | `authorizeRoles("manager")` → 403 |
| Employee-only routes (create/edit/cancel leave) | `authorizeRoles("employee")` → 403 |
| Employees only see their own shifts/leave | Service forces `filter.employeeId = user.id`; `?employeeId=` is ignored for employees |
| Single-record ownership | `getShift`, `loadAccessible` (leave) → 403 for another employee's record |
| Employees cannot approve their own leave | PATCH status is manager-only |
| Leave owner cannot be spoofed | `employeeId` always comes from the token; sending `employeeId`/`status` → 400 |
| Reviewed leave cannot be silently changed | State machine: edit/cancel/re-review of approved/rejected → 409 |
| **Privilege escalation blocked** | Register accepts only `name, email, password`; `role` → 400; role always `employee` |
| Push subscriptions | Stored with the authenticated `userId`; users can delete only their own |

Frontend route guards (`ProtectedRoute`) only *hide* pages – the backend is the real security boundary.

## 3. Input validation and database security

| Measure | Where |
|---|---|
| Type + format checks (strings, real dates, HH:mm, email, lengths) | `utils/validators.js`, services |
| ObjectId validation before queries → 400 | `isValidObjectId` (24-hex check) |
| Unknown fields rejected (whitelisting) | `findUnknownFields` in every create/update |
| **NoSQL operator injection blocked** (`{"$ne": ""}`, `a.b` keys) | `middleware/sanitizeMiddleware.js` → 400 |
| Queries built only from validated values | Services/repositories – user input never becomes a raw query object |
| Mongoose schema validation as a second layer | `match`, `enum`, `maxlength`, `required` in models |
| JSON body size limit 10 kB | `express.json({ limit: "10kb" })` → 413 |

## 4. API / transport security

| Measure | Where |
|---|---|
| Secure HTTP headers (X-Content-Type-Options, HSTS, frame protection…) | `helmet()` in `app.js` |
| CORS whitelist (`CLIENT_ORIGIN`, only needed methods/headers) | `app.js` |
| Correct status codes (400/401/403/404/409/413/429/500) | Services + error handler |
| No stack traces to clients | `errorMiddleware.js` – 500 returns "Internal server error"; details only in server log |
| Secrets in environment variables; `.env` git-ignored; `.env.example` provided | `backend/.env.example`, `.gitignore` |
| HTTPS | Required in production (push services also require HTTPS origins except `localhost`). Local development uses `http://localhost`, which browsers treat as a secure context |

## 5. Browser / PWA security

| Measure | Where |
|---|---|
| Service worker never caches API responses (cross-origin requests are ignored) | `public/sw.js` |
| Offline data stored per user (`<userId>:<name>` keys) and deleted on logout | `utils/offlineStore.js` |
| VAPID **private** key only on the server; frontend fetches the public key | `GET /api/notifications/public-key` |
| Push subscription endpoint must be HTTPS; `userVisibleOnly: true` | `notificationService.validateSubscription`, `pushService.js` |
| Logout unsubscribes push so the next user of the browser does not receive the previous user's notifications | `AuthContext.logout` |

**Known trade-off:** the JWT is stored in `localStorage` so the app can open offline. This is
readable by JavaScript, so an XSS bug could steal it. Mitigations: React escapes all output (no
`dangerouslySetInnerHTML`), short 1-hour expiry, role re-check on the server. A future improvement is
an httpOnly refresh-token cookie.

## 6. Security test matrix (all automated)

| Test | Expected | Evidence |
|---|---|---|
| Invalid login | 401 generic message | `auth.test.js`, smoke test |
| Missing token | 401 | `auth.test.js`, `shifts.test.js` |
| Invalid token | 401 | `auth.test.js` |
| Expired token | 401 "Session expired" | `auth.test.js`, `middlewareAndRules.test.js` |
| Stale "manager" role in a valid token for an employee | 403 | `auth.test.js` |
| Token of deleted user | 401 | `auth.test.js` |
| Register with `role: "manager"` | 400, no user created | `auth.test.js` |
| NoSQL injection `{ "$ne": "" }` in login | 400 | `auth.test.js`, smoke test |
| Employee creates/updates/deletes shift | 403, DB unchanged | `shifts.test.js` |
| Employee reads another employee's shift / leave | 403 | `shifts.test.js`, `leaves.test.js` |
| Employee widens filter with `?employeeId=` | Still only own shifts | `shifts.test.js` |
| Employee approves own leave | 403, still pending | `leaves.test.js` |
| Employee submits leave for someone else | 400 | `leaves.test.js` |
| Invalid MongoDB ID | 400 | `shifts.test.js`, `leaves.test.js` |
| Invalid body / unexpected fields | 400 | `shifts.test.js` |
| Invalid status transition | 409 | `leaves.test.js` |
| Unauthorized push trigger | 403 | `notifications.test.js` |
| Subscribe without token | 401 | `notifications.test.js` |
| Removing another user's subscription | 404 | `notifications.test.js` |
| Malformed JSON | 400 (not 500) | `auth.test.js` |
