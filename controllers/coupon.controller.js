const asyncHandler = require("express-async-handler");
const couponService = require("../services/coupon.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await couponService.getAll();

  res.json({
    success: true,
    message: "Coupons retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await couponService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Coupon not found.",
    });
  }

  res.json({
    success: true,
    message: "Coupon retrieved successfully.",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await couponService.create(req.body);

  res.status(201).json({
    success: true,
    message: "Coupon created successfully.",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await couponService.update(req.params.id, req.body);

  res.json({
    success: true,
    message: "Coupon updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await couponService.delete(req.params.id);

  res.json({
    success: true,
    message: "Coupon deleted successfully.",
  });
});

exports.checkCoupon = asyncHandler(async (req, res) => {
  const data = await couponService.checkCoupon(req.body);

  res.json({
    success: true,
    message: "Coupon is applicable.",
    data,
  });
});