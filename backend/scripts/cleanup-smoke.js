/**
 * Removes test data created by scripts/api-smoke-test.ps1 and the Postman collection:
 *  - leave requests whose reason starts with "[smoke]" or "[postman]"
 *  - shifts dated 2030 or later (test scripts use random future years)
 *  - users registered by Postman (postman<timestamp>@example.com)
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const LeaveRequest = require("../models/LeaveRequest");
const Shift = require("../models/Shift");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const leaves = await LeaveRequest.deleteMany({
    $or: [{ reason: /^\[(smoke|postman)\]/ }, { startDate: { $gte: "2030-01-01" } }]
  });
  const shifts = await Shift.deleteMany({ date: { $gte: "2030-01-01" } });
  const users = await User.deleteMany({ email: /^(postman|smoke)\d+[a-z]?@example\.com$/, role: "employee" });
  console.log(
    `Removed ${leaves.deletedCount} test leave requests, ${shifts.deletedCount} test shifts, ${users.deletedCount} test users`
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error("Cleanup failed:", e.message);
  process.exit(1);
});
