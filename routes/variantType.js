const express = require("express");
const router = express.Router();
const VariantType = require("../model/variantType");
const Variant = require("../model/variant");
const asyncHandler = require("express-async-handler");
const Product = require("../model/product");

// Get all variant types
router.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const variantTypes = await VariantType.find();
      res.json({
        success: true,
        message: "VariantTypes retrieved successfully.",
        data: variantTypes,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

// Get a variant type by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const variantTypeID = req.params.id;
      const variantType = await VariantType.findById(variantTypeID);
      if (!variantType) {
        return res
          .status(404)
          .json({ success: false, message: "VariantType not found." });
      }
      res.json({
        success: true,
        message: "VariantType retrieved successfully.",
        data: variantType,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

// Create a new variant type
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, type } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required." });
    }

    try {
      const variantType = new VariantType({ name, type });
      const newVariantType = await variantType.save();
      res.json({
        success: true,
        message: "VariantType created successfully.",
        data: null,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

// Update a variant type
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const variantTypeID = req.params.id;
    const { name, type } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required." });
    }

    try {
      const updatedVariantType = await VariantType.findByIdAndUpdate(
        variantTypeID,
        { name, type },
        { new: true }
      );
      if (!updatedVariantType) {
        return res
          .status(404)
          .json({ success: false, message: "VariantType not found." });
      }
      res.json({
        success: true,
        message: "VariantType updated successfully.",
        data: null,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

// Delete a variant type
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const variantTypeID = req.params.id;

    const variantCount = await Variant.countDocuments({
      variantTypeId: variantTypeID,
    });

    if (variantCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete variant type. It is associated with one or more variants.",
      });
    }

    const productCount = await Product.countDocuments({
      proVariantTypeId: variantTypeID,
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete variant type. It is associated with one or more products.",
      });
    }

    const variantType = await VariantType.findByIdAndDelete(variantTypeID);
    if (!variantType) {
      return res
        .status(404)
        .json({ success: false, message: "Variant type not found." });
    }
    res.json({ success: true, message: "Variant type deleted successfully." });
  })
);
module.exports = router;
