const mongoose = require("mongoose");

/**
 * PushSubscription model - one document per browser/device subscription.
 * The endpoint is unique: if the same browser re-subscribes (or another user
 * logs in on the same browser) the existing document is re-assigned.
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    endpoint: {
      type: String,
      required: true,
      unique: true
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PushSubscription", pushSubscriptionSchema);
