const express = require("express");
const router = express.Router();
const Category = require("../model/category");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const { uploadCategory } = require("../uploadFile");
const SubCategory = require("../model/subCategory");
const Product = require("../model/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size is too large. Maximum filesize is 5MB.",
    });
  }

  return res.status(400).json({
    success: false,
    message: err.message || "Upload failed.",
  });
}

// get all categories
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await Category.find();

    res.json({
      success: true,
      message: "Categories retrieved successfully.",
      data: categories,
    });
  })
);

// get a category by id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const categoryID = req.params.id;
    const category = await Category.findById(categoryID);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      message: "Category retrieved successfully.",
      data: category,
    });
  })
);

// create a new category with image upload
router.post(
  "/",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    uploadCategory.single("img")(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Name is required.",
        });
      }

      const existCategory = await Category.findOne({ name });

      if (existCategory) {
        return res.status(400).json({
          success: false,
          message: "Category already exists.",
        });
      }

      const imageUrl = req.file ? req.file.path : "no_url";

      const newCategory = new Category({
        name,
        image: imageUrl,
      });

      await newCategory.save();

      res.status(201).json({
        success: true,
        message: "Category created successfully.",
        data: newCategory,
      });
    });
  })
);

// update category
router.put(
  "/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const categoryID = req.params.id;

    uploadCategory.single("img")(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const { name } = req.body;

      const category = await Category.findById(categoryID);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }

      category.name = name ?? category.name;

      if (req.file) {
        category.image = req.file.path;
      }

      await category.save();

      res.json({
        success: true,
        message: "Category updated successfully.",
        data: category,
      });
    });
  })
);

// delete category
router.delete(
  "/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const categoryID = req.params.id;

    const subCategories = await SubCategory.find({ categoryId: categoryID });
    if (subCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete Category, subCategories are referencing it.",
      });
    }

    const products = await Product.find({ proCategoryId: categoryID });
    if (products.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete Category, products are referencing it.",
      });
    }

    const categoryDelete = await Category.findByIdAndDelete(categoryID);

    if (!categoryDelete) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    res.json({
      success: true,
      message: "Category deleted successfully.",
    });
  })
);

module.exports = router;