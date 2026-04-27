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
  const data = await orderService.getByUserId(req.params.userId, req.user);

  res.json({
    success: true,
    message: "Orders retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await orderService.getById(req.params.id, req.user);

  if (!data) {
    return res.status(404).json({
      success: false,
      requestId: req.requestId,
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
  if (req.body.paymentMethod === "prepaid") {
    return res.status(400).json({
      success: false,
      requestId: req.requestId,
      message: "Use /payment/stripe to create prepaid orders.",
    });
  }

  const data = await orderService.create(req.user.id, req.body, {
    deferStock: false,
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully and stock updated.",
    data,
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
