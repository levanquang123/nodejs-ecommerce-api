const asyncHandler = require("express-async-handler");
const posterService = require("../services/poster.service");

exports.getAll = asyncHandler(async (req, res) => {
  const data = await posterService.getAll();

  res.json({
    success: true,
    message: "Posters retrieved successfully",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await posterService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      message: "Poster not found.",
    });
  }

  res.json({
    success: true,
    message: "Poster retrieved successfully",
    data,
  });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await posterService.create(req);

  res.status(201).json({
    success: true,
    message: "Create poster successfully",
    data,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await posterService.update(req.params.id, req);

  res.json({
    success: true,
    message: "Update poster successfully",
    data,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await posterService.delete(req.params.id);

  res.json({
    success: true,
    message: "Poster deleted successfully.",
  });
});