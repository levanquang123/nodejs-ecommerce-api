const asyncHandler = require("express-async-handler");
const notificationService = require("../services/notification.service");

exports.send = asyncHandler(async (req, res) => {
  const data = await notificationService.sendNotification(req.body);

  res.json({
    success: true,
    message: "Notification sent successfully",
    data,
  });
});

exports.track = asyncHandler(async (req, res) => {
  const data = await notificationService.trackNotification(req.params.id);

  res.json({
    success: true,
    message: "success",
    data,
  });
});

exports.getAll = asyncHandler(async (req, res) => {
  const data = await notificationService.getAll();

  res.json({
    success: true,
    message: "Notifications retrieved successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await notificationService.delete(req.params.id);

  res.json({
    success: true,
    message: "Notification deleted successfully.",
  });
});