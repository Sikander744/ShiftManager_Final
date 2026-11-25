/**
 * Notification service - stores subscriptions and sends push messages
 * using the currently selected delivery strategy (see notificationStrategies.js).
 */
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const subscriptionRepository = require("../repositories/subscriptionRepository");
const userRepository = require("../repositories/userRepository");
const { createDefaultStrategy } = require("./notificationStrategies");
const { isValidObjectId, isNonEmptyString, findUnknownFields } = require("../utils/validators");

let strategy = createDefaultStrategy();

/** Swap the delivery strategy (used by tests). */
function setStrategy(newStrategy) {
  strategy = newStrategy;
}

function getStrategyName() {
  return strategy.name;
}

function getPublicKey() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) throw new AppError("Push notifications are not configured on the server", 503);
  return key;
}

function validateSubscription(body = {}) {
  const unknown = findUnknownFields(body, ["endpoint", "keys", "expirationTime"]);
  if (unknown.length) throw new AppError(`Unexpected field(s): ${unknown.join(", ")}`, 400);

  const { endpoint, keys } = body;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new AppError("Invalid subscription: endpoint must be a valid URL", 400);
  }
  if (url.protocol !== "https:") {
    throw new AppError("Invalid subscription: endpoint must use HTTPS", 400);
  }
  if (!keys || !isNonEmptyString(keys.p256dh) || !isNonEmptyString(keys.auth)) {
    throw new AppError("Invalid subscription: keys.p256dh and keys.auth are required", 400);
  }
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

async function subscribe(user, body) {
  const { endpoint, keys } = validateSubscription(body);
  return subscriptionRepository.upsert(user.id, endpoint, keys);
}

async function unsubscribe(user, body = {}) {
  if (!isNonEmptyString(body.endpoint)) throw new AppError("endpoint is required", 400);
  const result = await subscriptionRepository.deleteOwned(user.id, body.endpoint);
  if (result.deletedCount === 0) throw new AppError("Subscription not found", 404);
}

/**
 * Sends a payload to every subscription belonging to the given users.
 * Expired/invalid subscriptions (HTTP 404/410 from the push service) are removed.
 * Never throws - a failed notification must not break the main operation.
 */
async function notifyUsers(userIds, payload) {
  const ids = [...new Set(userIds.map(String))];
  const subscriptions = await subscriptionRepository.findByUserIds(ids);
  const summary = { sent: 0, failed: 0, removed: 0 };

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await strategy.send(sub, payload);
        summary.sent += 1;
      } catch (error) {
        summary.failed += 1;
        if (error.statusCode === 404 || error.statusCode === 410) {
          await subscriptionRepository.deleteByEndpoint(sub.endpoint);
          summary.removed += 1;
          logger.warn("Removed expired push subscription", sub.endpoint.slice(0, 40));
        } else {
          logger.error("Push send failed:", error.statusCode || "", error.message);
        }
      }
    })
  );

  logger.info(`Push "${payload.title}" -> users=${ids.length} sent=${summary.sent} failed=${summary.failed}`);
  return summary;
}

async function notifyManagers(payload) {
  const managers = await userRepository.findManagers();
  return notifyUsers(managers.map((m) => m._id), payload);
}

/** Manager-only test trigger. Defaults to the manager's own devices. */
async function sendTest(manager, body = {}) {
  const target = body.userId ?? manager.id;
  if (!isValidObjectId(String(target))) throw new AppError("Invalid user ID", 400);
  const user = await userRepository.findById(target);
  if (!user) throw new AppError("User not found", 404);

  const count = await subscriptionRepository.countForUser(target);
  if (count === 0) throw new AppError("This user has no push subscriptions", 404);

  return notifyUsers([target], {
    title: "ShiftManager test notification",
    body: `Hello ${user.name}, push notifications are working.`,
    url: "/"
  });
}

module.exports = {
  setStrategy,
  getStrategyName,
  getPublicKey,
  validateSubscription,
  subscribe,
  unsubscribe,
  notifyUsers,
  notifyManagers,
  sendTest
};
