const asyncHandler = require("../utils/asyncHandler");
const notificationService = require("../services/notificationService");

exports.getPublicKey = (req, res, next) => {
  try {
    res.status(200).json({ publicKey: notificationService.getPublicKey() });
  } catch (error) {
    next(error);
  }
};

exports.subscribe = asyncHandler(async (req, res) => {
  const sub = await notificationService.subscribe(req.user, req.body);
  res.status(201).json({ message: "Subscription saved", id: sub._id });
});

exports.unsubscribe = asyncHandler(async (req, res) => {
  await notificationService.unsubscribe(req.user, req.body);
  res.status(200).json({ message: "Subscription removed" });
});

exports.sendTest = asyncHandler(async (req, res) => {
  const summary = await notificationService.sendTest(req.user, req.body);
  res.status(200).json({ message: "Test notification processed", ...summary });
});
