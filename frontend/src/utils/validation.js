/**
 * Frontend form validation (mirrors the backend rules so users get
 * instant feedback; the backend still validates everything again).
 * Each validator returns an object of { fieldName: "error message" }.
 * An empty object means the form is valid.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || "").trim());

export function isValidDate(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const isValidTime = (value) => TIME_PATTERN.test(String(value || ""));

export const hasErrors = (errors) => Object.keys(errors).length > 0;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email?.trim()) errors.email = "Email is required";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address";
  if (!password) errors.password = "Password is required";
  return errors;
}

export function validateRegister({ name, email, password, confirmPassword }) {
  const errors = {};
  if (!name?.trim()) errors.name = "Name is required";
  else if (name.trim().length > 80) errors.name = "Name must be 80 characters or fewer";
  if (!email?.trim()) errors.email = "Email is required";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address";
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match";
  return errors;
}

export function validateShift({ employeeId, date, startTime, endTime, location }) {
  const errors = {};
  if (!employeeId) errors.employeeId = "Select an employee";
  if (!date) errors.date = "Date is required";
  else if (!isValidDate(date)) errors.date = "Enter a valid date";
  if (!startTime) errors.startTime = "Start time is required";
  else if (!isValidTime(startTime)) errors.startTime = "Use HH:mm format";
  if (!endTime) errors.endTime = "End time is required";
  else if (!isValidTime(endTime)) errors.endTime = "Use HH:mm format";
  if (!errors.startTime && !errors.endTime && endTime <= startTime) {
    errors.endTime = "End time must be after start time (same-day shifts only)";
  }
  if (!location?.trim()) errors.location = "Location is required";
  else if (location.trim().length > 100) errors.location = "Location must be 100 characters or fewer";
  return errors;
}

export function validateLeave({ startDate, endDate, reason }) {
  const errors = {};
  if (!startDate) errors.startDate = "Start date is required";
  else if (!isValidDate(startDate)) errors.startDate = "Enter a valid date";
  if (!endDate) errors.endDate = "End date is required";
  else if (!isValidDate(endDate)) errors.endDate = "Enter a valid date";
  if (!errors.startDate && !errors.endDate && endDate < startDate) {
    errors.endDate = "End date cannot be before start date";
  }
  if (!reason?.trim()) errors.reason = "Reason is required";
  else if (reason.trim().length > 500) errors.reason = "Reason must be 500 characters or fewer";
  return errors;
}

/** "2026-11-25" -> "Wed 25 Nov 2026" (timezone-safe) */
export function formatDate(value) {
  if (!isValidDate(value)) return value || "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NZ", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

/** Local date as YYYY-MM-DD (avoids UTC off-by-one in New Zealand). */
export function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Number of calendar days in an inclusive leave range. */
export function daysBetween(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return 0;
  const toUTC = (s) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((toUTC(endDate) - toUTC(startDate)) / 86400000) + 1;
}

/** Shift length in hours, e.g. 09:00-17:30 -> 8.5 */
export function shiftHours(startTime, endTime) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return 0;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return Math.max(0, (toMin(endTime) - toMin(startTime)) / 60);
}
