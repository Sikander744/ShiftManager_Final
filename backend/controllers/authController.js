/**
 * Controllers translate HTTP <-> service calls.
 * They contain no business rules and no database code.
 */
const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/authService");

exports.register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ message: "Employee registered successfully", user });
});

exports.login = asyncHandler(async (req, res) => {
  const { token, user } = await authService.login(req.body);
  res.status(200).json({ message: "Login successful", token, user });
});

exports.me = (req, res) => {
  res.status(200).json({ user: req.user });
};
