/** Shared helpers for integration tests. */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");

const PASSWORD = "Password123!";

async function connectTestDb() {
  await mongoose.connect(process.env.MONGO_URI_TEST);
}

async function clearDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function disconnectTestDb() {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}

/** Creates a user directly in the DB and logs in through the real API. */
async function createUserAndLogin({ name, email, role }) {
  const passwordHash = await bcrypt.hash(PASSWORD, 4); // low cost = fast tests
  const user = await User.create({ name, email, role, passwordHash });
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  return { user, id: user._id.toString(), token: res.body.token };
}

async function createStandardUsers() {
  const manager = await createUserAndLogin({ name: "Mia Manager", email: "manager@test.com", role: "manager" });
  const employee = await createUserAndLogin({ name: "Eli Employee", email: "employee@test.com", role: "employee" });
  const employee2 = await createUserAndLogin({ name: "Ana Employee", email: "employee2@test.com", role: "employee" });
  return { manager, employee, employee2 };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
  app,
  request,
  PASSWORD,
  connectTestDb,
  clearDb,
  disconnectTestDb,
  createUserAndLogin,
  createStandardUsers,
  auth
};
