# Design Patterns and Refactoring

## 1. The original problem

Before refactoring, all logic lived inside the route files:

```js
// routes/shiftRoutes.js (BEFORE – ~250 lines)
router.put("/:id", protect, authorizeRoles("manager"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {            // validation
      return res.status(400).json({ message: "Invalid shift ID" });
    }
    const shift = await Shift.findById(id);           // database access
    ...
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;  // regex repeated in POST and PUT
    ...
    if (shift.endTime <= shift.startTime) { ... }     // business rule
    await shift.save();
    return res.status(200).json({ ... });             // HTTP response
  } catch (error) {
    console.error("Update shift error:", error.message);
    return res.status(500).json({ message: "Failed to update shift" });
  }
});
```

Problems:

| Problem | Effect |
|---|---|
| HTTP, validation, business rules and database code mixed in one function | Hard to read and explain; a change in one concern risks breaking others |
| Same regexes and checks copied into POST and PUT | Rules can drift apart (e.g. update allowed dates that create rejected) |
| `try/catch` + `res.status(500)` repeated in every route | Lots of boilerplate; inconsistent error messages |
| `server.js` both built the app and connected/listened | The app could not be imported by Supertest without starting a real server |
| No overlap check, no real-date check (2026-02-30 accepted) | Business rules missing |
| Adding notifications would require editing every route | Tight coupling |

## 2. The refactored structure (layered architecture)

```
Request → routes/ → middleware/ → controllers/ → services/ → repositories/ → models/ → MongoDB
                                                    │
                                                    └─ events/eventBus ─► notificationListeners ─► notificationService ─► strategy
```

| Layer | Responsibility | Example |
|---|---|---|
| Route | URL + which middleware applies | `router.put("/:id", authorizeRoles("manager"), shiftController.updateShift)` |
| Middleware | Cross-cutting checks | `authMiddleware.js`, `roleMiddleware.js`, `sanitizeMiddleware.js`, `errorMiddleware.js` |
| Controller | Read `req`, call service, send `res` | [shiftController.js](../backend/controllers/shiftController.js) – 5 short functions |
| Service | Business rules | [shiftService.js](../backend/services/shiftService.js) – validation, conflicts, events |
| Repository | Database queries only | [shiftRepository.js](../backend/repositories/shiftRepository.js) |
| Utils | Pure reusable functions | [validators.js](../backend/utils/validators.js) – shared by create and update |

After:

```js
// controllers/shiftController.js (AFTER)
exports.updateShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.updateShift(req.params.id, req.body);
  res.status(200).json({ message: "Shift updated successfully", shift });
});
```

Errors are thrown as `new AppError("Shift not found", 404)` and converted to JSON in one place
([errorMiddleware.js](../backend/middleware/errorMiddleware.js)).

---

## 3. Pattern 1 – Repository

**Where:** `backend/repositories/` (`shiftRepository`, `leaveRepository`, `userRepository`, `subscriptionRepository`)

**How it works:** services never call Mongoose directly; they call methods with meaningful names:

```js
// services/shiftService.js
const sameDay = await shiftRepository.findForEmployeeOnDate(employeeId, date, excludeId);
```

```js
// repositories/shiftRepository.js
findForEmployeeOnDate(employeeId, date, excludeId) {
  const filter = { employeeId, date };
  if (excludeId) filter._id = { $ne: excludeId };
  return Shift.find(filter);
}
```

**Why it fits:** ShiftManager has several queries that are reused (populate employee name/email,
sorted lists, overlap queries, dashboard counts). Keeping them in one place means:

- Business logic reads like plain English.
- Query details (populate, sort, indexes) change in one file.
- Changing the database (e.g. to MongoDB Atlas or another DB) only affects repositories.
- Queries are always built from validated values – safer.

## 4. Pattern 2 – Observer (event-driven)

**Where:** [events/eventBus.js](../backend/events/eventBus.js) (Node `EventEmitter`) and
[events/notificationListeners.js](../backend/events/notificationListeners.js)

**How it works:**

1. The service finishes the main job and **publishes** an event:
   ```js
   eventBus.emit(EVENTS.LEAVE_REVIEWED, { leave: reviewed });
   ```
2. A listener registered at start-up **reacts** to it:
   ```js
   eventBus.on(EVENTS.LEAVE_REVIEWED, safe(({ leave }) =>
     notificationService.notifyUsers([idOf(leave.employeeId)], { title: `Leave ${leave.status}`, ... })
   ));
   ```

**Why it fits:** the three notification scenarios (new leave → manager, decision → employee,
shift change → employee) are *side effects*. The leave service should not know about push
notifications. Benefits:

- Low coupling – `leaveService.js` has no push code.
- A slow/failed push never fails the HTTP request (listeners run asynchronously, errors are logged).
- Extensible – an audit log or email listener can be added without touching the services.

## 5. Pattern 3 – Strategy

**Where:** [services/notificationStrategies.js](../backend/services/notificationStrategies.js),
used by [services/notificationService.js](../backend/services/notificationService.js)

**How it works:** every delivery strategy has the same method `send(subscription, payload)`.

| Strategy | Used when |
|---|---|
| `WebPushStrategy` | VAPID keys configured (normal running) – sends encrypted Web Push |
| `ConsoleStrategy` | No VAPID keys / test environment – logs instead of sending |
| Fake strategy | Injected by tests with `notificationService.setStrategy(fake)` |

```js
await strategy.send(sub, payload);   // notificationService does not care which strategy it is
```

**Why it fits:** delivery genuinely varies by environment. Tests can verify *who* would be notified
without contacting real push services (see `tests/integration/notifications.test.js`), and a new
channel (e.g. SMS/email) is just another class with `send()`.

## 6. Supporting patterns / techniques

| Technique | Where | Benefit |
|---|---|---|
| Middleware chain (Chain of Responsibility) | `protect → authorizeRoles → controller` | Each check is small and reusable |
| Higher-order function | `authorizeRoles("manager")`, `asyncHandler(fn)` | Configurable, removes try/catch duplication |
| Centralised error handling | `AppError` + `errorHandler` | Consistent, safe error responses |
| State machine | `leaveService.canTransition()` | Clear, testable approval rules |
| Frontend: Context + custom hooks | `AuthProvider/useAuth`, `useCachedResource` | Shared login state; offline logic written once and reused by every page |
| Frontend: API service layer | `src/api/client.js`, `services.js` | Components never build fetch calls themselves |

## 7. Evidence that behaviour was preserved

- The original manual tests from Step 9.6.2 (create, GET, PUT, employee 403, invalid ID, end-before-start)
  were re-run against the refactored API in `scripts/api-smoke-test.ps1` – **68/68 pass**.
- 128 Jest tests pass after refactoring (`docs/evidence/backend-jest-results.txt`).
- `[Screenshot placeholder: VS Code explorer showing the backend folder structure before/after]`
- `[Screenshot placeholder: npm test output – 128 passed]`

## 8. Viva questions

- **Why not put the queries in the controller?** Controllers handle HTTP only; mixing DB code makes them hard to test and reuse.
- **What would break if notifications failed?** Nothing in the main operation – listeners run after the response and errors are caught (`safe()` wrapper).
- **How do tests avoid sending real push messages?** Strategy pattern – the test injects a fake strategy.
- **Is a Repository overkill with Mongoose?** Mongoose is already an abstraction, but the repository gives *domain-specific* query names (e.g. `findOverlapping`) and keeps populate/sort rules consistent.
