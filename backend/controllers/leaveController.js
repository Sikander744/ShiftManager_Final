const asyncHandler = require("../utils/asyncHandler");
const leaveService = require("../services/leaveService");

exports.createLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.createLeave(req.user, req.body);
  res.status(201).json({ message: "Leave request submitted", leave });
});

exports.getLeaves = asyncHandler(async (req, res) => {
  const leaves = await leaveService.listLeaves(req.user, req.query);
  res.status(200).json({
    message: "Leave requests retrieved successfully",
    count: leaves.length,
    leaves
  });
});

exports.getLeaveById = asyncHandler(async (req, res) => {
  const leave = await leaveService.getLeave(req.user, req.params.id);
  res.status(200).json({ leave });
});

exports.updateLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.updateLeave(req.user, req.params.id, req.body);
  res.status(200).json({ message: "Leave request updated", leave });
});

exports.cancelLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.cancelLeave(req.user, req.params.id);
  res.status(200).json({ message: "Leave request cancelled", id: leave._id });
});

exports.reviewLeave = asyncHandler(async (req, res) => {
  const leave = await leaveService.reviewLeave(req.user, req.params.id, req.body);
  res.status(200).json({ message: `Leave request ${leave.status}`, leave });
});
