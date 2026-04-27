const asyncHandler = require("express-async-handler");
const brandService = require("../services/brand.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await brandService.getAll();

  res.json({
    success: true,
    message: "Brand retrieved successfully",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await brandService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      requestId: req.requestId,
      message: "Brand not found.",
    });
  }

  res.json({
    success: true,
    message: "Brand retrieved successfully",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await brandService.create(req.body);

  res.status(201).json({
    success: true,
    message: "Create brand successfully",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await brandService.update(req.params.id, req.body);

  res.json({
    success: true,
    message: "Update brand successfully",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await brandService.delete(req.params.id);

  res.json({
    success: true,
    message: "Brand deleted successfully.",
  });
});
