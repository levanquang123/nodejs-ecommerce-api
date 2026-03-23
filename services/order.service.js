const mongoose = require("mongoose");
const Order = require("../model/order");
const Product = require("../model/product");
const orderPopulate = [
  { path: "couponCode", select: "_id couponCode discountType discountAmount" },
  { path: "userID", select: "_id email" },
];

exports.getAll = async () => {
  return await Order.find()
    .populate(orderPopulate[0])
    .populate(orderPopulate[1])
    .sort({ _id: -1 });
};

exports.getByUserId = async (userId) => {
  return await Order.find({ userID: userId })
    .populate(orderPopulate[0])
    .populate(orderPopulate[1])
    .sort({ _id: -1 });
};

exports.getById = async (id) => {
  return await Order.findById(id)
    .populate(orderPopulate[0])
    .populate(orderPopulate[1]);
};

exports.create = async (body) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      userID,
      orderStatus,
      items,
      totalPrice,
      shippingAddress,
      paymentMethod,
      couponCode,
      orderTotal,
      trackingUrl,
    } = body;

    for (const item of items) {
      const product = await Product.findById(item.productID).session(session);

      if (!product) {
        throw new Error("Product not found.");
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Product ${product.name} is out of stock.`);
      }
    }

    const order = new Order({
      userID,
      orderStatus,
      items,
      totalPrice,
      shippingAddress,
      paymentMethod,
      couponCode,
      orderTotal,
      trackingUrl,
    });

    await order.save({ session });

    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productID,
          quantity: { $gte: item.quantity },
        },
        {
          $inc: { quantity: -item.quantity },
        },
        { session }
      );

      if (!updated) {
        throw new Error("Out of stock");
      }
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};

exports.update = async (id, { orderStatus, trackingUrl }) => {
  const updated = await Order.findByIdAndUpdate(
    id,
    { orderStatus, trackingUrl },
    { new: true }
  );

  if (!updated) {
    throw new Error("Order not found.");
  }

  return updated;
};

exports.delete = async (id) => {
  const deleted = await Order.findByIdAndDelete(id);

  if (!deleted) {
    throw new Error("Order not found.");
  }
};
