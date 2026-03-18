const express = require("express");
const router = express.Router();
const VariantType = require("../model/variantType");
const Variant = require("../model/variant");
const asyncHandler = require("express-async-handler");
const Product = require("../model/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// get all variant types
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const variantTypes = await VariantType.find();
    res.json({
      success: true,
      message: "VariantTypes retrieved successfully.",
      data: variantTypes,
    });
  })
);

// get a variant type by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const variantTypeID = req.params.id;
    const variantType = await VariantType.findById(variantTypeID);
    if (!variantType) {
      return res.status(404).json({ success: false, message: "VariantType not found." });
    }
    res.json({
      success: true,
      message: "VariantType retrieved successfully.",
      data: variantType,
    });
  })
);

// create a new variant type
router.post(
  "/",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    let { name, type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    name = name.toLowerCase();

    const existVariantType = await VariantType.findOne({ name });

    if (existVariantType) {
      return res.status(400).json({
        success: false,
        message: "VariantType already exists",
      });
    }

    const variantType = new VariantType({ name, type });
    await variantType.save();

    res.json({
      success: true,
      message: "VariantType created successfully.",
      data: null,
    });
  })
);

// update a variant type
router.put(
  "/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const variantTypeID = req.params.id;
    let { name, type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    name = name.toLowerCase();

    const existVariantType = await VariantType.findOne({
      name,
      _id: { $ne: variantTypeID },
    });

    if (existVariantType) {
      return res.status(400).json({
        success: false,
        message: "VariantType already exists",
      });
    }

    const updatedVariantType = await VariantType.findByIdAndUpdate(
      variantTypeID,
      { name, type },
      { new: true }
    );

    if (!updatedVariantType) {
      return res.status(404).json({
        success: false,
        message: "VariantType not found.",
      });
    }

    res.json({
      success: true,
      message: "VariantType updated successfully.",
      data: updatedVariantType,
    });
  })
);

// delete a variant type
router.delete(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const variantTypeID = req.params.id;

    const variantCount = await Variant.countDocuments({ variantTypeId: variantTypeID });
    if (variantCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete variant type. It is associated with one or more variants.",
      });
    }
    const productCount = await Product.countDocuments({ proVariantTypeId: variantTypeID });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete variant type. It is associated with one or more products.",
      });
    }
    const variantType = await VariantType.findByIdAndDelete(variantTypeID);
    if (!variantType) {
      return res.status(404).json({ success: false, message: "Variant type not found." });
    }
    res.json({ success: true, message: "Variant type deleted successfully." });
  })
);

module.exports = router;
