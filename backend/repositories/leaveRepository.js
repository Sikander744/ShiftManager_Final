/** REPOSITORY PATTERN - all MongoDB access for leave requests. */
const LeaveRequest = require("../models/LeaveRequest");

const leaveRepository = {
  create(data) {
    return LeaveRequest.create(data);
  },

  findById(id) {
    return LeaveRequest.findById(id)
      .populate("employeeId", "name email")
      .populate("reviewedBy", "name email");
  },

  findRawById(id) {
    return LeaveRequest.findById(id);
  },

  findMany(filter = {}) {
    return LeaveRequest.find(filter)
      .populate("employeeId", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });
  },

  /** Pending/approved requests of one employee that overlap a date range. */
  findOverlapping(employeeId, startDate, endDate, excludeId) {
    const filter = {
      employeeId,
      status: { $in: ["pending", "approved"] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    };
    if (excludeId) filter._id = { $ne: excludeId };
    return LeaveRequest.find(filter);
  },

  save(doc) {
    return doc.save();
  },

  deleteById(id) {
    return LeaveRequest.findByIdAndDelete(id);
  },

  countByStatus(status) {
    return LeaveRequest.countDocuments({ status });
  }
};

module.exports = leaveRepository;
