const asyncHandler = require("express-async-handler");
const cartService = require("../services/cart.service");

exports.getCart = asyncHandler(async (req, res) => {
  const data = await cartService.getCartByUser(req.user.id);

  res.json({
    success: true,
    message: "Cart retrieved successfully.",
    data,
  });
});

exports.addItem = asyncHandler(async (req, res) => {
  const data = await cartService.addItemToCart(req.user.id, req.body);

  res.json({
    success: true,
    message: "Item added to cart successfully.",
    data,
  });
});

exports.updateItem = asyncHandler(async (req, res) => {
  const data = await cartService.updateCartItem(req.user.id, req.body);

  res.json({
    success: true,
    message: "Cart item updated successfully.",
    data,
  });
});

exports.removeItem = asyncHandler(async (req, res) => {
  const data = await cartService.removeCartItem(req.user.id, req.body);

  res.json({
    success: true,
    message: "Cart item removed successfully.",
    data,
  });
});

exports.clearCart = asyncHandler(async (req, res) => {
  const data = await cartService.clearCart(req.user.id);

  res.json({
    success: true,
    message: "Cart cleared successfully.",
    data,
  });
});
