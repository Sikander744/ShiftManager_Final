/**
 * OBSERVER PATTERN - listeners that react to domain events.
 * Each listener turns a business event into a push notification.
 * Registered once at app start-up (see app.js).
 */
const { eventBus, EVENTS } = require("./eventBus");
const notificationService = require("../services/notificationService");
const logger = require("../utils/logger");

const idOf = (ref) => (ref?._id ? ref._id.toString() : ref?.toString());

// Run async listeners safely - errors are logged, never thrown to the request
const safe = (handler) => (data) =>
  Promise.resolve(handler(data)).catch((error) =>
    logger.error("Notification listener failed:", error.message)
  );

let registered = false;

function registerNotificationListeners() {
  if (registered) return;
  registered = true;

  // Scenario C - shift created/modified/removed -> employee notified
  eventBus.on(EVENTS.SHIFT_CREATED, safe(({ shift }) =>
    notificationService.notifyUsers([idOf(shift.employeeId)], {
      title: "New shift assigned",
      body: `${shift.date} ${shift.startTime}-${shift.endTime} at ${shift.location}`,
      url: "/shifts"
    })
  ));

  eventBus.on(EVENTS.SHIFT_UPDATED, safe(({ shift, previous }) => {
    const newOwner = idOf(shift.employeeId);
    const recipients = [newOwner];
    if (previous.employeeId !== newOwner) recipients.push(previous.employeeId);
    return notificationService.notifyUsers(recipients, {
      title: "Shift updated",
      body: `Now ${shift.date} ${shift.startTime}-${shift.endTime} at ${shift.location}`,
      url: "/shifts"
    });
  }));

  eventBus.on(EVENTS.SHIFT_DELETED, safe(({ shift }) =>
    notificationService.notifyUsers([idOf(shift.employeeId)], {
      title: "Shift cancelled",
      body: `Your shift on ${shift.date} (${shift.startTime}-${shift.endTime}) was removed`,
      url: "/shifts"
    })
  ));

  // Scenario A - employee submits leave -> managers notified
  eventBus.on(EVENTS.LEAVE_CREATED, safe(({ leave }) =>
    notificationService.notifyManagers({
      title: "New leave request",
      body: `${leave.employeeId?.name || "An employee"} requested leave ${leave.startDate} to ${leave.endDate}`,
      url: "/leave"
    })
  ));

  // Scenario B - manager decision -> employee notified
  eventBus.on(EVENTS.LEAVE_REVIEWED, safe(({ leave }) =>
    notificationService.notifyUsers([idOf(leave.employeeId)], {
      title: `Leave ${leave.status}`,
      body: `Your leave ${leave.startDate} to ${leave.endDate} was ${leave.status}`,
      url: "/leave"
    })
  ));
}

module.exports = { registerNotificationListeners };
