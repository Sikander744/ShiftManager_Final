/**
 * Pure validation helpers.
 * They have no database access, so they are easy to unit test.
 */
const mongoose = require("mongoose");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const isValidEmail = (value) =>
  typeof value === "string" && EMAIL_PATTERN.test(value.trim());

/** True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-30). */
function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** True for 24-hour HH:mm times (00:00 - 23:59). */
const isValidTime = (value) =>
  typeof value === "string" && TIME_PATTERN.test(value);

/** "09:30" -> 570 minutes after midnight. */
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Two same-day time ranges overlap when each one starts before the other ends.
 * Touching shifts (09:00-12:00 and 12:00-15:00) do NOT overlap.
 */
function timeRangesOverlap(startA, endA, startB, endB) {
  return (
    timeToMinutes(startA) < timeToMinutes(endB) &&
    timeToMinutes(startB) < timeToMinutes(endA)
  );
}

/** Inclusive date ranges overlap (YYYY-MM-DD strings compare correctly). */
const dateRangesOverlap = (startA, endA, startB, endB) =>
  startA <= endB && startB <= endA;

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value) &&
  /^[a-f\d]{24}$/i.test(value);

/** Returns the names of body fields that are not in the allowed list. */
function findUnknownFields(body, allowed) {
  return Object.keys(body || {}).filter((key) => !allowed.includes(key));
}

/**
 * Validates a shift payload.
 * @param {object} data       shift fields
 * @param {boolean} partial   true for updates (only provided fields checked)
 * @returns {string[]} list of error messages (empty = valid)
 *
 * Overnight policy: ShiftManager only supports same-day shifts.
 * A shift that crosses midnight must be entered as two shifts.
 */
function validateShift(data, { partial = false } = {}) {
  const errors = [];
  const has = (field) => data[field] !== undefined;

  if (!partial || has("employeeId")) {
    if (!isValidObjectId(data.employeeId)) errors.push("A valid employeeId is required");
  }
  if (!partial || has("date")) {
    if (!isValidDate(data.date)) errors.push("Date must be a real date in YYYY-MM-DD format");
  }
  if (!partial || has("startTime")) {
    if (!isValidTime(data.startTime)) errors.push("Start time must be in HH:mm (24-hour) format");
  }
  if (!partial || has("endTime")) {
    if (!isValidTime(data.endTime)) errors.push("End time must be in HH:mm (24-hour) format");
  }
  if (!partial || has("location")) {
    if (!isNonEmptyString(data.location)) errors.push("Location is required");
    else if (data.location.trim().length > 100) errors.push("Location must be 100 characters or fewer");
  }
  return errors;
}

/** Checks the final start/end pair (used after merging an update). */
function validateShiftTimes(startTime, endTime) {
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return "End time must be after start time (overnight shifts are not supported)";
  }
  return null;
}

/** Validates a leave payload (same partial rules as validateShift). */
function validateLeave(data, { partial = false } = {}) {
  const errors = [];
  const has = (field) => data[field] !== undefined;

  if (!partial || has("startDate")) {
    if (!isValidDate(data.startDate)) errors.push("Start date must be a real date in YYYY-MM-DD format");
  }
  if (!partial || has("endDate")) {
    if (!isValidDate(data.endDate)) errors.push("End date must be a real date in YYYY-MM-DD format");
  }
  if (!partial || has("reason")) {
    if (!isNonEmptyString(data.reason)) errors.push("Reason is required");
    else if (data.reason.trim().length > 500) errors.push("Reason must be 500 characters or fewer");
  }
  return errors;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidDate,
  isValidTime,
  timeToMinutes,
  timeRangesOverlap,
  dateRangesOverlap,
  isValidObjectId,
  findUnknownFields,
  validateShift,
  validateShiftTimes,
  validateLeave
};
