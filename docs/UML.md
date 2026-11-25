# ShiftManager – UML and Architecture Diagrams

> These diagrams are written in Mermaid. They render in VS Code (Markdown Preview Mermaid extension),
> GitHub, or at https://mermaid.live where you can export PNG/SVG for the Design Report.

## 1. UML class diagram (domain model)

```mermaid
classDiagram
    direction LR
    class User {
        +ObjectId _id
        +String name
        +String email  «unique»
        -String passwordHash  «select:false»
        +String role  «employee | manager»
        +Date createdAt
        +Date updatedAt
    }
    class Shift {
        +ObjectId _id
        +ObjectId employeeId
        +String date  «YYYY-MM-DD»
        +String startTime  «HH:mm»
        +String endTime  «HH:mm»
        +String location
        +Date createdAt
        +Date updatedAt
    }
    class LeaveRequest {
        +ObjectId _id
        +ObjectId employeeId
        +String startDate
        +String endDate
        +String reason
        +String status  «pending | approved | rejected»
        +ObjectId reviewedBy
        +Date reviewedAt
        +Date createdAt
        +Date updatedAt
    }
    class PushSubscription {
        +ObjectId _id
        +ObjectId userId
        +String endpoint  «unique»
        +String keys.p256dh
        +String keys.auth
        +Date createdAt
        +Date updatedAt
    }
    User "1" --> "0..*" Shift : is assigned
    User "1" --> "0..*" LeaveRequest : submits
    User "1" --> "0..*" LeaveRequest : reviews (manager)
    User "1" --> "0..*" PushSubscription : owns
```

## 2. UML class diagram (backend layers and design patterns)

```mermaid
classDiagram
    direction TB
    class ShiftController {
        +createShift(req, res)
        +getShifts(req, res)
        +getShiftById(req, res)
        +updateShift(req, res)
        +deleteShift(req, res)
    }
    class ShiftService {
        +createShift(body)
        +listShifts(user, query)
        +getShift(user, id)
        +updateShift(id, body)
        +deleteShift(id)
        -assertNoConflict(shift, excludeId)
    }
    class LeaveService {
        +createLeave(user, body)
        +listLeaves(user, query)
        +updateLeave(user, id, body)
        +cancelLeave(user, id)
        +reviewLeave(manager, id, body)
        +canTransition(from, to) bool
    }
    class ShiftRepository {
        +create(data)
        +findById(id)
        +findMany(filter)
        +findForEmployeeOnDate(employeeId, date, excludeId)
        +save(doc)
        +deleteById(id)
    }
    class LeaveRepository {
        +create(data)
        +findMany(filter)
        +findOverlapping(employeeId, start, end, excludeId)
        +save(doc)
        +deleteById(id)
    }
    class EventBus {
        <<EventEmitter>>
        +emit(event, data)
        +on(event, listener)
    }
    class NotificationListeners {
        +registerNotificationListeners()
    }
    class NotificationService {
        -strategy
        +setStrategy(strategy)
        +subscribe(user, body)
        +notifyUsers(userIds, payload)
        +notifyManagers(payload)
    }
    class DeliveryStrategy {
        <<interface>>
        +send(subscription, payload)
    }
    class WebPushStrategy
    class ConsoleStrategy
    ShiftController --> ShiftService
    ShiftService --> ShiftRepository : Repository pattern
    LeaveService --> LeaveRepository : Repository pattern
    ShiftService ..> EventBus : publishes shift.*
    LeaveService ..> EventBus : publishes leave.*
    NotificationListeners ..> EventBus : subscribes (Observer)
    NotificationListeners --> NotificationService
    NotificationService --> DeliveryStrategy : Strategy pattern
    DeliveryStrategy <|.. WebPushStrategy
    DeliveryStrategy <|.. ConsoleStrategy
```

## 3. Entity-relationship diagram (MongoDB collections)

```mermaid
erDiagram
    USERS ||--o{ SHIFTS : "employeeId"
    USERS ||--o{ LEAVEREQUESTS : "employeeId"
    USERS |o--o{ LEAVEREQUESTS : "reviewedBy"
    USERS ||--o{ PUSHSUBSCRIPTIONS : "userId"
    USERS {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role
    }
    SHIFTS {
        ObjectId _id PK
        ObjectId employeeId FK
        string date
        string startTime
        string endTime
        string location
    }
    LEAVEREQUESTS {
        ObjectId _id PK
        ObjectId employeeId FK
        string startDate
        string endDate
        string reason
        string status
        ObjectId reviewedBy FK
        date reviewedAt
    }
    PUSHSUBSCRIPTIONS {
        ObjectId _id PK
        ObjectId userId FK
        string endpoint UK
        string keys_p256dh
        string keys_auth
    }
```

## 4. Sequence diagram – Login

```mermaid
sequenceDiagram
    actor U as User
    participant R as React (LoginPage + AuthContext)
    participant A as Express /api/auth/login
    participant S as authService
    participant DB as MongoDB (users)
    U->>R: Enter email + password, click Sign in
    R->>R: validateLogin() – required fields, email format
    alt invalid form
        R-->>U: Inline error messages (no request sent)
    else valid
        R->>A: POST /api/auth/login {email, password}
        A->>A: rateLimit + sanitizeRequest ($ operators blocked)
        A->>S: login(body)
        S->>DB: findOne({email}).select("+passwordHash")
        DB-->>S: user document
        S->>S: bcrypt.compare(password, passwordHash)
        alt wrong email or password
            S-->>A: AppError 401
            A-->>R: 401 "Invalid email or password"
            R-->>U: Error alert
        else correct
            S->>S: jwt.sign({id, role}, JWT_SECRET, expiresIn 1h)
            S-->>A: {token, user}
            A-->>R: 200 {token, user}
            R->>R: Save token + user (localStorage), set user state
            R-->>U: Redirect to role-based dashboard
        end
    end
```

## 5. Sequence diagram – Manager creates a shift

```mermaid
sequenceDiagram
    actor M as Manager
    participant R as React ShiftsPage
    participant API as Express /api/shifts
    participant MW as protect + authorizeRoles("manager")
    participant SS as shiftService
    participant Repo as shiftRepository
    participant DB as MongoDB
    participant EB as eventBus
    participant NS as notificationService
    actor E as Employee device
    M->>R: Fill form (employee, date, times, location)
    R->>R: validateShift() – end after start, required fields
    R->>API: POST /api/shifts + Bearer token
    API->>MW: verify JWT, load current role from DB
    alt not a manager
        MW-->>R: 403 Access denied
    end
    MW->>SS: createShift(body)
    SS->>SS: reject unknown fields, validate date/time/location
    SS->>DB: User.findById(employeeId) – must be role employee
    SS->>Repo: findForEmployeeOnDate(employeeId, date)
    Repo->>DB: find({employeeId, date})
    DB-->>Repo: same-day shifts
    alt overlap found
        SS-->>R: 409 "Shift conflicts with an existing shift"
        R-->>M: Red error alert
    else no overlap
        SS->>Repo: create(shift)
        Repo->>DB: insertOne
        SS->>EB: emit("shift.created", shift)
        SS-->>API: shift
        API-->>R: 201 Shift created
        R-->>M: Success alert + refreshed roster
        EB-)NS: listener: notifyUsers([employeeId])
        NS-)E: Web Push "New shift assigned"
    end
```

## 6. Sequence diagram – Employee submits leave, manager approves

```mermaid
sequenceDiagram
    actor E as Employee
    participant RE as React (employee)
    participant API as Express /api/leaves
    participant LS as leaveService
    participant DB as MongoDB
    participant EB as eventBus
    participant NS as notificationService
    participant SW as Service workers
    actor M as Manager
    participant RM as React (manager)
    E->>RE: Enter dates + reason, Submit
    RE->>RE: validateLeave() – end ≥ start, reason required
    RE->>API: POST /api/leaves (Bearer employee token)
    API->>LS: createLeave(user, body)
    LS->>DB: findOverlapping(pending/approved)
    LS->>DB: create {employeeId: user.id, status: "pending"}
    LS->>EB: emit("leave.created")
    API-->>RE: 201 pending
    EB-)NS: notifyManagers()
    NS-)SW: push "New leave request"
    SW-)M: System notification
    M->>RM: Open Leave Approvals, click Approve, confirm
    RM->>API: PATCH /api/leaves/:id/status {status: "approved"} (manager token)
    API->>API: protect + authorizeRoles("manager")
    API->>LS: reviewLeave(manager, id, body)
    LS->>LS: canTransition("pending","approved")?
    alt already reviewed
        LS-->>RM: 409 Cannot change status
    else allowed
        LS->>DB: save status, reviewedBy, reviewedAt
        LS->>EB: emit("leave.reviewed")
        API-->>RM: 200 Leave request approved
        EB-)NS: notifyUsers([employeeId])
        NS-)SW: push "Leave approved"
        SW-)E: System notification
    end
```

## 7. State diagram – Leave request lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending : employee submits
    Pending --> Pending : employee edits
    Pending --> Cancelled : employee cancels (deleted)
    Pending --> Approved : manager approves
    Pending --> Rejected : manager rejects
    Approved --> [*]
    Rejected --> [*]
    Cancelled --> [*]
    note right of Approved : Final – edit, cancel or re-review returns 409
```

## 8. Architecture overview

```mermaid
flowchart LR
    subgraph Browser["Browser (PWA)"]
        UI["React pages + components"]
        AC["AuthContext (JWT)"]
        IDB[("IndexedDB – per-user offline data")]
        SW["Service worker – app shell cache + push"]
    end
    subgraph Server["Node.js / Express API"]
        MW["Middleware: helmet, CORS, rate limit, sanitize, logger, protect, roles"]
        C["Controllers"]
        S["Services (business rules)"]
        R["Repositories"]
        EV["Event bus + listeners"]
        NS["Notification service (Strategy)"]
    end
    DB[("MongoDB shiftmanager")]
    PS["Browser push service (FCM / Mozilla / WNS)"]
    UI --> AC
    UI <--> IDB
    UI -- "fetch + Bearer JWT" --> MW --> C --> S --> R --> DB
    S --> EV --> NS -- "web-push (VAPID)" --> PS --> SW
```
