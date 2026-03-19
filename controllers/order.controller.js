const asyncHandler = require("express-async-handler");
const orderService = require("../services/order.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await orderService.getAll();

  res.json({
    success: true,
    message: "Orders retrieved successfully.",
    data,
  });
});

exports.getByUserId = asyncHandler(async (req, res) => {
  const data = await orderService.getByUserId(req.params.userId);

  res.json({
    success: true,
    message: "Orders retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await orderService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Order not found.",
    });
  }

  res.json({
    success: true,
    message: "Order retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  await orderService.create(req.body);

  res.json({
    success: true,
    message: "Order created successfully and stock updated.",
  });
});

exports.update = asyncHandler(async (req, res) => {
  await orderService.update(req.params.id, req.body);

  res.json({
    success: true,
    message: "Order updated successfully.",
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await orderService.delete(req.params.id);

  res.json({
    success: true,
    message: "Order deleted successfully.",
  });
});