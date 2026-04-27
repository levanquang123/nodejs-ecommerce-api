const asyncHandler = require("express-async-handler");
const productService = require("../services/product.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await productService.getAll();

  res.json({
    success: true,
    message: "Products retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await productService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      requestId: req.requestId,
      message: "Product not found.",
    });
  }

  res.json({
    success: true,
    message: "Product retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await productService.create(req);

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await productService.update(req.params.id, req);

  res.json({
    success: true,
    message: "Product updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await productService.delete(req.params.id);

  res.json({
    success: true,
    message: "Product deleted successfully.",
  });
});
