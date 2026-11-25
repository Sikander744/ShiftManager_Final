/**
 * REPOSITORY PATTERN
 * All MongoDB access for shifts lives here. Services call these functions
 * instead of using the Mongoose model directly, so business logic is
 * separated from database code (easier to read, change and test).
 */
const Shift = require("../models/Shift");

const EMPLOYEE_FIELDS = "name email";

const shiftRepository = {
  create(data) {
    return Shift.create(data);
  },

  findById(id) {
    return Shift.findById(id).populate("employeeId", EMPLOYEE_FIELDS);
  },

  findRawById(id) {
    return Shift.findById(id);
  },

  /** filter is built by the service from validated values only */
  findMany(filter = {}) {
    return Shift.find(filter)
      .populate("employeeId", EMPLOYEE_FIELDS)
      .sort({ date: 1, startTime: 1 });
  },

  /** Shifts for one employee on one date (used for conflict detection). */
  findForEmployeeOnDate(employeeId, date, excludeId) {
    const filter = { employeeId, date };
    if (excludeId) filter._id = { $ne: excludeId };
    return Shift.find(filter);
  },

  save(shiftDoc) {
    return shiftDoc.save();
  },

  deleteById(id) {
    return Shift.findByIdAndDelete(id);
  },

  countUpcoming(fromDate) {
    return Shift.countDocuments({ date: { $gte: fromDate } });
  }
};

module.exports = shiftRepository;
