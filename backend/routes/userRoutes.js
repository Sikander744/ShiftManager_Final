const express = require("express");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(protect, authorizeRoles("manager"));

router.get("/employees", userController.getEmployees);
router.get("/stats", userController.getStats);

module.exports = router;
