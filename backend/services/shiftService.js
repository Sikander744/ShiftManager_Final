/**
 * Shift business logic (Service layer).
 * - Validates input and business rules
 * - Uses the repository for database work
 * - Publishes events so notifications happen without tight coupling
 */
const AppError = require("../utils/AppError");
const shiftRepository = require("../repositories/shiftRepository");
const userRepository = require("../repositories/userRepository");
const { eventBus, EVENTS } = require("../events/eventBus");
const {
  isValidObjectId,
  isValidDate,
  findUnknownFields,
  validateShift,
  validateShiftTimes,
  timeRangesOverlap
} = require("../utils/validators");

const SHIFT_FIELDS = ["employeeId", "date", "startTime", "endTime", "location"];

function assertValidId(id, label = "shift") {
  if (!isValidObjectId(id)) throw new AppError(`Invalid ${label} ID`, 400);
}

function rejectUnknownFields(body) {
  const unknown = findUnknownFields(body, SHIFT_FIELDS);
  if (unknown.length) {
    throw new AppError(`Unexpected field(s): ${unknown.join(", ")}`, 400);
  }
}

async function assertEmployeeExists(employeeId) {
  const employee = await userRepository.findById(employeeId);
  if (!employee || employee.role !== "employee") {
    throw new AppError("Employee not found", 404);
  }
  return employee;
}

/** Throws 409 if the employee already has an overlapping shift that day. */
async function assertNoConflict({ employeeId, date, startTime, endTime }, excludeId) {
  const sameDay = await shiftRepository.findForEmployeeOnDate(employeeId, date, excludeId);
  const clash = sameDay.find((s) =>
    timeRangesOverlap(startTime, endTime, s.startTime, s.endTime)
  );
  if (clash) {
    throw new AppError(
      `Shift conflicts with an existing shift (${clash.startTime}-${clash.endTime}) on ${date}`,
      409
    );
  }
}

async function createShift(body = {}) {
  rejectUnknownFields(body);
  const errors = validateShift(body);
  if (errors.length) throw new AppError("Validation failed", 400, errors);

  const timeError = validateShiftTimes(body.startTime, body.endTime);
  if (timeError) throw new AppError(timeError, 400);

  await assertEmployeeExists(body.employeeId);

  const data = {
    employeeId: body.employeeId,
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
    location: body.location.trim()
  };
  await assertNoConflict(data);

  const created = await shiftRepository.create(data);
  const shift = await shiftRepository.findById(created._id);
  eventBus.emit(EVENTS.SHIFT_CREATED, { shift });
  return shift;
}

/** Managers see all shifts (optionally filtered); employees only their own. */
async function listShifts(user, query = {}) {
  const filter = {};
  const { employeeId, from, to } = query;

  if (from !== undefined && !isValidDate(from)) throw new AppError("Invalid 'from' date", 400);
  if (to !== undefined && !isValidDate(to)) throw new AppError("Invalid 'to' date", 400);
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }

  if (user.role === "manager") {
    if (employeeId !== undefined) {
      assertValidId(employeeId, "employee");
      filter.employeeId = employeeId;
    }
  } else {
    // Data isolation: an employee can never widen this filter
    filter.employeeId = user.id;
  }

  return shiftRepository.findMany(filter);
}

async function getShift(user, id) {
  assertValidId(id);
  const shift = await shiftRepository.findById(id);
  if (!shift) throw new AppError("Shift not found", 404);

  const ownerId = shift.employeeId?._id?.toString() || shift.employeeId?.toString();
  if (user.role !== "manager" && ownerId !== user.id) {
    throw new AppError("Access denied. This shift belongs to another employee.", 403);
  }
  return shift;
}

async function updateShift(id, body = {}) {
  assertValidId(id);
  rejectUnknownFields(body);
  if (Object.keys(body).length === 0) {
    throw new AppError("Provide at least one field to update", 400);
  }

  const errors = validateShift(body, { partial: true });
  if (errors.length) throw new AppError("Validation failed", 400, errors);

  const shift = await shiftRepository.findRawById(id);
  if (!shift) throw new AppError("Shift not found", 404);

  const previous = {
    employeeId: shift.employeeId.toString(),
    date: shift.date,
    startTime: shift.startTime,
    endTime: shift.endTime,
    location: shift.location
  };

  if (body.employeeId !== undefined) await assertEmployeeExists(body.employeeId);

  // Merge provided fields into the existing shift
  const merged = {
    employeeId: body.employeeId ?? previous.employeeId,
    date: body.date ?? previous.date,
    startTime: body.startTime ?? previous.startTime,
    endTime: body.endTime ?? previous.endTime,
    location: body.location !== undefined ? body.location.trim() : previous.location
  };

  const timeError = validateShiftTimes(merged.startTime, merged.endTime);
  if (timeError) throw new AppError(timeError, 400);

  await assertNoConflict(merged, id);

  Object.assign(shift, merged);
  await shiftRepository.save(shift);

  const updated = await shiftRepository.findById(id);
  eventBus.emit(EVENTS.SHIFT_UPDATED, { shift: updated, previous });
  return updated;
}

async function deleteShift(id) {
  assertValidId(id);
  const shift = await shiftRepository.deleteById(id);
  if (!shift) throw new AppError("Shift not found", 404);
  eventBus.emit(EVENTS.SHIFT_DELETED, { shift });
  return shift;
}

module.exports = { createShift, listShifts, getShift, updateShift, deleteShift };
