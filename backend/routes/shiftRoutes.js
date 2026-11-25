const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const shiftController = require("../controllers/shiftController");

const router = express.Router();

// Every shift route requires a logged-in user
router.use(protect);

router
  .route("/")
  .get(shiftController.getShifts) // manager: all, employee: own
  .post(authorizeRoles("manager"), shiftController.createShift);

router
  .route("/:id")
  .get(shiftController.getShiftById) // manager or owning employee
  .put(authorizeRoles("manager"), shiftController.updateShift)
  .delete(authorizeRoles("manager"), shiftController.deleteShift);

module.exports = router;
