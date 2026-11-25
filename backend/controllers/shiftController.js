const asyncHandler = require("../utils/asyncHandler");
const shiftService = require("../services/shiftService");

exports.createShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.createShift(req.body);
  res.status(201).json({ message: "Shift created successfully", shift });
});

exports.getShifts = asyncHandler(async (req, res) => {
  const shifts = await shiftService.listShifts(req.user, req.query);
  res.status(200).json({
    message: "Shifts retrieved successfully",
    count: shifts.length,
    shifts
  });
});

exports.getShiftById = asyncHandler(async (req, res) => {
  const shift = await shiftService.getShift(req.user, req.params.id);
  res.status(200).json({ shift });
});

exports.updateShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.updateShift(req.params.id, req.body);
  res.status(200).json({ message: "Shift updated successfully", shift });
});

exports.deleteShift = asyncHandler(async (req, res) => {
  const shift = await shiftService.deleteShift(req.params.id);
  res.status(200).json({ message: "Shift deleted successfully", id: shift._id });
});
