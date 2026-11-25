const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const leaveController = require("../controllers/leaveController");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(leaveController.getLeaves) // manager: all, employee: own
  .post(authorizeRoles("employee"), leaveController.createLeave);

router
  .route("/:id")
  .get(leaveController.getLeaveById) // manager or owner
  .put(authorizeRoles("employee"), leaveController.updateLeave) // owner, pending only
  .delete(authorizeRoles("employee"), leaveController.cancelLeave); // owner, pending only

router.patch("/:id/status", authorizeRoles("manager"), leaveController.reviewLeave);

module.exports = router;
