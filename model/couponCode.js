const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    discountType: {
      type: String,
      enum: ["fixed", "percentage"],
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      validate: {
        validator(value) {
          if (value <= 0) return false;
          if (this.discountType === "percentage") return value <= 100;
          return true;
        },
        message: "Discount amount is not valid for the selected discount type.",
      },
    },
    minimumPurchaseAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    applicableCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    applicableSubCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },
    applicableProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
