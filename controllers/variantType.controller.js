const asyncHandler = require("express-async-handler");
const variantTypeService = require("../services/variantType.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await variantTypeService.getAll();

  res.json({
    success: true,
    message: "VariantTypes retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await variantTypeService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "VariantType not found.",
    });
  }

  res.json({
    success: true,
    message: "VariantType retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await variantTypeService.create(req.body);

  res.status(201).json({
    success: true,
    message: "VariantType created successfully.",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await variantTypeService.update(req.params.id, req.body);

  res.json({
    success: true,
    message: "VariantType updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await variantTypeService.delete(req.params.id);

  res.json({
    success: true,
    message: "Variant type deleted successfully.",
  });
});