/** Authentication business logic. */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const userRepository = require("../repositories/userRepository");
const { isValidEmail, isNonEmptyString, findUnknownFields } = require("../utils/validators");

const SALT_ROUNDS = 12;

const toPublicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role
});

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
}

async function register(body = {}) {
  const unknown = findUnknownFields(body, ["name", "email", "password"]);
  if (unknown.length) {
    // e.g. someone trying to send { role: "manager" } -> privilege escalation blocked
    throw new AppError(`Unexpected field(s): ${unknown.join(", ")}`, 400);
  }

  const { name, email, password } = body;
  if (!isNonEmptyString(name) || !isNonEmptyString(email) || typeof password !== "string" || !password) {
    throw new AppError("All fields are required", 400);
  }
  if (name.trim().length > 80) throw new AppError("Name must be 80 characters or fewer", 400);
  if (password.length < 8) throw new AppError("Password must be at least 8 characters", 400);

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) throw new AppError("Invalid email address", 400);

  if (await userRepository.findByEmail(cleanEmail)) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepository.create({
    name: name.trim(),
    email: cleanEmail,
    passwordHash,
    role: "employee" // public registration can only create employees
  });
  return toPublicUser(user);
}

async function login(body = {}) {
  const { email, password } = body;
  if (!isNonEmptyString(email) || typeof password !== "string" || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await userRepository.findByEmail(email.trim().toLowerCase(), { withPassword: true });
  // Same message for unknown email and wrong password (prevents account enumeration)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Invalid email or password", 401);
  }

  return { token: signToken(user), user: toPublicUser(user) };
}

module.exports = { register, login, signToken, toPublicUser, SALT_ROUNDS };
