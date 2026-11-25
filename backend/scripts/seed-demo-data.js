/**
 * Adds demo shifts (next 7 days) and one pending leave request for the
 * employees that are registered (up to 2). Register employees in the app first.
 * Only adds a shift if that employee has no shift on that date.
 *
 * Usage: node scripts/seed-demo-data.js
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const User = require("../models/User");
const Shift = require("../models/Shift");
const LeaveRequest = require("../models/LeaveRequest");

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PLAN = [
  [[1, "09:00", "17:00", "Front Desk"], [2, "12:00", "20:00", "Cafe Floor"], [4, "07:00", "15:00", "Kitchen"]],
  [[1, "06:00", "14:00", "Kitchen"], [3, "14:00", "22:00", "Bar"], [5, "10:00", "18:00", "Front Desk"]]
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const employees = await User.find({ role: "employee" }).sort({ createdAt: 1 }).limit(2);
  if (employees.length === 0) {
    console.log("No employees found - register an employee in the app first, then run this again.");
    return mongoose.disconnect();
  }

  let created = 0;
  for (const [index, employee] of employees.entries()) {
    for (const [offset, startTime, endTime, location] of PLAN[index]) {
      const date = isoDate(offset);
      if (!(await Shift.findOne({ employeeId: employee._id, date }))) {
        await Shift.create({ employeeId: employee._id, date, startTime, endTime, location });
        created += 1;
      }
    }
  }

  const leaveOwner = employees[employees.length - 1];
  const leaveExists = await LeaveRequest.findOne({ employeeId: leaveOwner._id, status: "pending" });
  if (!leaveExists) {
    await LeaveRequest.create({
      employeeId: leaveOwner._id,
      startDate: isoDate(10),
      endDate: isoDate(12),
      reason: "Family gathering"
    });
  }

  console.log(
    `Demo data ready for ${employees.map((e) => e.email).join(", ")}: ${created} shift(s) added` +
      (leaveExists ? "" : `, 1 pending leave request for ${leaveOwner.email}`)
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error("Demo seed failed:", e.message);
  process.exit(1);
});
