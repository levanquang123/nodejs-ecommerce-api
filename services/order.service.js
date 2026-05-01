const mongoose = require("mongoose");
const Order = require("../model/order");
const PaymentSession = require("../model/paymentSession");
const Product = require("../model/product");
const Coupon = require("../model/couponCode");
const orderPopulate = [
  { path: "couponCode", select: "_id couponCode discountType discountAmount" },
  { path: "userID", select: "_id email" },
];

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isAdmin(user) {
  return user && (user.role === "admin" || user.role === "superadmin");
}

function isVisibleToCustomer(order) {
  return order.paymentMethod !== "prepaid" || order.paymentStatus === "paid";
}

function canAccessUserResource(targetUserId, currentUser) {
  return isAdmin(currentUser) || currentUser?.id === targetUserId.toString();
}

async function findOrderById(id) {
  return await Order.findById(id)
    .populate(orderPopulate[0])
    .populate(orderPopulate[1]);
}

function toAttributeSnapshot(attributes) {
  if (!Array.isArray(attributes)) return [];

  return attributes.map((attribute) => ({
    variantTypeId:
      attribute.variantTypeId?._id ||
      attribute.variantTypeId ||
      null,
    variantTypeName:
      attribute.variantTypeId?.name ||
      attribute.variantTypeName ||
      "",
    variantId: attribute.variantId?._id || attribute.variantId || null,
    variantName: attribute.variantId?.name || attribute.variantName || "",
  }));
}

function buildVariantLabel(attributes) {
  return attributes
    .map((attribute) => {
      if (!attribute.variantTypeName || !attribute.variantName) return "";
      return `${attribute.variantTypeName}: ${attribute.variantName}`;
    })
    .filter(Boolean)
    .join(", ");
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;

  if (coupon.discountType === "percentage") {
    return roundMoney(subtotal * (coupon.discountAmount / 100));
  }

  return roundMoney(Math.min(coupon.discountAmount, subtotal));
}

async function validateCoupon({ couponCode, normalizedItems, subtotal, session }) {
  if (!couponCode) return { coupon: null, discount: 0 };

  const coupon = await Coupon.findById(couponCode).session(session);
  if (!coupon) {
    throw createError("Coupon not found.", 400);
  }

  const currentDate = new Date();
  if (coupon.endDate < currentDate) {
    throw createError("Coupon is expired.", 400);
  }

  if (coupon.status !== "active") {
    throw createError("Coupon is inactive.", 400);
  }

  if (coupon.minimumPurchaseAmount && subtotal < coupon.minimumPurchaseAmount) {
    throw createError("Minimum purchase amount not met.", 400);
  }

  const productIds = normalizedItems.map((item) => item.productID);
  const products = await Product.find({ _id: { $in: productIds } }).session(session);
  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  const isApplicable = normalizedItems.every((item) => {
    const product = productMap.get(item.productID.toString());
    if (!product) return false;

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
      coupon.applicableProduct.toString() !== product._id.toString()
    ) {
      return false;
    }

    return true;
  });

  if (!isApplicable) {
    throw createError("Coupon is not applicable for the provided products.", 400);
  }

  return {
    coupon,
    discount: calculateCouponDiscount(coupon, subtotal),
  };
}

async function normalizeOrderItems(items, session) {
  const normalizedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productID)
      .populate("variants.attributes.variantTypeId", "name type")
      .populate("variants.attributes.variantId", "name variantTypeId")
      .session(session);

    if (!product) {
      throw createError("Product not found.", 400);
    }

    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const requestedVariantId =
      item.variantId === undefined || item.variantId === null || item.variantId === ""
        ? null
        : String(item.variantId);

    let selectedVariant = null;
    let unitPrice = product.offerPrice !== undefined && product.offerPrice !== null
      ? product.offerPrice
      : product.price;
    let image = product.images?.[0]?.url || "";
    let variantLabel = "";
    let sku = "";
    let attributes = [];

    if (hasVariants) {
      if (!requestedVariantId || !mongoose.Types.ObjectId.isValid(requestedVariantId)) {
        throw createError(`variantId is required and must be valid for product ${product.name}.`, 400);
      }

      selectedVariant = product.variants.find(
        (variant) =>
          variant._id.toString() === requestedVariantId && variant.isActive !== false
      );

      if (!selectedVariant) {
        throw createError(`Selected variant was not found for product ${product.name}.`, 400);
      }

      if (selectedVariant.quantity < item.quantity) {
        throw createError(`Variant ${selectedVariant.sku} of product ${product.name} is out of stock.`, 400);
      }

      unitPrice =
        selectedVariant.offerPrice !== undefined && selectedVariant.offerPrice !== null
          ? selectedVariant.offerPrice
          : selectedVariant.price;
      image = selectedVariant.images?.[0]?.url || image;
      sku = selectedVariant.sku;
      attributes = toAttributeSnapshot(selectedVariant.attributes);
      variantLabel = buildVariantLabel(attributes);
    } else if (product.quantity < item.quantity) {
      throw createError(`Product ${product.name} is out of stock.`, 400);
    }

    normalizedItems.push({
      productID: product._id,
      productName: product.name,
      quantity: item.quantity,
      price: unitPrice,
      variant: variantLabel,
      variantId: selectedVariant?._id || null,
      sku,
      attributes,
      image,
    });
  }

  return normalizedItems;
}

async function decrementStockForItems(normalizedItems, session) {
  for (const item of normalizedItems) {
    if (item.variantId) {
      const updatedVariantStock = await Product.findOneAndUpdate(
        {
          _id: item.productID,
          variants: {
            $elemMatch: {
              _id: item.variantId,
              quantity: { $gte: item.quantity },
              isActive: { $ne: false },
            },
          },
        },
        {
          $inc: { "variants.$.quantity": -item.quantity },
        },
        { session }
      );

      if (!updatedVariantStock) {
        throw createError("Out of stock.", 409);
      }
    } else {
      const updatedProductStock = await Product.findOneAndUpdate(
        {
          _id: item.productID,
          quantity: { $gte: item.quantity },
        },
        {
          $inc: { quantity: -item.quantity },
        },
        { session }
      );

      if (!updatedProductStock) {
        throw createError("Out of stock.", 409);
      }
    }
  }
}

async function buildOrderSnapshot({ userID, body, session }) {
  const { items, shippingAddress, paymentMethod, couponCode } = body;
  const normalizedItems = await normalizeOrderItems(items, session);
  const subtotal = roundMoney(
    normalizedItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    )
  );
  const { coupon, discount } = await validateCoupon({
    couponCode,
    normalizedItems,
    subtotal,
    session,
  });
  const total = roundMoney(Math.max(0, subtotal - discount));

  return {
    userID,
    items: normalizedItems,
    totalPrice: subtotal,
    shippingAddress,
    paymentMethod,
    couponCode: coupon?._id,
    orderTotal: {
      subtotal,
      discount,
      total,
    },
  };
}

exports.getAll = async () => {
  return await Order.find()
    .populate(orderPopulate[0])
    .populate(orderPopulate[1])
    .sort({ _id: -1 });
};

exports.getByUserId = async (userId, currentUser) => {
  if (!canAccessUserResource(userId, currentUser)) {
    throw createError("You can only access your own orders.", 403);
  }

  const filter = { userID: userId };
  if (!isAdmin(currentUser)) {
    filter.$or = [
      { paymentMethod: { $ne: "prepaid" } },
      { paymentStatus: "paid" },
    ];
  }

  return await Order.find(filter)
    .populate(orderPopulate[0])
    .populate(orderPopulate[1])
    .sort({ _id: -1 });
};

exports.getById = async (id, currentUser) => {
  const order = await findOrderById(id);

  if (!order) return null;

  if (!canAccessUserResource(order.userID._id || order.userID, currentUser)) {
    throw createError("You can only access your own orders.", 403);
  }

  if (!isAdmin(currentUser) && !isVisibleToCustomer(order)) {
    return null;
  }

  return order;
};

exports.create = async (userID, body, options = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const snapshot = await buildOrderSnapshot({ userID, body, session });
    const deferStock = options.deferStock === true;

    const order = new Order({
      ...snapshot,
      orderStatus:
        options.orderStatus || (deferStock ? "pending_payment" : "pending"),
      paymentStatus:
        options.paymentStatus || (deferStock ? "requires_payment" : "unpaid"),
      paymentIntentId: options.paymentIntentId,
      stockReservedAt: deferStock ? undefined : new Date(),
    });

    await order.save({ session });

    if (!deferStock) {
      await decrementStockForItems(snapshot.items, session);
    }

    await session.commitTransaction();
    session.endSession();
    return await findOrderById(order._id);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};

exports.createPendingPayment = async (userID, body) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const snapshot = await buildOrderSnapshot({
      userID,
      body: { ...body, paymentMethod: "prepaid" },
      session,
    });

    const paymentSession = new PaymentSession({
      ...snapshot,
      paymentStatus: "requires_payment",
    });

    await paymentSession.save({ session });
    await session.commitTransaction();
    session.endSession();
    return paymentSession;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.attachPaymentIntent = async (paymentSessionId, paymentIntentId) => {
  const updated = await PaymentSession.findByIdAndUpdate(
    paymentSessionId,
    { paymentIntentId },
    { new: true }
  );

  if (!updated) {
    throw createError("Payment session not found.", 404);
  }

  return updated;
};

exports.cancelPendingPaymentOrder = async (paymentSessionId) => {
  if (!paymentSessionId) return null;

  return await PaymentSession.findOneAndUpdate(
    {
      _id: paymentSessionId,
      paymentStatus: { $ne: "paid" },
    },
    {
      paymentStatus: "cancelled",
      orderStatus: "cancelled",
    },
    { new: true }
  );
};

exports.markPaymentSucceeded = async (paymentIntentId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingPaidOrder = await Order.findOne({ paymentIntentId }).session(
      session
    );
    if (existingPaidOrder?.paymentStatus === "paid") {
      await session.commitTransaction();
      session.endSession();
      return existingPaidOrder;
    }

    const paymentSession = await PaymentSession.findOne({
      paymentIntentId,
    }).session(session);

    if (paymentSession) {
      if (paymentSession.paymentStatus === "paid" && paymentSession.completedOrder) {
        const completedOrder = await Order.findById(
          paymentSession.completedOrder
        ).session(session);
        await session.commitTransaction();
        session.endSession();
        return completedOrder;
      }

      await decrementStockForItems(paymentSession.items, session);

      const order = new Order({
        userID: paymentSession.userID,
        items: paymentSession.items,
        totalPrice: paymentSession.totalPrice,
        shippingAddress: paymentSession.shippingAddress,
        paymentMethod: "prepaid",
        paymentStatus: "paid",
        paymentIntentId,
        orderStatus: "pending",
        stockReservedAt: new Date(),
        couponCode: paymentSession.couponCode,
        orderTotal: paymentSession.orderTotal,
      });

      await order.save({ session });

      paymentSession.paymentStatus = "paid";
      paymentSession.completedOrder = order._id;
      await paymentSession.save({ session });

      await session.commitTransaction();
      session.endSession();
      return order;
    }

    const order = await Order.findOne({ paymentIntentId }).session(session);
    if (!order) {
      throw createError("Order not found for payment intent.", 404);
    }

    if (order.paymentStatus === "paid") {
      await session.commitTransaction();
      session.endSession();
      return order;
    }

    await decrementStockForItems(order.items, session);

    order.paymentStatus = "paid";
    order.orderStatus = "pending";
    order.stockReservedAt = new Date();
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();
    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

exports.markPaymentFailed = async (paymentIntentId, status = "failed") => {
  const paymentSession = await PaymentSession.findOneAndUpdate(
    { paymentIntentId, paymentStatus: { $ne: "paid" } },
    {
      paymentStatus: status,
    },
    { new: true }
  );

  if (paymentSession) return paymentSession;

  return await Order.findOneAndUpdate(
    { paymentIntentId, paymentStatus: { $ne: "paid" } },
    {
      paymentStatus: status,
      orderStatus: "cancelled",
    },
    { new: true }
  );
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
