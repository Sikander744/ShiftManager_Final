/**
 * Integration tests: push subscriptions and event-driven notifications.
 * A fake delivery strategy is injected (Strategy pattern) so no real
 * push service is contacted.
 */
const PushSubscription = require("../../models/PushSubscription");
const notificationService = require("../../services/notificationService");
const {
  app, request, connectTestDb, clearDb, disconnectTestDb, createStandardUsers, auth
} = require("../helpers/testUtils");

let manager, employee, employee2;
let sent;

const fakeStrategy = {
  name: "fake",
  send: jest.fn(async (sub, payload) => {
    sent.push({ endpoint: sub.endpoint, payload });
  })
};

const subscription = (n) => ({
  endpoint: `https://push.example.com/send/${n}`,
  keys: { p256dh: `p256dh-key-${n}`, auth: `auth-key-${n}` }
});

/** Event listeners run asynchronously - wait until a condition is true. */
async function waitFor(condition, timeout = 2000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error("waitFor timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}

beforeAll(async () => {
  await connectTestDb();
  notificationService.setStrategy(fakeStrategy);
});
beforeEach(async () => {
  await clearDb();
  sent = [];
  fakeStrategy.send.mockClear();
  ({ manager, employee, employee2 } = await createStandardUsers());
});
afterAll(disconnectTestDb);

describe("Subscriptions", () => {
  test("authenticated user can subscribe (201) and it is stored with their userId", async () => {
    const res = await request(app).post("/api/notifications/subscribe").set(auth(employee.token)).send(subscription(1));
    expect(res.status).toBe(201);
    const saved = await PushSubscription.findOne({ endpoint: subscription(1).endpoint });
    expect(saved.userId.toString()).toBe(employee.id);
  });

  test("subscribing without a token is denied (401)", async () => {
    expect((await request(app).post("/api/notifications/subscribe").send(subscription(1))).status).toBe(401);
  });

  test.each([
    ["missing keys", { endpoint: "https://push.example.com/x" }],
    ["non-URL endpoint", { endpoint: "nope", keys: { p256dh: "a", auth: "b" } }],
    ["http endpoint", { endpoint: "http://push.example.com/x", keys: { p256dh: "a", auth: "b" } }]
  ])("invalid subscription (%s) is rejected (400)", async (_l, body) => {
    expect((await request(app).post("/api/notifications/subscribe").set(auth(employee.token)).send(body)).status).toBe(400);
  });

  test("user can only remove their own subscription", async () => {
    await request(app).post("/api/notifications/subscribe").set(auth(employee.token)).send(subscription(1));
    const other = await request(app).delete("/api/notifications/subscribe").set(auth(employee2.token)).send({ endpoint: subscription(1).endpoint });
    expect(other.status).toBe(404);
    const own = await request(app).delete("/api/notifications/subscribe").set(auth(employee.token)).send({ endpoint: subscription(1).endpoint });
    expect(own.status).toBe(200);
  });
});

describe("Notification triggers (Observer pattern)", () => {
  beforeEach(async () => {
    await request(app).post("/api/notifications/subscribe").set(auth(manager.token)).send(subscription("manager"));
    await request(app).post("/api/notifications/subscribe").set(auth(employee.token)).send(subscription("employee"));
    await request(app).post("/api/notifications/subscribe").set(auth(employee2.token)).send(subscription("employee2"));
  });

  test("Scenario A: new leave request notifies the manager only", async () => {
    await request(app).post("/api/leaves").set(auth(employee.token))
      .send({ startDate: "2026-12-20", endDate: "2026-12-21", reason: "Holiday" });
    await waitFor(() => sent.length === 1);
    expect(sent[0].endpoint).toContain("manager");
    expect(sent[0].payload.title).toBe("New leave request");
  });

  test("Scenario B: leave decision notifies the requesting employee", async () => {
    const leave = await request(app).post("/api/leaves").set(auth(employee.token))
      .send({ startDate: "2026-12-20", endDate: "2026-12-21", reason: "Holiday" });
    await waitFor(() => sent.length === 1);
    sent = [];
    await request(app).patch(`/api/leaves/${leave.body.leave._id}/status`).set(auth(manager.token)).send({ status: "approved" });
    await waitFor(() => sent.length === 1);
    expect(sent[0].endpoint).toMatch(/employee$/);
    expect(sent[0].payload.title).toBe("Leave approved");
  });

  test("Scenario C: shift update notifies the assigned employee only", async () => {
    const shift = await request(app).post("/api/shifts").set(auth(manager.token))
      .send({ employeeId: employee.id, date: "2026-12-01", startTime: "09:00", endTime: "13:00", location: "Bar" });
    await waitFor(() => sent.length === 1);
    sent = [];
    await request(app).put(`/api/shifts/${shift.body.shift._id}`).set(auth(manager.token)).send({ location: "Kitchen" });
    await waitFor(() => sent.length === 1);
    expect(sent[0].endpoint).toMatch(/employee$/);
    expect(sent[0].payload.title).toBe("Shift updated");
    expect(sent[0].payload.body).toContain("Kitchen");
  });

  test("expired subscription (410 from push service) is removed automatically", async () => {
    fakeStrategy.send.mockImplementationOnce(async () => {
      const err = new Error("Gone");
      err.statusCode = 410;
      throw err;
    });
    const summary = await notificationService.notifyUsers([employee.id], { title: "t", body: "b" });
    expect(summary).toMatchObject({ failed: 1, removed: 1 });
    expect(await PushSubscription.countDocuments({ userId: employee.id })).toBe(0);
  });
});

describe("Test trigger endpoint", () => {
  test("employee cannot trigger notifications (403)", async () => {
    expect((await request(app).post("/api/notifications/test").set(auth(employee.token)).send({})).status).toBe(403);
  });

  test("manager trigger to a user without subscriptions returns 404", async () => {
    const res = await request(app).post("/api/notifications/test").set(auth(manager.token)).send({ userId: employee2.id });
    expect(res.status).toBe(404);
  });

  test("manager can send a test notification (200)", async () => {
    await request(app).post("/api/notifications/subscribe").set(auth(employee.token)).send(subscription(9));
    const res = await request(app).post("/api/notifications/test").set(auth(manager.token)).send({ userId: employee.id });
    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(1);
  });
});
