const asyncHandler = require("express-async-handler");
const variantService = require("../services/variant.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await variantService.getAll();

  res.json({
    success: true,
    message: "Variants retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await variantService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      requestId: req.requestId,
      message: "Variant not found.",
    });
  }

  res.json({
    success: true,
    message: "Variant retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await variantService.create(req.body);

  res.status(201).json({
    success: true,
    message: "Variant created successfully.",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await variantService.update(req.params.id, req.body);

  res.json({
    success: true,
    message: "Variant updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await variantService.delete(req.params.id);

  res.json({
    success: true,
    message: "Variant deleted successfully.",
  });
});
