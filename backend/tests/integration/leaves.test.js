/** Integration tests: Leave CRUD, approval workflow and data isolation. */
const LeaveRequest = require("../../models/LeaveRequest");
const {
  app, request, connectTestDb, clearDb, disconnectTestDb, createStandardUsers, auth
} = require("../helpers/testUtils");

let manager, employee, employee2;

beforeAll(connectTestDb);
beforeEach(async () => {
  await clearDb();
  ({ manager, employee, employee2 } = await createStandardUsers());
});
afterAll(disconnectTestDb);

const leaveBody = (overrides = {}) => ({
  startDate: "2026-12-20",
  endDate: "2026-12-24",
  reason: "Christmas holiday",
  ...overrides
});

const submit = (token, body = leaveBody()) =>
  request(app).post("/api/leaves").set(auth(token)).send(body);

describe("CREATE leave", () => {
  test("employee submits leave -> pending (201), employeeId taken from token", async () => {
    const res = await submit(employee.token);
    expect(res.status).toBe(201);
    expect(res.body.leave.status).toBe("pending");
    expect(res.body.leave.employeeId._id).toBe(employee.id);
  });

  test("employee cannot submit leave for someone else (employeeId field rejected)", async () => {
    const res = await submit(employee.token, leaveBody({ employeeId: employee2.id }));
    expect(res.status).toBe(400);
  });

  test("employee cannot set status on creation (400)", async () => {
    expect((await submit(employee.token, leaveBody({ status: "approved" }))).status).toBe(400);
  });

  test("end date before start date is rejected (400)", async () => {
    expect((await submit(employee.token, leaveBody({ startDate: "2026-12-24", endDate: "2026-12-20" }))).status).toBe(400);
  });

  test("invalid dates and empty reason are rejected (400)", async () => {
    expect((await submit(employee.token, leaveBody({ startDate: "2026-02-31" }))).status).toBe(400);
    expect((await submit(employee.token, leaveBody({ reason: "" }))).status).toBe(400);
  });

  test("overlapping leave for the same employee is rejected (409)", async () => {
    await submit(employee.token);
    expect((await submit(employee.token, leaveBody({ startDate: "2026-12-23", endDate: "2026-12-27" }))).status).toBe(409);
  });

  test("manager cannot submit leave (403)", async () => {
    expect((await submit(manager.token)).status).toBe(403);
  });
});

describe("READ leave", () => {
  let leaveId;
  beforeEach(async () => {
    leaveId = (await submit(employee.token)).body.leave._id;
    await submit(employee2.token);
  });

  test("employee sees only their own requests", async () => {
    const res = await request(app).get("/api/leaves").set(auth(employee.token));
    expect(res.body.count).toBe(1);
  });

  test("manager sees all requests and can filter by status", async () => {
    expect((await request(app).get("/api/leaves").set(auth(manager.token))).body.count).toBe(2);
    expect((await request(app).get("/api/leaves?status=approved").set(auth(manager.token))).body.count).toBe(0);
  });

  test("another employee cannot view the request (403)", async () => {
    expect((await request(app).get(`/api/leaves/${leaveId}`).set(auth(employee2.token))).status).toBe(403);
  });

  test("owner can view the request by ID (200)", async () => {
    expect((await request(app).get(`/api/leaves/${leaveId}`).set(auth(employee.token))).status).toBe(200);
  });

  test("invalid ID returns 400, unknown ID returns 404", async () => {
    expect((await request(app).get("/api/leaves/123").set(auth(employee.token))).status).toBe(400);
    expect((await request(app).get("/api/leaves/000000000000000000000000").set(auth(employee.token))).status).toBe(404);
  });
});

describe("UPDATE / CANCEL leave", () => {
  let leaveId;
  beforeEach(async () => {
    leaveId = (await submit(employee.token)).body.leave._id;
  });

  test("owner edits a pending request (200)", async () => {
    const res = await request(app).put(`/api/leaves/${leaveId}`).set(auth(employee.token)).send({ reason: "Family visit" });
    expect(res.status).toBe(200);
    expect(res.body.leave.reason).toBe("Family visit");
  });

  test("another employee cannot edit or cancel (403)", async () => {
    expect((await request(app).put(`/api/leaves/${leaveId}`).set(auth(employee2.token)).send({ reason: "x" })).status).toBe(403);
    expect((await request(app).delete(`/api/leaves/${leaveId}`).set(auth(employee2.token))).status).toBe(403);
  });

  test("edit making end before start is rejected (400)", async () => {
    const res = await request(app).put(`/api/leaves/${leaveId}`).set(auth(employee.token)).send({ endDate: "2026-12-01" });
    expect(res.status).toBe(400);
  });

  test("owner cancels a pending request (200)", async () => {
    expect((await request(app).delete(`/api/leaves/${leaveId}`).set(auth(employee.token))).status).toBe(200);
    expect(await LeaveRequest.countDocuments()).toBe(0);
  });

  test("reviewed request cannot be edited or cancelled (409)", async () => {
    await request(app).patch(`/api/leaves/${leaveId}/status`).set(auth(manager.token)).send({ status: "approved" });
    expect((await request(app).put(`/api/leaves/${leaveId}`).set(auth(employee.token)).send({ reason: "x" })).status).toBe(409);
    expect((await request(app).delete(`/api/leaves/${leaveId}`).set(auth(employee.token))).status).toBe(409);
  });
});

describe("APPROVE / REJECT leave", () => {
  let leaveId;
  beforeEach(async () => {
    leaveId = (await submit(employee.token)).body.leave._id;
  });

  const review = (token, status) =>
    request(app).patch(`/api/leaves/${leaveId}/status`).set(auth(token)).send({ status });

  test("manager approves: status, reviewer and timestamp are saved", async () => {
    const res = await review(manager.token, "approved");
    expect(res.status).toBe(200);
    const saved = await LeaveRequest.findById(leaveId);
    expect(saved.status).toBe("approved");
    expect(saved.reviewedBy.toString()).toBe(manager.id);
    expect(saved.reviewedAt).toBeInstanceOf(Date);
  });

  test("manager rejects (200)", async () => {
    expect((await review(manager.token, "rejected")).body.leave.status).toBe("rejected");
  });

  test("employee cannot approve their own leave (403)", async () => {
    expect((await review(employee.token, "approved")).status).toBe(403);
    expect((await LeaveRequest.findById(leaveId)).status).toBe("pending");
  });

  test("invalid status value is rejected (400)", async () => {
    expect((await review(manager.token, "pending")).status).toBe(400);
    expect((await review(manager.token, "maybe")).status).toBe(400);
  });

  test("invalid transition approved -> rejected is blocked (409)", async () => {
    await review(manager.token, "approved");
    expect((await review(manager.token, "rejected")).status).toBe(409);
  });
});
