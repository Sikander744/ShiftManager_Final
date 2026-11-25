/**
 * OBSERVER / EVENT-DRIVEN PATTERN
 * Business services "publish" domain events (e.g. "leave.created") and do not
 * need to know who is listening. The notification listeners "subscribe" to
 * those events in events/notificationListeners.js.
 *
 * Benefit: shift/leave code is not coupled to push-notification code.
 * A new listener (e.g. audit log or email) can be added without editing
 * the services.
 */
const { EventEmitter } = require("events");

const EVENTS = Object.freeze({
  SHIFT_CREATED: "shift.created",
  SHIFT_UPDATED: "shift.updated",
  SHIFT_DELETED: "shift.deleted",
  LEAVE_CREATED: "leave.created",
  LEAVE_REVIEWED: "leave.reviewed"
});

const eventBus = new EventEmitter();

module.exports = { eventBus, EVENTS };
