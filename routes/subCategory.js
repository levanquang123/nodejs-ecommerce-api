const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const SubCategory = require("../model/subCategory");
const Brand = require("../model/brand");
const Product = require("../model/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// get all sub-categories
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const subCategories = await SubCategory.find()
      .populate("categoryId")
      .sort({ categoryId: 1 });
    res.json({
      success: true,
      message: "Sub-categories retrieved successfully.",
      data: subCategories,
    });
  })
);

// get a sub-category by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const subCategoryID = req.params.id;
    const subCategory = await SubCategory.findById(subCategoryID).populate("categoryId");
    if (!subCategory) {
      return res.status(404).json({ success: false, message: "Sub-category not found." });
    }
    res.json({
      success: true,
      message: "Sub-category retrieved successfully.",
      data: subCategory,
    });
  })
);

// create a new sub-category
router.post(
  "/",auth,admin,
  asyncHandler(async (req, res) => {
    const { name, categoryId } = req.body;
    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Name and categoryId are required.",
      });
    }
    const existSubCategory = await SubCategory.findOne({ name });
    if (existSubCategory) {
      return res.json({ success: false, message: "SubCategory has already exist" });
    }
    const newSubCategory = new SubCategory({ name, categoryId });
    await newSubCategory.save();
    res.json({
      success: true,
      message: "Sub-category created successfully.",
      data: null,
    });
  })
);

// update a sub-category
router.put(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const { name, categoryId } = req.body;
    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Name and categoryId are required.",
      });
    }
    const updateSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { name, categoryId },
      { new: true }
    );
    if (!updateSubCategory) {
      return res.status(404).json({ success: false, message: "Sub-category not found." });
    }
    res.json({
      success: true,
      message: "Sub-category updated successfully.",
      data: null,
    });
  })
);

// delete a sub-category
router.delete(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const subCategoryID = req.params.id;

    const brands = await Brand.countDocuments({ subCategoryId: subCategoryID });
    if (brands > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete sub-category. It is associated with one or more brands.",
      });
    }
    const products = await Product.countDocuments({ proSubCategoryId: subCategoryID });
    if (products > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete sub-category. It is associated with one or more products.",
      });
    }
    const subCategoryDelete = await SubCategory.findByIdAndDelete(subCategoryID);
    if (!subCategoryDelete) {
      return res.status(404).json({ success: false, message: "Sub-category not found." });
    }
    res.json({ success: true, message: "Sub-category deleted successfully." });
  })
);

module.exports = router;
