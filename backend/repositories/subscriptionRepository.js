/** REPOSITORY PATTERN - all MongoDB access for push subscriptions. */
const PushSubscription = require("../models/PushSubscription");

const subscriptionRepository = {
  /** Insert or re-assign a subscription (endpoint is unique per browser). */
  upsert(userId, endpoint, keys) {
    return PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { userId, endpoint, keys } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
    );
  },

  findByUserIds(userIds) {
    return PushSubscription.find({ userId: { $in: userIds } });
  },

  deleteOwned(userId, endpoint) {
    return PushSubscription.deleteOne({ userId, endpoint });
  },

  deleteByEndpoint(endpoint) {
    return PushSubscription.deleteOne({ endpoint });
  },

  countForUser(userId) {
    return PushSubscription.countDocuments({ userId });
  }
};

module.exports = subscriptionRepository;
