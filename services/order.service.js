const mongoose = require("mongoose");
const Order = require("../model/order");
const Product = require("../model/product");
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

function canAccessUserResource(targetUserId, currentUser) {
  return isAdmin(currentUser) || currentUser?.id === targetUserId.toString();
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

  return await Order.find({ userID: userId })
    .populate(orderPopulate[0])
    .populate(orderPopulate[1])
    .sort({ _id: -1 });
};

exports.getById = async (id, currentUser) => {
  const order = await Order.findById(id)
    .populate(orderPopulate[0])
    .populate(orderPopulate[1]);

  if (!order) return null;

  if (!canAccessUserResource(order.userID._id || order.userID, currentUser)) {
    throw createError("You can only access your own orders.", 403);
  }

  return order;
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

    const normalizedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productID)
        .populate("variants.attributes.variantTypeId", "name type")
        .populate("variants.attributes.variantId", "name variantTypeId")
        .session(session);

      if (!product) {
        throw new Error("Product not found.");
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
          throw new Error(`variantId is required and must be valid for product ${product.name}.`);
        }

        selectedVariant = product.variants.find(
          (variant) =>
            variant._id.toString() === requestedVariantId && variant.isActive !== false
        );

        if (!selectedVariant) {
          throw new Error(`Selected variant was not found for product ${product.name}.`);
        }

        if (selectedVariant.quantity < item.quantity) {
          throw new Error(`Variant ${selectedVariant.sku} of product ${product.name} is out of stock.`);
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
        throw new Error(`Product ${product.name} is out of stock.`);
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

    const order = new Order({
      userID,
      orderStatus,
      items: normalizedItems,
      totalPrice,
      shippingAddress,
      paymentMethod,
      couponCode,
      orderTotal,
      trackingUrl,
    });

    await order.save({ session });

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
          throw new Error("Out of stock.");
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
          throw new Error("Out of stock.");
        }
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
