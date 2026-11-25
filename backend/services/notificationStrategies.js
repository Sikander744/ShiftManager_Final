/**
 * STRATEGY PATTERN - notification delivery strategies.
 *
 * Every strategy has the same interface:  send(subscription, payload) -> Promise
 * The notification service does not care HOW a message is delivered; it just
 * calls strategy.send(). This lets us:
 *   - use real Web Push in development/production (WebPushStrategy)
 *   - log to the console when VAPID keys are not configured (ConsoleStrategy)
 *   - inject a fake strategy in automated tests (no real network calls)
 */
const logger = require("../utils/logger");

/**
 * web-push v4 is an ES module. Node 24 can require() it, but Jest cannot,
 * so it is loaded lazily - only when the real strategy is created
 * (never during automated tests, which inject a fake strategy).
 */
function loadWebPush() {
  const mod = require("web-push");
  return mod.default || mod;
}

class WebPushStrategy {
  constructor({ publicKey, privateKey, subject }) {
    this.webpush = loadWebPush();
    this.webpush.setVapidDetails(subject, publicKey, privateKey);
    this.name = "web-push";
  }

  send(subscription, payload) {
    return this.webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
      { TTL: 60 * 60 } // keep for up to 1 hour if the device is offline
    );
  }
}

class ConsoleStrategy {
  constructor() {
    this.name = "console";
  }

  async send(subscription, payload) {
    logger.info(`[push:console] -> ${subscription.endpoint.slice(0, 40)}...`, payload.title);
    return { statusCode: 201 };
  }
}

function createDefaultStrategy() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (process.env.NODE_ENV !== "test" && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    return new WebPushStrategy({
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
      subject: VAPID_SUBJECT || "mailto:admin@shiftmanager.local"
    });
  }
  return new ConsoleStrategy();
}

module.exports = { WebPushStrategy, ConsoleStrategy, createDefaultStrategy };
