# Requirements Compliance Check – against the official brief and rubric

Source: *IA730001 Final Project and Marking Rubric 2026 Block 04* (the uploaded Word document).
Checked: 23 Nov 2026.

Legend: ✅ met and evidenced in the project · 🟡 implemented, but **you** must add evidence (screenshot / your own work) · ❌ not met

## 1. Assessment brief

| # | Requirement (from the brief) | Status | Where / evidence |
|---|---|---|---|
| B1 | At least **two features**, defined through **user stories** | ✅ | Shift management + Leave management; user stories US1–US9 in `PERSONAS_STORYBOARD.md` and report §6 |
| B2 | Both **frontend and backend** components | ✅ | React app (`frontend/`), Express API (`backend/`) |
| B3 | Each feature supports full **CRUD** | ✅ | Shifts: POST/GET/PUT/DELETE · Leave: POST/GET/PUT/DELETE + PATCH status |
| B4 | **NoSQL database** (MongoDB) | ✅ | Mongoose models; 4 collections |
| B5 | **Secure authentication and authorization** | ✅ | JWT + bcrypt, role + ownership checks (`SECURITY.md`) |
| B6 | **Offline access** (caching or IndexedDB) | ✅ | Service worker cache + IndexedDB; offline test passed; Figure 25 |
| B7 | **Secure data communication** frontend ↔ backend | ✅ | Optional **HTTPS/TLS** backend (`npm run cert`, `HTTPS_KEY_FILE`/`HTTPS_CERT_FILE`), helmet headers, CORS whitelist, JWT bearer tokens, encrypted push payloads. Local dev uses `http://localhost` (a browser "secure context") |
| B8 | Backend **independently testable with Postman**, with screenshots and explanations in the report | ✅ / 🟡 | Collection: 61 requests, 70 assertions, 0 failed (Newman). **Add Postman app screenshots** |
| B9 | **Secure messaging** (push notifications) | ✅ / 🟡 | VAPID Web Push, 3 scenarios, tests. **Add live notification screenshots** |
| B10 | Code **refactored with design patterns**, considering modifiability, scalability, performance, extensibility | ✅ | Repository, Observer, Strategy (`DESIGN_PATTERNS.md`); quality-attribute mapping in §3 below and report §23 |
| B11 | Each functionality tested with **meaningful developer test cases** | ✅ | 128 backend + 29 frontend tests |
| B12 | **Coding conventions / industry standards** | ✅ | ESLint on frontend **and backend** (0 problems), layered structure, comments, `.env` config |
| B13 | Bonus: **database replication and scaling** | ✅ | 3-node MongoDB replica set (Docker) with tested failover; Node cluster mode; Atlas guide (`DATABASE_REPLICATION.md`) |
| B14 | Every step documented in the final report **with clear screenshots** | 🟡 | Report has 17 app screenshots + 8 diagrams; **you must add** the [ADD SCREENSHOT] items |
| B15 | Web-based full-stack app using **React** with **PWA** capabilities | ✅ | React 19 + manifest + service worker |
| B16 | Quality attributes: availability, extensibility, performance, modifiability, scalability, security | ✅ | §3 below |

## 2. Tasks 01–08

| Task | Requirement | Status | Notes |
|---|---|---|---|
| 01 | Screenshots of commands used to **set up frontend and backend** | 🟡 | Commands are in report §8. **Take screenshots** of you running them (e.g. `npm create vite@latest`, `npm install …`, `npm start`) |
| 01 | TypeScript or JavaScript | ✅ | JavaScript |
| 02 | Config files: service worker, SW registration, auth utility, Vite config, package.json, .env | ✅ / 🟡 | All exist (report §9). **Screenshot them** in VS Code (show `.env.example`, never your real secrets) |
| 03 | UIs, authentication/authorization, validations | ✅ | Figures 9–24 |
| 03 | Offline access (proper caching) | ✅ | |
| 03 | **Screenshots of browser cache usage** | 🟡 | DevTools → Application → Cache storage + IndexedDB (steps in `PWA_AND_PUSH.md` §3) |
| 04 | CRUD in NoSQL | ✅ | |
| 04 | Local or Cloud MongoDB | ✅ | Local MongoDB + local replica set |
| 04 | Optional: screenshots of **replication/scaling configuration** (bonus) | ✅ / 🟡 | Text evidence in `docs/evidence/replication-failover-demo.txt`. **Screenshot** Docker Desktop containers + the demo output (and Atlas if you use it) |
| 05 | Frontend push service and notifications | ✅ | `pushService.js`, `NotificationToggle.jsx`, `sw.js` |
| 05 | **Secure encrypted keys generated and stored** | ✅ | VAPID keys in `.env` (private key server-only, git-ignored); push payloads encrypted with p256dh/auth keys |
| 05 | **Scenario testable through Postman** | ✅ | Postman "4 Notifications" folder: public key, subscribe (401/400), test trigger (403 employee / 200 or 404 manager) |
| 06 | Unit tests with **assertions**, meaningful values | ✅ | |
| 07 | **Loggers** | ✅ | `utils/logger.js`, `middleware/requestLogger.js` |
| 07 | **Debugging screenshots with variable watchers** | 🟡 | VS Code breakpoint + WATCH panel (`TROUBLESHOOTING.md` – "How to use the VS Code debugger") |
| 07 | How you addressed challenges, isolated root causes, fixed runtime errors | ✅ | 15 documented problems (report §26) |
| 08 | UML class + sequence diagrams | ✅ | Figures 3–7 |
| 08 | **Figma high-fidelity wireframes** | ❌ → 🟡 | **Not done – you must create these in Figma** (`FIGMA_GUIDE.md`) |
| 08 | Persona and storyboard | ✅ / 🟡 | Written; ideally draw the storyboard frames |
| 08 | Screenshots: environment, Postman, working app, cloud/config, debug | 🟡 | Working app ✅; others to add |
| 08 | Explanations of error handling and challenges | ✅ | |
| 08 | **Your own reflection** | ❌ → 🟡 | **Must be written by you** (report §30) |
| 08 | **GitHub URL** | 🟡 | Commit + push, then add the URL |

## 3. Quality attributes (brief objective + design-pattern criterion)

| Attribute | How ShiftManager addresses it |
|---|---|
| **Availability** | MongoDB replica set with automatic failover (demonstrated); Node cluster restarts crashed workers; PWA works offline; push failures never break requests |
| **Scalability** | Stateless JWT API → can run many instances (`npm run start:cluster` uses all CPU cores); connection pooling (`MONGO_MAX_POOL_SIZE`); read scaling with `MONGO_READ_PREFERENCE=secondaryPreferred`; Atlas-ready connection string |
| **Performance** | gzip compression, compound index `{employeeId, date}`, small JSON payloads (10 kB limit), service-worker caching, ~93 kB gzipped JS bundle |
| **Modifiability** | Layered architecture; Repository pattern isolates DB code; validators shared by create/update |
| **Extensibility** | Observer pattern – new listeners (audit log, email) without touching services; Strategy pattern – new delivery channels |
| **Security** | `SECURITY.md` – bcrypt, JWT, DB role check, ownership, whitelisting, NoSQL-injection filter, helmet, CORS, rate limiting, optional HTTPS |

## 4. Marking rubric – self-assessment of the *code*

| Criterion | Marks | Assessment |
|---|---:|---|
| Environment setup and configuration | 5 | Code/config complete – screenshots needed |
| Frontend UI/UX (2 features) + validations | 10 | Complete |
| Secure authentication/authorization (JWT) | 10 | Complete – include config evidence |
| Backend CRUD, MongoDB with data, Postman | 10 | Complete – Postman screenshots needed |
| Secure messaging with Push API | 10 | Complete – live notification screenshots needed |
| Design patterns and refactoring | 10 | Complete |
| Developer tests and unit testing | 5 | Complete |
| Troubleshooting/debugging and reflection on challenges | 5 | Complete – debugger screenshots needed |
| Additional features (replication/scaling, extras) | 5 | Replica set + failover, cluster, conflict detection, filters, dashboards, HTTPS option |
| Code defence and viva | 10 | **Depends on you** – `VIVA_PREP.md` |
| Reports (design 10 + final 10) | 20 | Diagrams ✅; **Figma, screenshots, reflection needed** |

## 5. ⚠️ Responsible use of AI (from the brief)

The brief says students **must not** "submit AI generated code as original work" or create assets
"without disclosure", and must not use AI to generate content that forms core assessment requirements
or the reflection. Much of this project's code and documentation was produced with AI assistance.

What you should do:

1. **Disclose it honestly** in the report – a declaration section has been added (report §34) for
   you to complete truthfully.
2. **Talk to your lecturer before submitting** about what level of AI assistance is acceptable for this
   assessment.
3. **Understand every part of the code** – the viva (10 marks) tests whether the solution is your own
   and whether you can explain it. Use `VIVA_PREP.md`, the debugger and the tests to learn it.
4. **Write the reflection and the report explanations in your own words.**

## 6. Submission format

| Requirement | Status |
|---|---|
| ZIP of implemented source code, all source code in a `src` folder | ✅ `scripts/make-submission-zip.ps1` puts the whole project under `src/` (no `node_modules`, no `.env`, no certificates) |
| Final report included | ✅ the script adds `ShiftManager_Final_Report.docx` (and PDF) at the ZIP root |
| Name `<StudentID>-<Name>.zip` | ✅ script parameters |
| Upload via Moodle before the deadline | 🟡 you |
