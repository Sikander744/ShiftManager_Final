# Personas, User Stories and Storyboard

## 1. Personas

### Persona 1 – Maria Tane, Café Manager (primary manager persona)

| | |
|---|---|
| **Age / location** | 41, Hamilton, New Zealand |
| **Role** | Owner-manager of "Kōwhai Café & Bakery" – 14 casual and part-time staff |
| **Tech comfort** | Medium. Uses a laptop in the office and her phone on the café floor |
| **Quote** | *"I spend Sunday nights fixing the roster spreadsheet and still someone turns up at the wrong time."* |
| **Goals** | Build next week's roster quickly · avoid double-booking staff · approve or reject leave fast · see who is working today at a glance |
| **Needs** | One place for shifts and leave · warnings about clashes · a notification when someone requests leave · works on her phone |
| **Pain points** | Spreadsheet versions emailed around · leave requests lost in Messenger/texts · accidentally rostering someone twice · staff claim they "never saw the change" |
| **How ShiftManager helps** | Manager dashboard with live counts; conflict detection (409) when creating/updating shifts; push notification for new leave; one-click approve/reject with confirmation; employees are notified automatically |

### Persona 2 – Ethan Liu, Part-time Barista (primary employee persona)

| | |
|---|---|
| **Age / location** | 20, university student, Hamilton |
| **Role** | Part-time barista, 15–25 hours/week around lectures |
| **Tech comfort** | High. Mostly uses his phone; patchy mobile data on the bus |
| **Quote** | *"I just want to know when I'm working – and whether my leave for exams got approved."* |
| **Goals** | Check upcoming shifts anywhere · request leave for exams and family events · know the decision quickly |
| **Needs** | Mobile-friendly roster · works offline · clear status (pending/approved/rejected) · alerts when a shift changes |
| **Pain points** | Screenshot of an old roster leads to missed shifts · no record of leave requests · finds out about changes too late |
| **How ShiftManager helps** | "My Shifts" saved for offline viewing; "Next shift" card; leave history with status badges; edit/cancel while pending; push notifications for shift changes and decisions |

`[Optional: add a photo/illustration and format each persona as a one-page card in Figma]`

## 2. User stories and acceptance criteria

| ID | As a… | I want to… | So that… | Acceptance criteria (implemented) |
|---|---|---|---|---|
| US1 | employee | register and log in | I can access my own information | Register requires name, valid email, 8+ char password; account is always *employee*; login returns to my dashboard |
| US2 | manager | create a shift for an employee | the roster is up to date | Only managers; employee must exist; real date; end after start; location required; overlapping shift rejected with a clear message |
| US3 | manager | edit or delete shifts | I can respond to changes | Edit pre-fills the form; delete asks for confirmation; employee is notified |
| US4 | employee | see only my shifts, even offline | I always know when I work | List shows only my shifts; last loaded data visible offline with an "offline" notice |
| US5 | employee | submit, edit and cancel leave requests | I can plan time off | End date ≥ start date; new requests are *pending*; edit/cancel only while pending |
| US6 | manager | approve or reject leave | staff get a decision quickly | Only managers; decision is final; reviewer and time recorded |
| US7 | employee | get notified about decisions and shift changes | I don't miss updates | Push notification after approve/reject and shift create/update/delete |
| US8 | manager | be notified of new leave requests | I can respond promptly | Push notification to managers when an employee submits leave |
| US9 | any user | log out | others on the device can't see my data | Token, offline data and push subscription removed |

## 3. Storyboard – "Ethan requests leave for exams"

| Panel | Scene | User action | System response | Emotion |
|---|---|---|---|---|
| **1. Sign in** | Ethan on the bus, phone in hand | Opens the ShiftManager app icon from his home screen, signs in | Employee dashboard: "Welcome, Ethan 👋" and a big **Next shift** card (Tue 09:00–17:00, Front Desk) | Relieved – it's all in one place |
| **2. Checks shifts** | Bus goes through an area with no signal | Opens **My Shifts** | Yellow banner "You are offline"; roster still shows from the last sync with "Offline mode – showing data saved on…" | Confident – no more old screenshots |
| **3. Submits leave** | Back online at university | **My Leave** → start 10 Dec, end 12 Dec, reason "University exams" → Submit | Green "Leave request submitted. Your manager has been notified." Row appears with an orange **pending** badge | Hopeful |
| **4. Manager notified** | Maria behind the café counter | Her phone shows a notification: "New leave request – Ethan Employee requested leave 2026-12-10 to 2026-12-12"; she taps it | App opens on **Leave Approvals** with the request at the top of the Pending tab | Informed – nothing gets lost |
| **5. Manager approves** | Maria checks the roster for those dates | Clicks **Approve** → confirmation dialog → Approve | "Request approved. Ethan Employee has been notified." Request moves to the Approved tab | In control |
| **6. Employee notified** | Ethan in the library | Notification: "Leave approved – Your leave 2026-12-10 to 2026-12-12 was approved"; taps it | **My Leave** shows a green **approved** badge with "Maria Manager, 23/11/2026" | Happy – can focus on exams |

Drawing tips for the storyboard: six frames in a 3×2 grid; show the phone/laptop screen in each frame
(use your Figma screens), a short caption underneath, and arrows between frames. Use the same colours
as the app (indigo #4f46e5, success green, warning orange).

`[Screenshot placeholder: storyboard image exported from Figma / drawn]`
