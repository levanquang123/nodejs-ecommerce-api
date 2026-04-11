const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    productID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderItemID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 1000,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ productID: 1, userID: 1 }, { unique: true });
reviewSchema.index({ productID: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
