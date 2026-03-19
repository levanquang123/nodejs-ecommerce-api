const asyncHandler = require("express-async-handler");
const subCategoryService = require("../services/subCategory.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await subCategoryService.getAll();

  res.json({
    success: true,
    message: "Sub-categories retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await subCategoryService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Sub-category not found.",
    });
  }

  res.json({
    success: true,
    message: "Sub-category retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await subCategoryService.create(req.body);

  res.status(201).json({
    success: true,
    message: "Sub-category created successfully.",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await subCategoryService.update(req.params.id, req.body);

  res.json({
    success: true,
    message: "Sub-category updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await subCategoryService.delete(req.params.id);

  res.json({
    success: true,
    message: "Sub-category deleted successfully.",
  });
});
