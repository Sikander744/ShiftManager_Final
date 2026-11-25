/**
 * Development helper: reset a user's password (e.g. forgotten test account).
 *
 * Usage (PowerShell):
 *   node scripts/resetPassword.js employee1@example.com NewPassword123!
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function run() {
  const [email, newPassword] = process.argv.slice(2);
  if (!email || !newPassword || newPassword.length < 8) {
    console.log("Usage: node scripts/resetPassword.js <email> <newPassword (min 8 chars)>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const result = await User.updateOne(
    { email: email.trim().toLowerCase() },
    { $set: { passwordHash } }
  );
  console.log(result.matchedCount ? `Password reset for ${email}` : `No user found: ${email}`);
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error("Reset failed:", error.message);
  process.exit(1);
});
