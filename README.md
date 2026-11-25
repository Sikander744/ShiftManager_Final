# ShiftManager – Employee Shift and Leave Management System

A full-stack **React Progressive Web App** with a **Node.js / Express / MongoDB** REST API.
Managers create and manage shifts and approve leave; employees view their roster (even offline),
request leave and receive push notifications.

> Course: IA730001 Advanced Application Development Concepts – Final Project

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, plain CSS (responsive) |
| Backend | Node.js 24, Express 5, Mongoose 9 |
| Database | MongoDB (local, database `shiftmanager`) |
| Auth | JWT (jsonwebtoken) + bcryptjs password hashing |
| PWA | Web App Manifest, Service Worker (Cache API), IndexedDB offline data |
| Push | Web Push API + `web-push` (VAPID keys) |
| Security | helmet, CORS whitelist, express-rate-limit, NoSQL-injection filter |
| Testing | Jest + Supertest (backend), Vitest + Testing Library (frontend), Postman, PowerShell smoke test |

---

## 1. Project structure

```
ShiftManager_Final/
├── backend/
│   ├── app.js                 Express app (middleware + routes) – imported by tests
│   ├── server.js              Connects to MongoDB and starts the server
│   ├── models/                User, Shift, LeaveRequest, PushSubscription (Mongoose)
│   ├── routes/                URL -> middleware -> controller mapping
│   ├── controllers/           HTTP request/response handling only
│   ├── services/              Business rules (validation, conflicts, approvals, push)
│   ├── repositories/          All database queries (Repository pattern)
│   ├── events/                Event bus + notification listeners (Observer pattern)
│   ├── middleware/            auth, roles, sanitising, logging, error handling
│   ├── utils/                 validators, AppError, logger, asyncHandler
│   ├── scripts/               seed data, password reset, API smoke test
│   └── tests/                 unit/ and integration/ Jest tests
├── frontend/
│   ├── public/                sw.js (service worker), manifest.webmanifest, icons
│   └── src/
│       ├── api/               fetch client + API service modules
│       ├── context/           AuthProvider / useAuth (login state)
│       ├── hooks/             useCachedResource (offline cache), useOnlineStatus
│       ├── services/          pushService (Web Push subscription)
│       ├── components/        Layout, ProtectedRoute, NotificationToggle, UI kit
│       ├── pages/             Login, Register, Dashboard, Shifts, Leave
│       ├── utils/             validation, IndexedDB offline store
│       └── test/              Vitest tests
├── docs/                      Report draft, UML, API, security, testing, troubleshooting…
├── postman/                   Postman collection
└── .vscode/launch.json        Debug configurations
```

## 2. Prerequisites

- Node.js 20+ (developed on Node 24) and npm
- MongoDB Community Server running locally (`mongodb://127.0.0.1:27017`)
- Chrome or Edge (for PWA + push testing)

## 3. Setup (Windows PowerShell)

```powershell
# Backend
cd C:\ShiftManager_Final\backend
npm.cmd install
Copy-Item .env.example .env          # then edit JWT_SECRET and VAPID keys
npx.cmd web-push generate-vapid-keys # paste the keys into .env
node scripts/seed.js                 # creates the manager account (see below)
node scripts/seed-demo-data.js       # optional: demo shifts + a pending leave for registered employees

# Frontend
cd C:\ShiftManager_Final\frontend
npm.cmd install
```

### Accounts

| Account | Role | How it is created |
|---|---|---|
| ankush12@gmail.com / 12345678 | manager | `node scripts/seed.js` (public registration can only create employees) |
| Employees | employee | Register in the app ("Create an account") |

Override the manager in `backend/.env` with `SEED_MANAGER_EMAIL`, `SEED_MANAGER_PASSWORD`, `SEED_MANAGER_NAME`.
Forgot a password? `node scripts/resetPassword.js <email> <newPassword>`

## 4. Running

**Quickest:** `powershell -ExecutionPolicy Bypass -File start.ps1 -Preview -Seed` (from `C:\ShiftManager_Final`)
starts MongoDB (if needed), seeds demo data, opens the backend and frontend in their own windows and launches the browser.
Leave out `-Preview` for the Vite dev server on port 5173.

Manually:

```powershell
# Terminal 1 – backend (http://localhost:5000)
cd C:\ShiftManager_Final\backend
npm.cmd start            # or: npm.cmd run dev  (auto-restart with nodemon)

# Terminal 2 – frontend dev server (http://localhost:5173)
cd C:\ShiftManager_Final\frontend
npm.cmd run dev

# PWA / offline / push demo – production build (http://localhost:4173)
npm.cmd run build
npm.cmd run preview
```

Expected backend output:

```
MongoDB Connected Successfully
ShiftManager Backend Running on Port 5000
[INFO] Push delivery strategy: web-push
```

### Extras

```powershell
cd C:\ShiftManager_Final\backend
npm.cmd run start:cluster      # one API worker per CPU core (scaling)
npm.cmd run cert               # self-signed certificate for optional HTTPS (see docs/DATABASE_REPLICATION.md)

cd C:\ShiftManager_Final       # MongoDB replica set (needs Docker Desktop)
docker compose -f database/docker-compose.yml up -d
powershell -ExecutionPolicy Bypass -File database/setup-replica-set.ps1
powershell -ExecutionPolicy Bypass -File database/replication-demo.ps1
```

## 5. Testing

```powershell
cd C:\ShiftManager_Final\backend
npm.cmd test                                              # 128 Jest unit + integration tests
powershell -ExecutionPolicy Bypass -File scripts\api-smoke-test.ps1   # 68 live API checks

cd C:\ShiftManager_Final\frontend
npm.cmd test                                              # 29 Vitest tests
npm.cmd run lint
```

Backend integration tests use a **separate database** (`shiftmanager_test`) that is dropped after each run.
Postman: import `postman/ShiftManager.postman_collection.json` and run the collection in order.

## 6. Main features

- **Authentication** – register (employee only), login, JWT sessions, automatic logout on expiry.
- **Authorization** – role checks on every API route; the current role is re-read from MongoDB.
- **Shift CRUD** (manager) – create / list / filter / update / delete, with validation, same-day policy
  and **conflict detection** (no overlapping shifts per employee).
- **Leave CRUD** – employee create / view / edit / cancel *pending* requests; manager approve/reject
  (decisions are final – a small state machine).
- **Dashboards** – live statistics for managers; next shift, hours and leave status for employees.
- **PWA** – installable, service worker app-shell cache, roster and leave stored in IndexedDB per user,
  offline banner and automatic refresh on reconnect.
- **Push notifications** – new leave request → managers; leave decision → employee;
  shift created/updated/deleted → employee.

## 7. Documentation

| Document | Contents |
|---|---|
| [docs/REQUIREMENTS_CHECK.md](docs/REQUIREMENTS_CHECK.md) | **Compliance check against the official brief and rubric** |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Requirement tracker with evidence |
| [docs/DATABASE_REPLICATION.md](docs/DATABASE_REPLICATION.md) | Replica set + failover demo, Atlas, cluster scaling, HTTPS |
| [docs/API.md](docs/API.md) | Endpoint reference |
| [docs/UML.md](docs/UML.md) | Class, ER, sequence, state and architecture diagrams |
| [docs/DESIGN_PATTERNS.md](docs/DESIGN_PATTERNS.md) | Patterns and refactoring evidence |
| [docs/SECURITY.md](docs/SECURITY.md) | Security measures and tests |
| [docs/TESTING.md](docs/TESTING.md) | Automated + Postman test results |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Real problems, causes and fixes; debugger guide |
| [docs/PWA_AND_PUSH.md](docs/PWA_AND_PUSH.md) | Offline + notification demo scripts |
| [docs/PERSONAS_STORYBOARD.md](docs/PERSONAS_STORYBOARD.md) | Personas, user stories, storyboard |
| [docs/FIGMA_GUIDE.md](docs/FIGMA_GUIDE.md) | Design system + frame specs for Figma |
| [docs/FINAL_REPORT.md](docs/FINAL_REPORT.md) | **Final report** (source) – compiled to `ShiftManager_Final_Report.docx` / `.pdf` / `.html` |
| [docs/diagrams/](docs/diagrams/) | UML diagrams exported as PNG |
| [docs/screenshots/](docs/screenshots/) | Application screenshots used in the report |
| [docs/evidence/](docs/evidence/) | Raw test outputs (Jest, Vitest, smoke test, Newman) |
| [docs/VIVA_PREP.md](docs/VIVA_PREP.md) | Demo script and viva questions |
