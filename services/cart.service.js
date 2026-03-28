const Cart = require("../model/cart");
const Product = require("../model/product");

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeVariant(variant) {
  return (variant || "").trim();
}

async function populateCart(cartId) {
  return await Cart.findById(cartId).populate("items.productId");
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

  const product = await Product.findById(productId);
  if (!product) throw createError("Product not found", 404);

  const priceAtAdd =
    product.offerPrice !== undefined && product.offerPrice !== null
      ? product.offerPrice
      : product.price;

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) =>
      item.productId._id.toString() === productId &&
      normalizeVariant(item.variant) === variant
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.priceAtAdd = priceAtAdd;
  } else {
    cart.items.push({
      productId,
      quantity,
      variant,
      priceAtAdd,
    });
  }

  await cart.save();
  return await populateCart(cart._id);
};

exports.updateCartItem = async (userId, payload) => {
  const { productId, quantity } = payload;
  const variant = normalizeVariant(payload.variant);

  const cart = await getOrCreateCart(userId);

  const existingItem = cart.items.find(
    (item) =>
      item.productId._id.toString() === productId &&
      normalizeVariant(item.variant) === variant
  );

  if (!existingItem) {
    throw createError("Cart item not found", 404);
  }

  existingItem.quantity = quantity;
  await cart.save();

  return await populateCart(cart._id);
};

exports.removeCartItem = async (userId, payload) => {
  const { productId } = payload;
  const variant = normalizeVariant(payload.variant);

  const cart = await getOrCreateCart(userId);

  const index = cart.items.findIndex(
    (item) =>
      item.productId._id.toString() === productId &&
      normalizeVariant(item.variant) === variant
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
