const express = require("express");
const router = express.Router();
const Variant = require("../model/variant");
const asyncHandler = require("express-async-handler");
const Product = require("../model/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// get all variants
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const variants = await Variant.find()
      .populate("variantTypeId")
      .sort({ variantTypeId: 1 });
    res.json({
      success: true,
      message: "Variants retrieved successfully.",
      data: variants,
    });
  })
);

// get a variant by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const variantID = req.params.id;
    const variant = await Variant.findById(variantID).populate("variantTypeId");
    if (!variant) {
      return res.status(404).json({ success: false, message: "Variant not found." });
    }
    res.json({
      success: true,
      message: "Variant retrieved successfully.",
      data: variant,
    });
  })
);

// create a new variant
router.post(
  "/",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    let { name, variantTypeId } = req.body;

    if (!name || !variantTypeId) {
      return res.status(400).json({
        success: false,
        message: "Name and VariantType ID are required.",
      });
    }

    name = name.toLowerCase();

    const existVariant = await Variant.findOne({
      name,
      variantTypeId,
    });

    if (existVariant) {
      return res.status(400).json({
        success: false,
        message: "Variant already exists",
      });
    }

    const variant = new Variant({ name, variantTypeId });
    await variant.save();

    res.json({
      success: true,
      message: "Variant created successfully.",
      data: null,
    });
  })
);

// update a variant
router.put(
  "/:id",
  auth,
  admin,
  asyncHandler(async (req, res) => {
    const variantID = req.params.id;
    let { name, variantTypeId } = req.body;

    if (!name || !variantTypeId) {
      return res.status(400).json({
        success: false,
        message: "Name and VariantType ID are required.",
      });
    }

    name = name.toLowerCase();

    const existVariant = await Variant.findOne({
      name,
      variantTypeId,
      _id: { $ne: variantID },
    });

    if (existVariant) {
      return res.status(400).json({
        success: false,
        message: "Variant already exists",
      });
    }

    const updatedVariant = await Variant.findByIdAndUpdate(
      variantID,
      { name, variantTypeId },
      { new: true }
    );

    if (!updatedVariant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found.",
      });
    }

    res.json({
      success: true,
      message: "Variant updated successfully.",
      data: updatedVariant,
    });
  })
);

// delete a variant
router.delete(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const variantID = req.params.id;

    const productCount = await Product.countDocuments({ proVariantId: variantID });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete variant. Products are referencing it.",
      });
    }
    const variantDelete = await Variant.findByIdAndDelete(variantID);
    if (!variantDelete) {
      return res.status(404).json({ success: false, message: "Variant not found." });
    }
    res.json({ success: true, message: "Variant deleted successfully." });
  })
);

module.exports = router;
