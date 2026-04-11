const mongoose = require("mongoose");
const Order = require("../model/order");
const Product = require("../model/product");
const Review = require("../model/review");

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isSameObjectId(left, right) {
  return left?.toString() === right?.toString();
}

function assertValidObjectId(id, fieldName) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`${fieldName} is invalid.`, 400);
  }
}

async function refreshProductReviewSummary(productID) {
  const [summary] = await Review.aggregate([
    { $match: { productID: new mongoose.Types.ObjectId(productID) } },
    {
      $group: {
        _id: "$productID",
        ratingAverage: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const reviewSummary = summary
    ? {
        ratingAverage: Math.round(summary.ratingAverage * 10) / 10,
        reviewCount: summary.reviewCount,
      }
    : {
        ratingAverage: 0,
        reviewCount: 0,
      };

  await Product.findByIdAndUpdate(productID, { reviewSummary });
}

async function getDeliveredOrderItem({ userID, productID, orderID, orderItemID }) {
  const order = await Order.findOne({
    _id: orderID,
    userID,
    orderStatus: "delivered",
  });

  if (!order) {
    throw createError("You can only review products from delivered orders.", 403);
  }

  const orderItem = order.items.id(orderItemID);
  if (!orderItem || !isSameObjectId(orderItem.productID, productID)) {
    throw createError("Order item does not match this product.", 400);
  }

  return orderItem;
}

exports.getByProduct = async (productID) => {
  assertValidObjectId(productID, "productId");

  const product = await Product.findById(productID);
  if (!product) throw createError("Product not found.", 404);

  return await Review.find({ productID })
    .populate("userID", "_id email")
    .sort({ createdAt: -1 });
};

exports.create = async (userID, productID, payload) => {
  assertValidObjectId(productID, "productId");

  const product = await Product.findById(productID);
  if (!product) throw createError("Product not found.", 404);

  await getDeliveredOrderItem({
    userID,
    productID,
    orderID: payload.orderID,
    orderItemID: payload.orderItemID,
  });

  const existingReview = await Review.findOne({ productID, userID });
  if (existingReview) {
    throw createError("You already reviewed this product.", 409);
  }

  try {
    const review = await Review.create({
      productID,
      userID,
      orderID: payload.orderID,
      orderItemID: payload.orderItemID,
      rating: payload.rating,
      comment: payload.comment,
      isVerifiedPurchase: true,
    });

    await refreshProductReviewSummary(productID);
    return await Review.findById(review._id).populate("userID", "_id email");
  } catch (error) {
    if (error.code === 11000) {
      throw createError("You already reviewed this product.", 409);
    }
    throw error;
  }
};

exports.update = async (userID, reviewID, payload) => {
  assertValidObjectId(reviewID, "reviewId");

  const review = await Review.findById(reviewID);
  if (!review) throw createError("Review not found.", 404);

  if (!isSameObjectId(review.userID, userID)) {
    throw createError("You can only update your own review.", 403);
  }

  if (payload.rating !== undefined) review.rating = payload.rating;
  if (payload.comment !== undefined) review.comment = payload.comment;

  await review.save();
  await refreshProductReviewSummary(review.productID);

  return await Review.findById(review._id).populate("userID", "_id email");
};

exports.delete = async (userID, reviewID) => {
  assertValidObjectId(reviewID, "reviewId");

  const review = await Review.findById(reviewID);
  if (!review) throw createError("Review not found.", 404);

  if (!isSameObjectId(review.userID, userID)) {
    throw createError("You can only delete your own review.", 403);
  }

  const productID = review.productID;
  await review.deleteOne();
  await refreshProductReviewSummary(productID);
};
