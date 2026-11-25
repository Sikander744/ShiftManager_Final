const asyncHandler = require("../utils/asyncHandler");
const userRepository = require("../repositories/userRepository");
const shiftRepository = require("../repositories/shiftRepository");
const leaveRepository = require("../repositories/leaveRepository");

/** GET /api/users/employees - manager only (used for the shift form dropdown). */
exports.getEmployees = asyncHandler(async (req, res) => {
  const employees = await userRepository.findEmployees();
  res.status(200).json({ count: employees.length, employees });
});

/** GET /api/users/stats - manager dashboard statistics (real database counts). */
exports.getStats = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [totalEmployees, upcomingShifts, pendingLeaves] = await Promise.all([
    userRepository.countEmployees(),
    shiftRepository.countUpcoming(today),
    leaveRepository.countByStatus("pending")
  ]);
  res.status(200).json({ totalEmployees, upcomingShifts, pendingLeaves });
});
