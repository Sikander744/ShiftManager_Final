# Figma High-Fidelity Design Guide

I can't create the Figma file for you – Figma work must be done in your own account – but this guide gives
you an exact specification that matches the implemented app, so your designs and screenshots agree.

**Fast approach (≈2–3 hours):**
1. Run the app (`npm run preview` → http://localhost:4173) and take full-page screenshots of each screen
   at desktop (1440 px) and mobile (390 px) widths.
2. In Figma create a file "ShiftManager – High Fidelity", add the styles below, and rebuild each screen
   with real frames, auto-layout and components (place the screenshot at 30% opacity underneath as a guide,
   then delete it). A plugin such as *html.to.design* can also import a live page as editable layers –
   if you use it, say so in your report and then refine the result.

## 1. Design tokens (create as Figma Styles / Variables)

### Colours

| Token | Hex | Use |
|---|---|---|
| Primary | `#4F46E5` | Buttons, active nav, links |
| Primary dark | `#3730A3` | Hover, calendar header |
| Primary soft | `#EEF2FF` | Time pills, selected row |
| Navy | `#1E1B4B` | Top bar, auth hero gradient start |
| Success | `#16A34A` / soft `#DCFCE7` | Approve, approved badge |
| Warning | `#D97706` / soft `#FEF3C7` | Pending badge, offline banner |
| Danger | `#DC2626` / soft `#FEE2E2` | Delete/Reject, errors |
| Info | `#0284C7` / soft `#E0F2FE` | "changed" badge, info stat |
| Background | `#F5F7FB` | Page background |
| Surface | `#FFFFFF` | Cards, inputs |
| Text | `#0F172A` | Body text |
| Muted | `#64748B` | Secondary text, table headers |
| Border | `#E2E8F0` | Card borders, table lines |

### Typography (Inter – fall back to Segoe UI)

| Style | Size / weight / line height |
|---|---|
| H1 page title | 26 / Bold / 32 |
| H2 card title | 18 / Bold / 24 |
| Body | 16 / Regular / 24 |
| Label | 14 / SemiBold / 20 |
| Table header | 12 / Bold / 16, uppercase, letter-spacing 5% |
| Stat value | 30 / Bold / 36 |
| Badge | 12 / Bold, capitalised |

### Spacing, radius, shadow

- 8 px grid (4, 8, 12, 16, 24, 32, 48)
- Radius: cards & modals 12 px; buttons & inputs 8 px; badges/pills 999 px
- Card shadow: `0 1 2 rgba(15,23,42,.06)` + `0 4 16 rgba(15,23,42,.06)`
- Layout: max content width 1200 px, 24 px gutters; mobile 12–16 px padding

## 2. Components (create as Figma components with variants)

| Component | Variants |
|---|---|
| Button | Primary / Success / Danger / Ghost × Default / Hover / Disabled × Regular (10/16 padding) / Small (6/12) |
| Input field | Default / Focus (indigo border + 3 px `#C7D2FE` ring) / Error (red border + message) – with label and hint |
| Select, Date, Time, Textarea | same states as input |
| Badge | pending / approved / rejected / changed |
| Stat card | Primary / Info / Warning / Success (4 px coloured left border) |
| Alert | Success / Error / Warning / Info, with dismiss × |
| Top bar | Desktop (logo, nav links, notification toggle, user chip + role tag, Log out) / Mobile (logo + ☰) |
| Table row | Default / Hover / Selected; Mobile stacked-card version |
| Confirm dialog | Danger / Success |
| Empty state | 🗓️ icon, title, message |
| Time pill | "09:00–17:00" |

## 3. Frames to design

Desktop 1440 × 1024 and Mobile 390 × 844 for each.

| # | Frame | Content (match the implemented app) |
|---|---|---|
| 1 | **Login** | Left: navy→indigo gradient hero with app icon, "Rosters and leave, all in one place." Right: "Sign in" card – Email, Password, primary button, "New employee? Create an account". Variant with validation errors |
| 2 | **Register** | Same layout; Full name, Email, Password (hint "At least 8 characters"), Confirm password; note "Manager accounts are set up by an administrator" |
| 3 | **Manager dashboard** | Title "Manager dashboard", "+ Create shift" button; 3 stat cards (Total employees, Upcoming shifts, Pending leave); two cards: Upcoming shifts list (name, date · location, time pill) and Pending leave requests (name, dates, reason, Approve/Reject) |
| 4 | **Employee dashboard** | "Welcome, Ethan 👋", "+ Request leave"; indigo gradient **Next shift** card; 4 stat cards; My upcoming shifts; My leave requests with badges |
| 5 | **Shift management (manager)** | Left: Create/Edit shift form (Employee select, Date, Start/End time side by side, Location, buttons). Right: Roster card with filters (Employee, From, To, Show all) and table (Date, Employee, Time, Hours, Location, Edit/Delete) |
| 6 | **Delete confirmation** | Modal over the roster: "Delete this shift?", details, Cancel / Delete shift |
| 7 | **My shifts (employee)** | Upcoming/Past segmented control, read-only table with "changed" badge |
| 8 | **My leave (employee)** | Request form (Start, End, "3 days requested", Reason with counter) + history table with badges, Edit/Cancel for pending, "Final" for reviewed |
| 9 | **Leave approvals (manager)** | Segmented tabs Pending/Approved/Rejected/All; table with employee name + email, dates, days, reason, status, submitted, Approve/Reject |
| 10 | **Offline state** | My Shifts with yellow "You are offline" banner and "Offline mode – showing data saved on…" alert |
| 11 | **Push notification** | Mock of a Windows/Android notification "Leave approved" with app icon |

## 4. Prototype links (for the demo)

Login → Dashboard (by role) → Shifts / Leave via nav; Delete → Confirm dialog → back; Approve → dialog
→ success alert. Present the prototype in your report with screenshots of each frame and a link to
the Figma file (set sharing to "Anyone with the link can view").

## 5. Accessibility notes to mention

Colour contrast of text ≥ 4.5:1 (e.g. white on `#4F46E5` = 6.3:1); every input has a visible label;
error messages in text (not colour only); focus ring visible; touch targets ≥ 36 px; tables become
stacked cards on mobile.
