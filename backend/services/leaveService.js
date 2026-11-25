/**
 * Leave request business logic (Service layer).
 *
 * Status rules (a small state machine):
 *   pending  -> approved   (manager)
 *   pending  -> rejected   (manager)
 *   approved / rejected    -> final, cannot be edited, cancelled or re-reviewed
 */
const AppError = require("../utils/AppError");
const leaveRepository = require("../repositories/leaveRepository");
const { eventBus, EVENTS } = require("../events/eventBus");
const {
  isValidObjectId,
  findUnknownFields,
  validateLeave
} = require("../utils/validators");
const { LEAVE_STATUSES } = require("../models/LeaveRequest");

const EDITABLE_FIELDS = ["startDate", "endDate", "reason"];
const ALLOWED_TRANSITIONS = {
  pending: ["approved", "rejected"],
  approved: [],
  rejected: []
};

/** Pure function - exported so it can be unit tested on its own. */
function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

function assertValidId(id) {
  if (!isValidObjectId(id)) throw new AppError("Invalid leave request ID", 400);
}

function rejectUnknownFields(body, allowed) {
  const unknown = findUnknownFields(body, allowed);
  if (unknown.length) throw new AppError(`Unexpected field(s): ${unknown.join(", ")}`, 400);
}

function ownerIdOf(leave) {
  return leave.employeeId?._id?.toString() || leave.employeeId?.toString();
}

/** Loads a request and checks the caller may see it. */
async function loadAccessible(user, id, { raw = false } = {}) {
  assertValidId(id);
  const leave = raw ? await leaveRepository.findRawById(id) : await leaveRepository.findById(id);
  if (!leave) throw new AppError("Leave request not found", 404);
  if (user.role !== "manager" && ownerIdOf(leave) !== user.id) {
    throw new AppError("Access denied. This leave request belongs to another employee.", 403);
  }
  return leave;
}

async function assertNoOverlap(employeeId, startDate, endDate, excludeId) {
  const overlapping = await leaveRepository.findOverlapping(employeeId, startDate, endDate, excludeId);
  if (overlapping.length) {
    throw new AppError("You already have a pending or approved leave request covering these dates", 409);
  }
}

async function createLeave(user, body = {}) {
  rejectUnknownFields(body, EDITABLE_FIELDS);
  const errors = validateLeave(body);
  if (errors.length) throw new AppError("Validation failed", 400, errors);
  if (body.endDate < body.startDate) {
    throw new AppError("End date cannot be before start date", 400);
  }

  await assertNoOverlap(user.id, body.startDate, body.endDate);

  const created = await leaveRepository.create({
    employeeId: user.id, // always the logged-in employee, never taken from the body
    startDate: body.startDate,
    endDate: body.endDate,
    reason: body.reason.trim(),
    status: "pending"
  });
  const leave = await leaveRepository.findById(created._id);
  eventBus.emit(EVENTS.LEAVE_CREATED, { leave });
  return leave;
}

async function listLeaves(user, query = {}) {
  const filter = {};
  if (query.status !== undefined) {
    if (!LEAVE_STATUSES.includes(query.status)) throw new AppError("Invalid status filter", 400);
    filter.status = query.status;
  }
  if (user.role !== "manager") filter.employeeId = user.id; // data isolation
  return leaveRepository.findMany(filter);
}

async function getLeave(user, id) {
  return loadAccessible(user, id);
}

async function updateLeave(user, id, body = {}) {
  rejectUnknownFields(body, EDITABLE_FIELDS);
  if (Object.keys(body).length === 0) throw new AppError("Provide at least one field to update", 400);
  const errors = validateLeave(body, { partial: true });
  if (errors.length) throw new AppError("Validation failed", 400, errors);

  const leave = await loadAccessible(user, id, { raw: true });
  if (leave.status !== "pending") {
    throw new AppError(`Only pending requests can be edited (this one is ${leave.status})`, 409);
  }

  const startDate = body.startDate ?? leave.startDate;
  const endDate = body.endDate ?? leave.endDate;
  if (endDate < startDate) throw new AppError("End date cannot be before start date", 400);

  await assertNoOverlap(leave.employeeId, startDate, endDate, leave._id);

  leave.startDate = startDate;
  leave.endDate = endDate;
  if (body.reason !== undefined) leave.reason = body.reason.trim();
  await leaveRepository.save(leave);
  return leaveRepository.findById(id);
}

async function cancelLeave(user, id) {
  const leave = await loadAccessible(user, id, { raw: true });
  if (leave.status !== "pending") {
    throw new AppError(`Only pending requests can be cancelled (this one is ${leave.status})`, 409);
  }
  await leaveRepository.deleteById(id);
  return leave;
}

async function reviewLeave(manager, id, body = {}) {
  rejectUnknownFields(body, ["status"]);
  const { status } = body;
  if (!["approved", "rejected"].includes(status)) {
    throw new AppError("Status must be 'approved' or 'rejected'", 400);
  }
  assertValidId(id);
  const leave = await leaveRepository.findRawById(id);
  if (!leave) throw new AppError("Leave request not found", 404);

  if (!canTransition(leave.status, status)) {
    throw new AppError(`Cannot change status from ${leave.status} to ${status}`, 409);
  }

  leave.status = status;
  leave.reviewedBy = manager.id;
  leave.reviewedAt = new Date();
  await leaveRepository.save(leave);

  const reviewed = await leaveRepository.findById(id);
  eventBus.emit(EVENTS.LEAVE_REVIEWED, { leave: reviewed });
  return reviewed;
}

module.exports = {
  canTransition,
  createLeave,
  listLeaves,
  getLeave,
  updateLeave,
  cancelLeave,
  reviewLeave
};
