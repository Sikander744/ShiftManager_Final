/** Integration tests: Shift CRUD, validation and permissions. */
const Shift = require("../../models/Shift");
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

const validShift = (employeeId, overrides = {}) => ({
  employeeId,
  date: "2026-12-01",
  startTime: "09:00",
  endTime: "13:00",
  location: "Front Desk",
  ...overrides
});

const createShift = (body) =>
  request(app).post("/api/shifts").set(auth(manager.token)).send(body);

describe("CREATE shift", () => {
  test("manager creates a valid shift (201)", async () => {
    const res = await createShift(validShift(employee.id));
    expect(res.status).toBe(201);
    expect(res.body.shift).toMatchObject({ date: "2026-12-01", startTime: "09:00", location: "Front Desk" });
    expect(res.body.shift.employeeId.email).toBe("employee@test.com");
    expect(await Shift.countDocuments()).toBe(1);
  });

  test("employee cannot create shifts (403)", async () => {
    const res = await request(app).post("/api/shifts").set(auth(employee.token)).send(validShift(employee.id));
    expect(res.status).toBe(403);
  });

  test.each([
    ["invalid date", { date: "2026-02-30" }],
    ["invalid time", { startTime: "25:00" }],
    ["end before start", { startTime: "17:00", endTime: "09:00" }],
    ["empty location", { location: "   " }],
    ["invalid employeeId", { employeeId: "abc" }],
    ["unexpected field", { isAdmin: true }]
  ])("rejects %s (400)", async (_label, override) => {
    const res = await createShift(validShift(employee.id, override));
    expect(res.status).toBe(400);
  });

  test("rejects shift for non-existent employee (404)", async () => {
    expect((await createShift(validShift("000000000000000000000000"))).status).toBe(404);
  });

  test("rejects shift assigned to a manager (404)", async () => {
    expect((await createShift(validShift(manager.id))).status).toBe(404);
  });

  test("rejects overlapping shift for the same employee (409)", async () => {
    await createShift(validShift(employee.id));
    const res = await createShift(validShift(employee.id, { startTime: "12:00", endTime: "15:00" }));
    expect(res.status).toBe(409);
  });

  test("allows back-to-back shifts and same time for different employees", async () => {
    await createShift(validShift(employee.id));
    expect((await createShift(validShift(employee.id, { startTime: "13:00", endTime: "17:00" }))).status).toBe(201);
    expect((await createShift(validShift(employee2.id))).status).toBe(201);
  });
});

describe("READ shifts", () => {
  beforeEach(async () => {
    await createShift(validShift(employee.id));
    await createShift(validShift(employee2.id, { location: "Kitchen" }));
  });

  test("manager sees all shifts", async () => {
    const res = await request(app).get("/api/shifts").set(auth(manager.token));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  test("employee sees only their own shifts", async () => {
    const res = await request(app).get("/api/shifts").set(auth(employee.token));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.shifts.every((s) => s.employeeId._id === employee.id)).toBe(true);
  });

  test("employee cannot widen the filter with ?employeeId", async () => {
    const res = await request(app).get(`/api/shifts?employeeId=${employee2.id}`).set(auth(employee.token));
    expect(res.body.count).toBe(1);
    expect(res.body.shifts[0].employeeId._id).toBe(employee.id);
  });

  test("employee cannot read another employee's shift by ID (403)", async () => {
    const other = await Shift.findOne({ employeeId: employee2.id });
    expect((await request(app).get(`/api/shifts/${other._id}`).set(auth(employee.token))).status).toBe(403);
  });

  test("manager can filter by date range and rejects invalid filter dates", async () => {
    const ok = await request(app).get("/api/shifts?from=2026-12-01&to=2026-12-01").set(auth(manager.token));
    expect(ok.body.count).toBe(2);
    const bad = await request(app).get("/api/shifts?from=yesterday").set(auth(manager.token));
    expect(bad.status).toBe(400);
  });

  test("no token returns 401", async () => {
    expect((await request(app).get("/api/shifts")).status).toBe(401);
  });
});

describe("UPDATE shift", () => {
  let shiftId;
  beforeEach(async () => {
    shiftId = (await createShift(validShift(employee.id))).body.shift._id;
  });

  test("manager updates a shift (200) and database changes", async () => {
    const res = await request(app)
      .put(`/api/shifts/${shiftId}`)
      .set(auth(manager.token))
      .send({ startTime: "10:00", endTime: "18:00", location: "Warehouse" });
    expect(res.status).toBe(200);
    const saved = await Shift.findById(shiftId);
    expect(saved).toMatchObject({ startTime: "10:00", endTime: "18:00", location: "Warehouse" });
  });

  test("employee cannot update a shift (403)", async () => {
    const res = await request(app).put(`/api/shifts/${shiftId}`).set(auth(employee.token)).send({ location: "Hacked" });
    expect(res.status).toBe(403);
    expect((await Shift.findById(shiftId)).location).toBe("Front Desk");
  });

  test("invalid ID (400), missing shift (404), empty body (400)", async () => {
    expect((await request(app).put("/api/shifts/abc").set(auth(manager.token)).send({ location: "X" })).status).toBe(400);
    expect((await request(app).put("/api/shifts/000000000000000000000000").set(auth(manager.token)).send({ location: "X" })).status).toBe(404);
    expect((await request(app).put(`/api/shifts/${shiftId}`).set(auth(manager.token)).send({})).status).toBe(400);
  });

  test("update that makes end before start is rejected (400)", async () => {
    const res = await request(app).put(`/api/shifts/${shiftId}`).set(auth(manager.token)).send({ endTime: "08:00" });
    expect(res.status).toBe(400);
  });

  test("update that creates a conflict is rejected (409)", async () => {
    const second = await createShift(validShift(employee.id, { startTime: "14:00", endTime: "16:00" }));
    const res = await request(app)
      .put(`/api/shifts/${second.body.shift._id}`)
      .set(auth(manager.token))
      .send({ startTime: "12:00" });
    expect(res.status).toBe(409);
  });

  test("a shift does not conflict with itself when updated", async () => {
    const res = await request(app).put(`/api/shifts/${shiftId}`).set(auth(manager.token)).send({ endTime: "14:00" });
    expect(res.status).toBe(200);
  });
});

describe("DELETE shift", () => {
  let shiftId;
  beforeEach(async () => {
    shiftId = (await createShift(validShift(employee.id))).body.shift._id;
  });

  test("employee cannot delete (403)", async () => {
    expect((await request(app).delete(`/api/shifts/${shiftId}`).set(auth(employee.token))).status).toBe(403);
    expect(await Shift.countDocuments()).toBe(1);
  });

  test("manager deletes (200), then the shift is gone (404)", async () => {
    expect((await request(app).delete(`/api/shifts/${shiftId}`).set(auth(manager.token))).status).toBe(200);
    expect(await Shift.countDocuments()).toBe(0);
    expect((await request(app).delete(`/api/shifts/${shiftId}`).set(auth(manager.token))).status).toBe(404);
  });
});
