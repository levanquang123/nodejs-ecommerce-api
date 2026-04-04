const Cart = require("../model/cart");
const Product = require("../model/product");
const mongoose = require("mongoose");

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeVariant(variant) {
  return (variant || "").trim();
}

function normalizeVariantId(variantId) {
  if (variantId === undefined || variantId === null || variantId === "") return null;
  return String(variantId);
}

function getActiveVariant(product, variantId) {
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return null;
  }

  if (!variantId) {
    throw createError("variantId is required for this product.", 400);
  }

  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw createError("Invalid variantId.", 400);
  }

  const variant = product.variants.find(
    (item) => item._id.toString() === variantId && item.isActive !== false
  );

  if (!variant) {
    throw createError("Variant not found or inactive.", 404);
  }

  return variant;
}

function getVariantImage(variant) {
  if (!variant || !Array.isArray(variant.images) || variant.images.length === 0) {
    return "";
  }

  const sortedImages = [...variant.images].sort((a, b) => a.image - b.image);
  return sortedImages[0]?.url || "";
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

async function populateCart(cartId) {
  return await Cart.findById(cartId).populate("items.productId");
}

async function getProductWithVariantDetails(productId) {
  return await Product.findById(productId)
    .populate("variants.attributes.variantTypeId", "name type")
    .populate("variants.attributes.variantId", "name variantTypeId");
}

function isSameCartItem(item, productId, variantId, variant) {
  if (item.productId._id.toString() !== productId) {
    return false;
  }

  if (variantId) {
    return normalizeVariantId(item.variantId) === variantId;
  }

  return normalizeVariant(item.variant) === variant;
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [],
    });
  }

  return await populateCart(cart._id);
}

exports.getOrCreateCart = getOrCreateCart;

exports.getCartByUser = async (userId) => {
  return await getOrCreateCart(userId);
};

exports.addItemToCart = async (userId, payload) => {
  const { productId, quantity } = payload;
  const variant = normalizeVariant(payload.variant);
  const variantId = normalizeVariantId(payload.variantId);

  const product = await getProductWithVariantDetails(productId);
  if (!product) throw createError("Product not found", 404);

  const selectedVariant = getActiveVariant(product, variantId);
  const attributeSnapshot = toAttributeSnapshot(selectedVariant?.attributes);
  const variantLabel = buildVariantLabel(attributeSnapshot);

  const priceAtAdd = selectedVariant
    ? selectedVariant.offerPrice !== undefined && selectedVariant.offerPrice !== null
      ? selectedVariant.offerPrice
      : selectedVariant.price
    : product.offerPrice !== undefined && product.offerPrice !== null
      ? product.offerPrice
      : product.price;

  const availableQuantity = selectedVariant
    ? selectedVariant.quantity
    : product.quantity;

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) => isSameCartItem(item, productId, variantId, variant)
  );

  const totalQuantity = (existingItem?.quantity || 0) + quantity;
  if (totalQuantity > availableQuantity) {
    throw createError("Requested quantity exceeds available stock.", 400);
  }

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.priceAtAdd = priceAtAdd;
    existingItem.variant = variantLabel;
    existingItem.sku = selectedVariant?.sku || "";
    existingItem.attributes = attributeSnapshot;
    existingItem.image = getVariantImage(selectedVariant);
  } else {
    cart.items.push({
      productId,
      quantity,
      variant: variantLabel || variant,
      variantId,
      sku: selectedVariant?.sku || "",
      attributes: attributeSnapshot,
      image: getVariantImage(selectedVariant),
      priceAtAdd,
    });
  }

  await cart.save();
  return await populateCart(cart._id);
};

exports.updateCartItem = async (userId, payload) => {
  const { productId, quantity } = payload;
  const variant = normalizeVariant(payload.variant);
  const variantId = normalizeVariantId(payload.variantId);

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) => isSameCartItem(item, productId, variantId, variant)
  );

  if (!existingItem) {
    throw createError("Cart item not found", 404);
  }

  const product = await getProductWithVariantDetails(productId);
  if (!product) throw createError("Product not found", 404);

  const selectedVariant = getActiveVariant(product, variantId);
  const attributeSnapshot = toAttributeSnapshot(selectedVariant?.attributes);
  const variantLabel = buildVariantLabel(attributeSnapshot);
  const availableQuantity = selectedVariant
    ? selectedVariant.quantity
    : product.quantity;

  if (quantity > availableQuantity) {
    throw createError("Requested quantity exceeds available stock.", 400);
  }

  existingItem.quantity = quantity;
  existingItem.variant = variantLabel || variant;
  existingItem.sku = selectedVariant?.sku || "";
  existingItem.attributes = attributeSnapshot;
  existingItem.image = getVariantImage(selectedVariant);
  existingItem.priceAtAdd = selectedVariant
    ? selectedVariant.offerPrice !== undefined && selectedVariant.offerPrice !== null
      ? selectedVariant.offerPrice
      : selectedVariant.price
    : product.offerPrice !== undefined && product.offerPrice !== null
      ? product.offerPrice
      : product.price;

  await cart.save();

  return await populateCart(cart._id);
};

exports.removeCartItem = async (userId, payload) => {
  const { productId } = payload;
  const variant = normalizeVariant(payload.variant);
  const variantId = normalizeVariantId(payload.variantId);

  const cart = await getOrCreateCart(userId);

  const index = cart.items.findIndex(
    (item) => isSameCartItem(item, productId, variantId, variant)
  );

  if (index === -1) {
    throw createError("Cart item not found", 404);
  }

  cart.items.splice(index, 1);
  await cart.save();

  return await populateCart(cart._id);
};

exports.clearCart = async (userId) => {
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  await cart.save();

  return await populateCart(cart._id);
};
