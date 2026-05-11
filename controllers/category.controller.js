const asyncHandler = require("express-async-handler");
const categoryService = require("../services/category.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await categoryService.getAll();

  res.json({
    success: true,
    message: "Categories retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await categoryService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      requestId: req.requestId,
      message: "Category not found",
    });
  }

  res.json({
    success: true,
    message: "Category retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const image = req.file ? req.file.path : "no_url";

  const data = await categoryService.create({
    name: req.body.name,
    image,
  });

  res.status(201).json({
    success: true,
    message: "Category created successfully.",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const image = req.file ? req.file.path : null;

  const data = await categoryService.update(req.params.id, {
    name: req.body.name,
    image,
  });

  res.json({
    success: true,
    message: "Category updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await categoryService.delete(req.params.id);

  res.json({
    success: true,
    message: "Category deleted successfully.",
  });
});
