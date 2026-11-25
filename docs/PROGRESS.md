# ShiftManager – Requirement Progress Tracker

Legend: ✅ done **and** verified with evidence · 🟡 implemented, needs your manual evidence (screenshot / your own work) · ⬜ not done

Last verified: 23 Nov 2026

## Step 9.6.2 – Empty shift GET + Update Shift (the paused task)

| Check | Result | Evidence |
|---|---|---|
| Inspect GET response, `count` and `shifts` | `count=0, shifts=[]` with HTTP 200 | Terminal output (TROUBLESHOOTING #5) |
| Manager authenticated? | Yes – 200 (not 401) | same |
| Records in MongoDB | `shifts` collection had **0 documents** | Direct DB query |
| Root cause | Empty collection, not a code bug; `Format-Table` prints nothing for `[]` | TROUBLESHOOTING #5 |
| Create shift + retrieve ID | `6b02ef5e86bd7e4d645a9c15`, GET count=1 | Terminal |
| Manager PUT | 200 – 10:00–18:00 Warehouse | Terminal + DB document |
| Confirm in MongoDB | updated fields + new `updatedAt` | DB query |
| Employee cannot update | 403 | Terminal |

## Roadmap status

| Step | Task | Status | Evidence |
|---|---|---|---|
| 9.6.2 | Resolve GET issue, test UPDATE | ✅ | above |
| 9.7 | Shift DELETE | ✅ | `shifts.test.js`, smoke test S17–S19 |
| 9.8 | Shift validation & permissions (real dates, times, overlap, overnight policy, invalid IDs, unknown fields, GET by ID) | ✅ | `shifts.test.js`, `validators.test.js` |
| 10–15 | LeaveRequest model, CRUD, approve/reject | ✅ | `leaves.test.js` |
| 16 | Leave tests & permissions | ✅ | 22 leave integration tests + smoke/Postman |
| 17–23 | React UI: login/register, dashboards, shifts, leave, validation, responsive | ✅ | E2E 13/13, Vitest 29/29 |
| 24–25 | PWA manifest, service worker, offline cache | ✅ implemented / 🟡 capture DevTools screenshots | `docs/PWA_AND_PUSH.md` |
| 26 | Push notifications | ✅ backend + client implemented & tested with fake strategy / 🟡 **real delivery must be demonstrated in Chrome/Edge** | `notifications.test.js` |
| 27 | Refactor with design patterns | ✅ | `docs/DESIGN_PATTERNS.md` |
| 28 | Security improvements | ✅ | `docs/SECURITY.md` |
| 29 | Unit/integration tests | ✅ | 128 + 29 tests |
| 30 | Postman testing | ✅ collection (Newman 70/70) / 🟡 Postman app screenshots | `postman/`, `docs/TESTING.md` |
| 31 | Debugging evidence | ✅ log written / 🟡 VS Code breakpoint screenshots | `docs/TROUBLESHOOTING.md` |
| 32 | Figma designs | 🟡 spec ready – **you must build in Figma** | `docs/FIGMA_GUIDE.md` |
| 33 | UML diagrams | ✅ Mermaid source + PNG exports | `docs/UML.md`, `docs/diagrams/` |
| 34 | Personas & storyboard | ✅ text / 🟡 draw storyboard frames | `docs/PERSONAS_STORYBOARD.md` |
| 35 | Final report | ✅ compiled (31 pages, 8 diagrams + 17 app screenshots embedded) / 🟡 fill «…» fields, add your own screenshots, **write your reflection** | `docs/ShiftManager_Final_Report.docx` (source `docs/FINAL_REPORT.md`) |
| 36 | GitHub + ZIP | 🟡 local git ready – push to your GitHub; ZIP script provided | `scripts/make-submission-zip.ps1` |
| 37 | Viva rehearsal | 🟡 | `docs/VIVA_PREP.md` |

## Assessment criteria mapping

| Criterion (marks) | Implementation | Status |
|---|---|---|
| Environment setup & config (5) | README setup, `.env.example`, vite config, package scripts, launch.json | ✅ / 🟡 setup screenshots |
| Frontend & validation (10) | 5 pages, role-based UI, client validation, loading/empty/error/success states, confirmations, responsive | ✅ |
| Secure auth/authorization (10) | bcrypt, JWT, DB role check, role middleware, ownership, escalation block, rate limit | ✅ |
| Backend CRUD & MongoDB (10) | Shift CRUD + Leave CRUD + approvals, 4 collections | ✅ |
| Push API (10) | VAPID, subscription API, SW push handler, 3 event scenarios, expired-subscription cleanup | ✅ code + tests / 🟡 live demo screenshots |
| Design patterns & refactoring (10) | Repository, Observer, Strategy, layered architecture, before/after | ✅ |
| Developer & unit testing (5) | 128 backend + 29 frontend tests | ✅ / 🟡 screenshots |
| Debugging & troubleshooting (5) | Logger, error handler, 13 documented issues, debugger guide | ✅ / 🟡 debugger screenshots |
| Additional features (5) | **3-node MongoDB replica set with tested failover**, cluster scaling, optional HTTPS, compression, conflict detection, filters, dashboard statistics, rate limiting | ✅ / 🟡 Docker screenshots |
| Viva (10) | `docs/VIVA_PREP.md` | 🟡 rehearse |
| Documentation (20) | Report draft, UML, personas, storyboard, Figma guide | 🟡 your Figma + screenshots + reflection |

## What only you can do (in priority order)

1. **Push demo in Chrome/Edge** (`docs/PWA_AND_PUSH.md` §5) – screenshot the three notifications.
2. **Screenshots** marked **[ADD SCREENSHOT]** in `docs/ShiftManager_Final_Report.docx` (environment setup, Compass, Postman app, DevTools Application tab, tests in terminal, VS Code debugger, GitHub). App screenshots and UML diagrams are already embedded.
3. **Figma** high-fidelity frames (`docs/FIGMA_GUIDE.md`).
4. **Personal reflection** (must be your own words).
5. **GitHub**: create an empty repo, then `git remote add origin <url>; git push -u origin main`.
6. Confirm the Moodle deadline, then build the ZIP with `scripts/make-submission-zip.ps1`.
