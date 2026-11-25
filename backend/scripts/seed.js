/**
 * Development seed script – creates the manager account (only if it does not exist).
 * Public registration can only create employees, so the first manager is created here.
 *
 * Usage (PowerShell):
 *   cd C:\ShiftManager_Final\backend
 *   node scripts/seed.js
 *
 * Optional: override in .env with SEED_MANAGER_EMAIL, SEED_MANAGER_PASSWORD, SEED_MANAGER_NAME
 */
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const manager = {
  name: process.env.SEED_MANAGER_NAME || "Ankush",
  email: (process.env.SEED_MANAGER_EMAIL || "ankush12@gmail.com").toLowerCase(),
  password: process.env.SEED_MANAGER_PASSWORD || "12345678"
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: manager.email });
  if (existing) {
    if (existing.role !== "manager") {
      existing.role = "manager";
      await existing.save();
      console.log(`Promoted to manager: ${manager.email}`);
    } else {
      console.log(`Manager already exists: ${manager.email}`);
    }
  } else {
    const passwordHash = await bcrypt.hash(manager.password, 12);
    await User.create({ name: manager.name, email: manager.email, passwordHash, role: "manager" });
    console.log(`Created manager: ${manager.email}`);
  }

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
