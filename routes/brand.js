const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Brand = require("../model/brand");
const Product = require("../model/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// get all brands
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const brands = await Brand.find()
      .populate("subCategoryId")
      .sort({ subCategoryId: 1 });
    res.json({
      success: true,
      message: "Brand retrieved successfully",
      data: brands,
    });
  })
);

// get brand by id
router.get(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const brandID = req.params.id;
    const brand = await Brand.findById(brandID).populate("subCategoryId");
    if (!brand) {
      return res
        .status(404)
        .json({ success: false, message: "Brand not found." });
    }
    res.json({
      success: true,
      message: "Brand retrieved successfully",
      data: brand,
    });
  })
);

// create a new brand
router.post(
  "/",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const { name, subCategoryId } = req.body;

    if (!name || !subCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Name and subcategory ID are required.",
      });
    }

    const existBrand = await Brand.findOne({ name });

    if (existBrand) {
      return res.status(400).json({
        success: false,
        message: "Brand already exists",
      });
    }

    const newBrand = new Brand({
      name,
      subCategoryId,
    });

    await newBrand.save();

    res.json({
      success: true,
      message: "Create brand successfully",
    });
  })
);

// update a brand
router.put(
  "/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const { name, subCategoryId } = req.body;
    const brandID = req.params.id;

    if (!name || !subCategoryId) {
      return res.status(400).json({
        success: false,
        message: "Name and subcategory ID are required.",
      });
    }

    const existBrand = await Brand.findOne({
      name,
      _id: { $ne: brandID },
    });

    if (existBrand) {
      return res.status(400).json({
        success: false,
        message: "Brand already exists",
      });
    }

    const updateBrand = await Brand.findByIdAndUpdate(
      brandID,
      { name, subCategoryId },
      { new: true }
    );

    if (!updateBrand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found.",
      });
    }

    res.json({
      success: true,
      message: "Update brand successfully",
    });
  })
);

// delete a brand
router.delete(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const brandID = req.params.id;

    const products = await Product.countDocuments({
      proBrandId: brandID,
    });
    if (products > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete brand. It is associated with one or more products.",
      });
    }
    const brandDelete = await Brand.findByIdAndDelete(brandID);
    if (!brandDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Brand not found." });
    }
    res.json({ success: true, message: "Brand deleted successfully." });
  })
);

module.exports = router;
