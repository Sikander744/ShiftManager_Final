const mongoose = require("mongoose");

/**
 * Shift model.
 * date      -> "YYYY-MM-DD" string (easy to sort/compare, no timezone issues)
 * startTime -> "HH:mm" 24-hour string
 * endTime   -> "HH:mm" 24-hour string (must be after startTime; same-day policy)
 */
const shiftSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    }
  },
  { timestamps: true }
);

// Speeds up "shifts for employee X on date Y" (used by conflict detection)
shiftSchema.index({ employeeId: 1, date: 1 });

module.exports = mongoose.model("Shift", shiftSchema);
