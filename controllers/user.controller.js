const asyncHandler = require("express-async-handler");
const userService = require("../services/user.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await userService.getAll();

  res.json({
    success: true,
    message: "Users retrieved successfully.",
    data,
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const data = await userService.getCurrentUserProfile(req.user.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    message: "User retrieved successfully.",
    data,
  });
});

exports.updateMyAddress = asyncHandler(async (req, res) => {
  const data = await userService.updateUserAddress(req.user.id, req.body);

  res.json({
    success: true,
    message: "Address updated successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await userService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    message: "User retrieved successfully.",
    data,
  });
});

exports.register = asyncHandler(async (req, res) => {
  const data = await userService.register(req.body);

  res.status(201).json({
    success: true,
    message: "User created successfully.",
    data,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const data = await userService.login(req.body);

  res.json({
    success: true,
    message: "User login successfully.",
    data,
  });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const data = await userService.refreshToken(req.body);

  res.json({
    success: true,
    message: "Token refreshed successfully.",
    data,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  await userService.logout(req.user.id);

  res.json({
    success: true,
    message: "Logout successfully.",
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await userService.update(req.params.id, req.user, req.body);

  res.json({
    success: true,
    message: "User updated successfully.",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await userService.delete(req.params.id, req.user);

  res.json({
    success: true,
    message: "User deleted successfully.",
  });
});

exports.toggleFavorite = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "Product ID is required",
    });
  }

  const data = await userService.toggleFavorite(userId, productId);

  res.json({
    success: true,
    message: "Favorite list updated successfully.",
    data,
  });
});

exports.getFavoriteProducts = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const data = await userService.getFavoriteProducts(userId);

  res.json({
    success: true,
    message: "Get favorite prodocuts successfully.",
    data: data,
  });
});
