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
  const data = await userService.getMe(req.user.id);

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

exports.update = asyncHandler(async (req, res) => {
  const data = await userService.update(
    req.params.id,
    req.user,
    req.body
  );

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