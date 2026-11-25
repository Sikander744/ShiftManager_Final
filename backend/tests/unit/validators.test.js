/** Unit tests for pure validation helpers (no database needed). */
const v = require("../../utils/validators");

describe("Email validation", () => {
  test("accepts a valid email", () => {
    expect(v.isValidEmail("staff@shiftmanager.co.nz")).toBe(true);
  });
  test.each(["", "plainaddress", "a@b", "a b@c.com", null, 42])("rejects invalid email %p", (email) => {
    expect(v.isValidEmail(email)).toBe(false);
  });
});

describe("Required field validation", () => {
  test("empty and whitespace strings are invalid", () => {
    expect(v.isNonEmptyString("")).toBe(false);
    expect(v.isNonEmptyString("   ")).toBe(false);
    expect(v.isNonEmptyString(undefined)).toBe(false);
  });
  test("non-empty string is valid", () => {
    expect(v.isNonEmptyString("Front desk")).toBe(true);
  });
});

describe("Date validation", () => {
  test("accepts real dates including leap day", () => {
    expect(v.isValidDate("2026-11-25")).toBe(true);
    expect(v.isValidDate("2028-02-29")).toBe(true);
  });
  test.each(["2026-02-30", "2027-02-29", "2026-13-01", "26-11-25", "2026/11/25", "", 20261125])(
    "rejects invalid date %p",
    (date) => expect(v.isValidDate(date)).toBe(false)
  );
});

describe("Time validation", () => {
  test("accepts 24-hour HH:mm", () => {
    expect(v.isValidTime("00:00")).toBe(true);
    expect(v.isValidTime("23:59")).toBe(true);
  });
  test.each(["24:00", "9:00", "12:60", "noon", ""])("rejects invalid time %p", (t) => {
    expect(v.isValidTime(t)).toBe(false);
  });
  test("timeToMinutes converts correctly", () => {
    expect(v.timeToMinutes("09:30")).toBe(570);
  });
});

describe("Shift time rules", () => {
  test("end time before start time is rejected", () => {
    expect(v.validateShiftTimes("17:00", "09:00")).toMatch(/after start time/);
  });
  test("equal start and end time is rejected", () => {
    expect(v.validateShiftTimes("09:00", "09:00")).not.toBeNull();
  });
  test("valid same-day shift passes", () => {
    expect(v.validateShiftTimes("09:00", "17:00")).toBeNull();
  });
});

describe("Shift overlap detection", () => {
  test("overlapping shifts are detected", () => {
    expect(v.timeRangesOverlap("09:00", "13:00", "12:00", "15:00")).toBe(true);
  });
  test("shift inside another shift is detected", () => {
    expect(v.timeRangesOverlap("09:00", "17:00", "10:00", "11:00")).toBe(true);
  });
  test("back-to-back shifts do not overlap", () => {
    expect(v.timeRangesOverlap("09:00", "13:00", "13:00", "17:00")).toBe(false);
  });
  test("separate shifts do not overlap", () => {
    expect(v.timeRangesOverlap("06:00", "08:00", "18:00", "22:00")).toBe(false);
  });
  test("leave date ranges overlap inclusively", () => {
    expect(v.dateRangesOverlap("2026-12-01", "2026-12-05", "2026-12-05", "2026-12-10")).toBe(true);
    expect(v.dateRangesOverlap("2026-12-01", "2026-12-04", "2026-12-05", "2026-12-10")).toBe(false);
  });
});

describe("validateShift()", () => {
  const valid = {
    employeeId: "6afcd3010653f0f3530edf83",
    date: "2026-12-01",
    startTime: "09:00",
    endTime: "17:00",
    location: "Front Desk"
  };
  test("valid shift has no errors", () => {
    expect(v.validateShift(valid)).toEqual([]);
  });
  test("missing fields produce errors", () => {
    expect(v.validateShift({}).length).toBe(5);
  });
  test("partial update only checks provided fields", () => {
    expect(v.validateShift({ location: "Bar" }, { partial: true })).toEqual([]);
    expect(v.validateShift({ location: "  " }, { partial: true })).toEqual(["Location is required"]);
  });
  test("invalid ObjectId is rejected", () => {
    expect(v.validateShift({ ...valid, employeeId: "abc" })).toContain("A valid employeeId is required");
  });
});

describe("validateLeave()", () => {
  test("valid leave passes", () => {
    expect(v.validateLeave({ startDate: "2026-12-01", endDate: "2026-12-02", reason: "Holiday" })).toEqual([]);
  });
  test("reason over 500 chars is rejected", () => {
    const errors = v.validateLeave({ startDate: "2026-12-01", endDate: "2026-12-02", reason: "x".repeat(501) });
    expect(errors).toContain("Reason must be 500 characters or fewer");
  });
});

describe("Unknown field detection", () => {
  test("detects fields that are not allowed", () => {
    expect(v.findUnknownFields({ name: "a", role: "manager" }, ["name"])).toEqual(["role"]);
  });
});
