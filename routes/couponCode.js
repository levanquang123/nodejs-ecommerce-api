const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();
const Coupon = require("../model/couponCode");
const Product = require("../model/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// get all coupons
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find()
      .populate("applicableCategory", "id name")
      .populate("applicableSubCategory", "id name")
      .populate("applicableProduct", "id name");
    res.json({
      success: true,
      message: "Coupons retrieved successfully.",
      data: coupons,
    });
  })
);

// get a coupon by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const couponID = req.params.id;
    const coupon = await Coupon.findById(couponID)
      .populate("applicableCategory", "id name")
      .populate("applicableSubCategory", "id name")
      .populate("applicableProduct", "id name");
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }
    res.json({
      success: true,
      message: "Coupon retrieved successfully.",
      data: coupon,
    });
  })
);

// create a new coupon
router.post(
  "/",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    let {
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

    if (
      !couponCode ||
      !discountType ||
      !discountAmount ||
      !endDate ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message: "Code, discountType, discountAmount, endDate, and status are required.",
      });
    }

    couponCode = couponCode.toLowerCase();

    const existCoupon = await Coupon.findOne({ couponCode });
    if (existCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon already exists.",
      });
    }

    const coupon = new Coupon({
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

    await coupon.save();

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
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const couponID = req.params.id;

    let {
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

    if (
      !couponCode ||
      !discountType ||
      !discountAmount ||
      !endDate ||
      !status
    ) {
      return res.status(400).json({
        success: false,
        message: "CouponCode, discountType, discountAmount, endDate, and status are required.",
      });
    }

    couponCode = couponCode.toLowerCase();

    const existCoupon = await Coupon.findOne({
      couponCode,
      _id: { $ne: couponID },
    });

    if (existCoupon) {
      return res.status(400).json({
        success: false,
        message: "Coupon already exists.",
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
      return res.status(404).json({
        success: false,
        message: "Coupon not found.",
      });
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
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const couponID = req.params.id;
    const deletedCoupon = await Coupon.findByIdAndDelete(couponID);
    if (!deletedCoupon) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }
    res.json({ success: true, message: "Coupon deleted successfully." });
  })
);

router.post(
  "/check-coupon",
  asyncHandler(async (req, res) => {
    const { couponCode, productIds, purchaseAmount } = req.body;

    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res.json({ success: false, message: "Coupon not found." });
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
      return res.json({
        success: true,
        message: "Coupon is applicable for all orders.",
        data: coupon,
      });
    }

    const products = await Product.find({ _id: { $in: productIds } });
    if (!products.length) {
      return res.json({ success: false, message: "No products found to validate." });
    }

    const isValid = products.every((product) => {
      if (
        coupon.applicableCategory &&
        coupon.applicableCategory.toString() !== product.proCategoryId.toString()
      ) {
        return false;
      }
      if (
        coupon.applicableSubCategory &&
        coupon.applicableSubCategory.toString() !== product.proSubCategoryId.toString()
      ) {
        return false;
      }
      if (
        coupon.applicableProduct &&
        product._id.toString() !== coupon.applicableProduct.toString()
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
    }
    return res.json({
      success: false,
      message: "Coupon is not applicable for the provided products.",
    });
  })
);

module.exports = router;
