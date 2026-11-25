# ShiftManager API Reference

Base URL: `http://localhost:5000/api`
All request/response bodies are JSON. Protected routes need the header:

```
Authorization: Bearer <JWT from /auth/login>
```

## Common error responses

| Status | When | Example body |
|---|---|---|
| 400 | Validation failed, invalid ID, unexpected field, `$` operator, malformed JSON | `{"message":"Validation failed","errors":["Location is required"]}` |
| 401 | Missing, invalid or expired token; deleted user | `{"message":"Access denied. Please login."}` / `{"message":"Session expired. Please login again."}` |
| 403 | Logged in but wrong role or not the owner | `{"message":"Access denied. Insufficient permissions."}` |
| 404 | Record or route not found | `{"message":"Shift not found"}` |
| 409 | Conflict: duplicate email, overlapping shift/leave, invalid status change | `{"message":"Cannot change status from approved to rejected"}` |
| 413 | Body larger than 10 kB | `{"message":"Request body too large"}` |
| 429 | Too many failed login/register attempts | `{"message":"Too many attempts. Please try again in 15 minutes."}` |
| 500 | Unexpected error (details only in server log, never sent to client) | `{"message":"Internal server error"}` |

---

## Authentication

| Method | Path | Access | Body | Success |
|---|---|---|---|---|
| POST | `/auth/register` | Public (rate limited) | `{ name, email, password }` | 201 `{ message, user }` |
| POST | `/auth/login` | Public (rate limited) | `{ email, password }` | 200 `{ message, token, user }` |
| GET | `/auth/me` | Any logged-in user | – | 200 `{ user }` |
| GET | `/protected` | Any logged-in user (development test route) | – | 200 |
| GET | `/manager/test` | Manager (development test route) | – | 200 |

Rules: password ≥ 8 chars; valid email; email unique (409); **any extra field such as `role` → 400**
(public registration can only create employees). Login returns the same 401 message for unknown
email and wrong password.

```json
// POST /auth/login 200
{
  "message": "Login successful",
  "token": "eyJhbGciOi...",
  "user": { "id": "6b02ef5d00ebf317056ab248", "name": "Ethan Employee", "email": "employee2@example.com", "role": "employee" }
}
```

## Shifts

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/shifts` | Manager: all · Employee: own only | Query: `from`, `to` (YYYY-MM-DD), `employeeId` (manager only; ignored for employees) |
| GET | `/shifts/:id` | Manager, or the employee who owns it | Other employee → 403 |
| POST | `/shifts` | Manager | Body: `{ employeeId, date, startTime, endTime, location }` → 201 |
| PUT | `/shifts/:id` | Manager | Any subset of the five fields → 200 |
| DELETE | `/shifts/:id` | Manager | → 200 `{ message, id }` |

Validation & business rules:

- `employeeId` – valid ObjectId of an existing user with role `employee` (else 400/404)
- `date` – real calendar date `YYYY-MM-DD` (2026-02-30 → 400)
- `startTime`/`endTime` – 24-hour `HH:mm`; **end must be after start** (same-day policy – an overnight
  shift is entered as two shifts)
- `location` – required, trimmed, max 100 characters
- **Conflict detection** – the same employee cannot have overlapping shifts on the same date (409).
  Back-to-back shifts (13:00 end / 13:00 start) are allowed. A shift never conflicts with itself on update.
- Unknown fields → 400; empty update body → 400.

```json
// POST /shifts 201
{
  "message": "Shift created successfully",
  "shift": {
    "_id": "6b02f0d48b3584278670ffec",
    "employeeId": { "_id": "6b02ef5d00ebf317056ab248", "name": "Ethan Employee", "email": "employee2@example.com" },
    "date": "2026-12-01", "startTime": "09:00", "endTime": "13:00", "location": "Front Desk",
    "createdAt": "...", "updatedAt": "..."
  }
}
// GET /shifts 200
{ "message": "Shifts retrieved successfully", "count": 1, "shifts": [ ... ] }
```

## Leave requests

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/leaves` | Manager: all · Employee: own | Query: `status` = pending/approved/rejected |
| GET | `/leaves/:id` | Manager, or owner | Other employee → 403 |
| POST | `/leaves` | Employee | `{ startDate, endDate, reason }` → 201, status `pending` |
| PUT | `/leaves/:id` | Employee owner, **pending only** | Reviewed → 409 |
| DELETE | `/leaves/:id` | Employee owner, **pending only** | Cancels (deletes) the request |
| PATCH | `/leaves/:id/status` | Manager | `{ "status": "approved" \| "rejected" }` |

Rules: real dates; `endDate ≥ startDate`; reason required (≤ 500 chars); `employeeId` and `status`
cannot be sent by the employee (400) – the owner is always the logged-in user; overlapping
pending/approved leave for the same employee → 409; status transitions only
`pending → approved` or `pending → rejected` (anything else → 409). Approval stores `reviewedBy`
and `reviewedAt`.

## Notifications

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/notifications/public-key` | Public | `{ publicKey }` – VAPID **public** key only |
| POST | `/notifications/subscribe` | Logged-in user | Browser `PushSubscription.toJSON()` – `{ endpoint (https URL), keys: { p256dh, auth } }` → 201 |
| DELETE | `/notifications/subscribe` | Logged-in user | `{ endpoint }` – only your own subscription (else 404) |
| POST | `/notifications/test` | Manager | `{ userId? }` – sends a test push (defaults to yourself). No subscriptions → 404 |

Automatic notifications (Observer pattern – `events/notificationListeners.js`):

| Event | Recipient | Title |
|---|---|---|
| Employee submits leave | All managers | "New leave request" |
| Manager approves/rejects | The employee | "Leave approved" / "Leave rejected" |
| Shift created | Assigned employee | "New shift assigned" |
| Shift updated | Employee (and previous employee if reassigned) | "Shift updated" |
| Shift deleted | Employee | "Shift cancelled" |

Expired subscriptions (push service answers 404/410) are deleted automatically.

## Users (manager only)

| Method | Path | Notes |
|---|---|---|
| GET | `/users/employees` | `{ count, employees: [{ _id, name, email, role }] }` – for the shift form |
| GET | `/users/stats` | `{ totalEmployees, upcomingShifts, pendingLeaves }` – dashboard |

## Health

`GET /` and `GET /api/health` – public status checks.
