const mongoose = require("mongoose");

/**
 * LeaveRequest model.
 * Lifecycle: pending -> approved | rejected  (reviewed requests are final)
 */
const LEAVE_STATUSES = ["pending", "approved", "rejected"];

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    endDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    status: {
      type: String,
      enum: LEAVE_STATUSES,
      default: "pending"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employeeId: 1, startDate: 1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
module.exports.LEAVE_STATUSES = LEAVE_STATUSES;
