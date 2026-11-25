/** REPOSITORY PATTERN - all MongoDB access for users. */
const User = require("../models/User");

const userRepository = {
  findById(id) {
    return User.findById(id);
  },

  findByEmail(email, { withPassword = false } = {}) {
    const query = User.findOne({ email });
    return withPassword ? query.select("+passwordHash") : query;
  },

  create(data) {
    return User.create(data);
  },

  findEmployees() {
    return User.find({ role: "employee" }).select("name email role").sort({ name: 1 });
  },

  findManagers() {
    return User.find({ role: "manager" }).select("_id");
  },

  countEmployees() {
    return User.countDocuments({ role: "employee" });
  }
};

module.exports = userRepository;
