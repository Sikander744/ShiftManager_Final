/** Integration tests: authentication API (real Express app + test MongoDB). */
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const {
  app, request, PASSWORD, connectTestDb, clearDb, disconnectTestDb, createUserAndLogin, auth
} = require("../helpers/testUtils");

beforeAll(connectTestDb);
beforeEach(clearDb);
afterAll(disconnectTestDb);

describe("POST /api/auth/register", () => {
  test("registers a new employee (201) without returning the password hash", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "New Staff", email: "New@Test.com", password: PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "New Staff", email: "new@test.com", role: "employee" });
    expect(res.body.user.passwordHash).toBeUndefined();

    const saved = await User.findOne({ email: "new@test.com" }).select("+passwordHash");
    expect(saved.passwordHash).not.toBe(PASSWORD); // stored hashed
  });

  test("rejects duplicate email (409)", async () => {
    await request(app).post("/api/auth/register").send({ name: "A", email: "a@test.com", password: PASSWORD });
    const res = await request(app).post("/api/auth/register").send({ name: "B", email: "a@test.com", password: PASSWORD });
    expect(res.status).toBe(409);
  });

  test("rejects incomplete registration (400)", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "a@test.com" });
    expect(res.status).toBe(400);
  });

  test("rejects short password and invalid email (400)", async () => {
    expect((await request(app).post("/api/auth/register").send({ name: "A", email: "a@test.com", password: "short" })).status).toBe(400);
    expect((await request(app).post("/api/auth/register").send({ name: "A", email: "bad-email", password: PASSWORD })).status).toBe(400);
  });

  test("blocks privilege escalation via role field (400)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Sneaky", email: "s@test.com", password: PASSWORD, role: "manager" });
    expect(res.status).toBe(400);
    expect(await User.countDocuments()).toBe(0);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => createUserAndLogin({ name: "E", email: "e@test.com", role: "employee" }));

  test("valid credentials return a JWT (200)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "e@test.com", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.role).toBe("employee");
  });

  test("wrong password returns 401 with a generic message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "e@test.com", password: "WrongPass1" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test("unknown email returns the same 401 message", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nobody@test.com", password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test("NoSQL operator injection is rejected (400)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: { $ne: "" }, password: { $ne: "" } });
    expect(res.status).toBe(400);
  });

  test("malformed JSON returns 400, not a server error", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
  });
});

describe("Protected routes / token handling", () => {
  test("missing token returns 401", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });

  test("invalid token returns 401", async () => {
    expect((await request(app).get("/api/auth/me").set(auth("garbage.token.value"))).status).toBe(401);
  });

  test("expired token returns 401 with session expired message", async () => {
    const { id } = await createUserAndLogin({ name: "E", email: "e@test.com", role: "employee" });
    const expired = jwt.sign({ id, role: "employee" }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get("/api/auth/me").set(auth(expired));
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test("stale role in token is ignored - current DB role is used", async () => {
    const { id } = await createUserAndLogin({ name: "E", email: "e@test.com", role: "employee" });
    // Forge a token that claims "manager" (signed correctly, e.g. issued before a demotion)
    const staleToken = jwt.sign({ id, role: "manager" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const res = await request(app).get("/api/manager/test").set(auth(staleToken));
    expect(res.status).toBe(403);
  });

  test("token of a deleted user returns 401", async () => {
    const { id, token } = await createUserAndLogin({ name: "E", email: "e@test.com", role: "employee" });
    await User.findByIdAndDelete(id);
    expect((await request(app).get("/api/auth/me").set(auth(token))).status).toBe(401);
  });

  test("unknown route returns JSON 404", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Route not found/);
  });
});
