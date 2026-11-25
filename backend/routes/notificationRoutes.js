const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

// Public: the VAPID PUBLIC key is safe to share (the private key never leaves the server)
router.get("/public-key", notificationController.getPublicKey);

router.post("/subscribe", protect, notificationController.subscribe);
router.delete("/subscribe", protect, notificationController.unsubscribe);
router.post("/test", protect, authorizeRoles("manager"), notificationController.sendTest);

module.exports = router;
