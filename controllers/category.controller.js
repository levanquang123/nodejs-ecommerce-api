const asyncHandler = require("express-async-handler");
const categoryService = require("../services/category.service");
const multer = require("multer");
const { uploadCategory } = require("../uploadFile");

function handleMulterError(err, req, res) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      requestId: req.requestId,
      message: "File size too large (max 5MB).",
    });
  }
  return res.status(400).json({
    success: false,
    requestId: req.requestId,
    message: err.message || "Upload failed.",
  });
}

exports.getAll = asyncHandler(async (req, res) => {
  const data = await categoryService.getAll();

  res.json({
    success: true,
    message: "Categories retrieved successfully.",
    data,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await categoryService.getById(req.params.id);

  if (!data) {
    return res.status(404).json({
      success: false,
      requestId: req.requestId,
      message: "Category not found",
    });
  }

  res.json({
    success: true,
    message: "Category retrieved successfully.",
    data,
  });
});

exports.create = (req, res, next) => {
  uploadCategory.single("img")(req, res, async function (err) {
    if (err) return handleMulterError(err, req, res);

    try {
      const image = req.file ? req.file.path : "no_url";

      const data = await categoryService.create({
        name: req.body.name,
        image,
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  });
};

exports.update = (req, res, next) => {
  uploadCategory.single("img")(req, res, async function (err) {
    if (err) return handleMulterError(err, req, res);

    try {
      const image = req.file ? req.file.path : null;

      const data = await categoryService.update(req.params.id, {
        name: req.body.name,
        image,
      });

      res.json({
        success: true,
        message: "Category updated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  });
};

exports.remove = asyncHandler(async (req, res) => {
  await categoryService.delete(req.params.id);

  res.json({
    success: true,
    message: "Category deleted successfully.",
  });
});
