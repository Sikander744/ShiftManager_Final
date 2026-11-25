const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    // select:false -> the hash is never returned unless explicitly requested
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["employee", "manager"],
      default: "employee"
    }
  },
  {
    timestamps: true,
    toJSON: {
      // Extra safety: strip the hash even if it was selected
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model("User", userSchema);
