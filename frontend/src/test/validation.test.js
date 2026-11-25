import { describe, expect, test } from "vitest";
import {
  daysBetween, formatDate, hasErrors, isValidDate, isValidEmail, shiftHours,
  validateLeave, validateLogin, validateRegister, validateShift
} from "../utils/validation";

describe("validateLogin", () => {
  test("requires email and password", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Email is required",
      password: "Password is required"
    });
  });
  test("rejects invalid email", () => {
    expect(validateLogin({ email: "bad", password: "x" }).email).toBe("Enter a valid email address");
  });
  test("valid input has no errors", () => {
    expect(hasErrors(validateLogin({ email: "a@b.co", password: "x" }))).toBe(false);
  });
});

describe("validateRegister", () => {
  const valid = { name: "Sam", email: "sam@test.com", password: "Password1!", confirmPassword: "Password1!" };
  test("valid registration passes", () => {
    expect(validateRegister(valid)).toEqual({});
  });
  test("short password and mismatched confirmation are caught", () => {
    const errors = validateRegister({ ...valid, password: "short", confirmPassword: "other" });
    expect(errors.password).toMatch(/8 characters/);
    expect(errors.confirmPassword).toBe("Passwords do not match");
  });
});

describe("validateShift", () => {
  const valid = { employeeId: "abc", date: "2026-12-01", startTime: "09:00", endTime: "17:00", location: "Bar" };
  test("valid shift passes", () => {
    expect(validateShift(valid)).toEqual({});
  });
  test("end time before start time is rejected", () => {
    expect(validateShift({ ...valid, endTime: "08:00" }).endTime).toMatch(/after start time/);
  });
  test("missing employee and blank location are rejected", () => {
    const errors = validateShift({ ...valid, employeeId: "", location: "  " });
    expect(errors.employeeId).toBeDefined();
    expect(errors.location).toBeDefined();
  });
  test("impossible date is rejected", () => {
    expect(validateShift({ ...valid, date: "2026-02-30" }).date).toBeDefined();
  });
});

describe("validateLeave", () => {
  test("end date before start date is rejected", () => {
    expect(validateLeave({ startDate: "2026-12-10", endDate: "2026-12-01", reason: "x" }).endDate)
      .toBe("End date cannot be before start date");
  });
  test("reason is required", () => {
    expect(validateLeave({ startDate: "2026-12-01", endDate: "2026-12-01", reason: " " }).reason).toBeDefined();
  });
});

describe("helpers", () => {
  test("isValidEmail / isValidDate", () => {
    expect(isValidEmail("x@y.nz")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2027-02-29")).toBe(false);
  });
  test("daysBetween counts inclusive days", () => {
    expect(daysBetween("2026-12-20", "2026-12-24")).toBe(5);
    expect(daysBetween("2026-12-20", "2026-12-20")).toBe(1);
  });
  test("shiftHours calculates duration", () => {
    expect(shiftHours("09:00", "17:30")).toBe(8.5);
  });
  test("formatDate produces a readable date", () => {
    expect(formatDate("2026-11-25")).toMatch(/25/);
    expect(formatDate("2026-11-25")).toMatch(/Nov/);
  });
});
