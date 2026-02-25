const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();
const Coupon = require("../model/couponCode");
const Product = require("../model/product");

// get all coupons
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find()
      .populate("applicableCategory", "name")
      .populate("applicableSubCategory", "name")
      .populate("applicableProduct", "name");
    res.json({
      success: true,
      message: "Coupons retrieved successfully.",
      data: coupons,
    });
  })
);

// Get a coupon by ID
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const couponID = req.params.id;
    const coupon = await Coupon.findById(couponID)
      .populate("applicableCategory", "name")
      .populate("applicableSubCategory", "name")
      .populate("applicableProduct", "name");
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found." });
    }
    res.json({
      success: true,
      message: "Coupon retrieved successfully.",
      data: coupon,
    });
  })
);

// create a coupon
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      couponCode,
      discountType,
      discountAmount,
      minimumPurchaseAmount,
      endDate,
      status,
      applicableCategory,
      applicableSubCategory,
      applicableProduct,
    } = req.body;

    console.log(req.body);
    if (
      !couponCode ||
      !discountType ||
      !discountAmount ||
      !endDate ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "CouponCode, discountType, discountAmount, endDate, and status are required.",
      });
    }

    const newCoupon = new Coupon({
      couponCode,
      discountType,
      discountAmount,
      minimumPurchaseAmount,
      endDate,
      status,
      applicableCategory,
      applicableSubCategory,
      applicableProduct,
    });

    await newCoupon.save();
    res.json({
      success: true,
      message: "Coupon created successfully.",
      data: null,
    });
  })
);

// update a coupon
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const couponID = req.params.id;
    const {
      couponCode,
      discountType,
      discountAmount,
      minimumPurchaseAmount,
      endDate,
      status,
      applicableCategory,
      applicableSubCategory,
      applicableProduct,
    } = req.body;

    console.log(req.body);
    if (
      !couponCode ||
      !discountType ||
      !discountAmount ||
      !endDate ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "CouponCode, discountType, discountAmount, endDate, and status are required.",
      });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponID,
      {
        couponCode,
        discountType,
        discountAmount,
        minimumPurchaseAmount,
        endDate,
        status,
        applicableCategory,
        applicableSubCategory,
        applicableProduct,
      },
      { new: true }
    );

    if (!updatedCoupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found." });
    }

    res.json({
      success: true,
      message: "Coupon updated successfully.",
      data: null,
    });
  })
);

// delete a coupon

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const couponID = req.params.id;
    const deletedCoupon = await Coupon.findByIdAndDelete(couponID);
    if (!deletedCoupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found." });
    }
    res.json({ success: true, message: "Coupon deleted successfully." });
  })
);
// check-coupon
router.post(
  "/check-coupon",
  asyncHandler(async (req, res) => {
    const { couponCode, productIds, purchaseAmount } = req.body;

    const coupon = await Coupon.findOne({ couponCode });

    if (!coupon) {
      return res.json({ success: false, message: "Coupon not found." });
    }
    if (!purchaseAmount) {
      return res.status(400).json({
        success: false,
        message: "purchaseAmount is required",
      });
    }

    if (
      coupon.applicableCategory ||
      coupon.applicableSubCategory ||
      coupon.applicableProduct
    ) {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "productIds is required for this coupon",
        });
      }
    }

    const currentDate = new Date();
    if (coupon.endDate < currentDate) {
      return res.json({ success: false, message: "Coupon is expired." });
    }

    if (coupon.status !== "active") {
      return res.json({ success: false, message: "Coupon is inactive." });
    }

    if (
      coupon.minimumPurchaseAmount &&
      purchaseAmount < coupon.minimumPurchaseAmount
    ) {
      return res.json({
        success: false,
        message: "Minimum purchase amount not met.",
      });
    }

    if (
      !coupon.applicableCategory &&
      !coupon.applicableSubCategory &&
      !coupon.applicableProduct
    ) {
      {
        return res.json({
          success: true,
          message: "Coupon is applicable for all orders.",
          data: coupon,
        });
      }
    }

    const products = await Product.find({ _id: { $in: productIds } });

    const isValid = products.every((product) => {
      if (
        coupon.applicableCategory &&
        coupon.applicableCategory.toString() !==
          product.proCategoryId.toString()
      ) {
        return false;
      }

      if (
        coupon.applicableSubCategory &&
        coupon.applicableSubCategory.toString() !==
          product.proSubCategoryId.toString()
      ) {
        return false;
      }

      if (
        coupon.applicableProduct &&
        !product.proVariantIds.includes(coupon.applicableProduct.toString())
      ) {
        return false;
      }

      return true;
    });

    if (isValid) {
      return res.json({
        success: true,
        message: "Coupon is applicable for the provided products.",
        data: coupon,
      });
    } else {
      return res.json({
        success: false,
        message: "Coupon is not applicable for the provided products.",
      });
    }
  })
);

module.exports = router;
