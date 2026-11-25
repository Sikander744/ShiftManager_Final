/** Unit tests for middleware and pure business rules (mocked req/res, no HTTP). */
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authorizeRoles = require("../../middleware/roleMiddleware");
const { hasDangerousKey } = require("../../middleware/sanitizeMiddleware");
const { canTransition } = require("../../services/leaveService");
const { signToken } = require("../../services/authService");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("Password hashing (bcrypt)", () => {
  test("hash is not the plain password and verifies correctly", async () => {
    const hash = await bcrypt.hash("Password123!", 4);
    expect(hash).not.toBe("Password123!");
    expect(await bcrypt.compare("Password123!", hash)).toBe(true);
  });
  test("wrong password does not match", async () => {
    const hash = await bcrypt.hash("Password123!", 4);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });
});

describe("JWT tokens", () => {
  const fakeUser = { _id: { toString: () => "6afcd3010653f0f3530edf83" }, role: "employee" };

  test("signed token contains id and role and verifies", () => {
    const decoded = jwt.verify(signToken(fakeUser), process.env.JWT_SECRET);
    expect(decoded.id).toBe("6afcd3010653f0f3530edf83");
    expect(decoded.role).toBe("employee");
  });
  test("token signed with another secret is rejected", () => {
    const forged = jwt.sign({ id: "x", role: "manager" }, "attacker-secret");
    expect(() => jwt.verify(forged, process.env.JWT_SECRET)).toThrow();
  });
  test("expired token throws TokenExpiredError", () => {
    const expired = jwt.sign({ id: "x", role: "employee" }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect(() => jwt.verify(expired, process.env.JWT_SECRET)).toThrow(jwt.TokenExpiredError);
  });
});

describe("authorizeRoles middleware", () => {
  test("manager is permitted on a manager route", () => {
    const next = jest.fn();
    authorizeRoles("manager")({ user: { role: "manager" } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });
  test("employee is forbidden (403) on a manager route", () => {
    const res = mockRes();
    const next = jest.fn();
    authorizeRoles("manager")({ user: { role: "employee" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  test("missing user returns 401", () => {
    const res = mockRes();
    authorizeRoles("manager")({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("NoSQL injection detection", () => {
  test("detects $ operators at any depth", () => {
    expect(hasDangerousKey({ email: { $ne: "" } })).toBe(true);
    expect(hasDangerousKey({ a: { b: { $gt: 1 } } })).toBe(true);
  });
  test("normal payload is allowed", () => {
    expect(hasDangerousKey({ email: "a@b.com", keys: { auth: "x" } })).toBe(false);
  });
});

describe("Leave status transitions", () => {
  test("pending can become approved or rejected", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
  });
  test("reviewed requests are final", () => {
    expect(canTransition("approved", "rejected")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("approved", "pending")).toBe(false);
  });
});
