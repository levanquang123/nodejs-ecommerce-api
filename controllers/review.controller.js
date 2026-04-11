const asyncHandler = require("express-async-handler");
const reviewService = require("../services/review.service");

exports.getByProduct = asyncHandler(async (req, res) => {
  const data = await reviewService.getByProduct(req.params.productId);

  res.json({
    success: true,
    message: "Reviews retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await reviewService.create(
    req.user.id,
    req.params.productId,
    req.body
  );

  res.status(201).json({
    success: true,
    message: "Review created successfully.",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await reviewService.update(req.user.id, req.params.id, req.body);

  res.json({
    success: true,
    message: "Review updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await reviewService.delete(req.user.id, req.params.id);

  res.json({
    success: true,
    message: "Review deleted successfully.",
  });
});
