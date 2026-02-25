const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const { uploadProduct } = require("../uploadFile");
const Product = require("../model/product");

// get all products
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const products = await Product.find()
      .populate("proCategoryId", "name")
      .populate("proSubCategoryId", "name")
      .populate("proBrandId", "name")
      .populate("proVariantTypeId", "type")
      .populate("proVariantIds", "name");

    res.json({
      success: true,
      message: "Product retrieved successfully.",
      data: products,
    });
  })
);

// get product by id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
      .populate("proCategoryId", "name")
      .populate("proSubCategoryId", "name")
      .populate("proBrandId", "name")
      .populate("proVariantTypeId", "name")
      .populate("proVariantIds", "name");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    res.json({
      success: true,
      message: "Product retrieved successfully.",
      data: product,
    });
  })
);

// create product
router.post(
  "/",
  asyncHandler(async (req, res) => {
    uploadProduct.fields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
      { name: "image3", maxCount: 1 },
      { name: "image4", maxCount: 1 },
      { name: "image5", maxCount: 1 },
    ])(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          err.message =
            "File size is too large. Maximum filesize is 5MB per image.";
        }
        return res.json({ success: false, message: err.message });
      } else if (err) {
        return res.json({ success: false, message: err });
      }

      let {
        name,
        description,
        quantity,
        price,
        offerPrice,
        proCategoryId,
        proSubCategoryId,
        proBrandId,
        proVariantTypeId,
        proVariantIds,
      } = req.body;

      if (!name || !quantity || !price || !proCategoryId || !proSubCategoryId) {
        return res
          .status(400)
          .json({ success: false, message: "Required fields are missing." });
      }

      if (proVariantIds && !Array.isArray(proVariantIds)) {
        proVariantIds = [proVariantIds];
      }

      let images = [];
      const fields = ["image1", "image2", "image3", "image4", "image5"];
      fields.forEach((field, index) => {
        if (req.files[field]) {
          const file = req.files[field][0];
          images.push({
            image: index + 1,
            url: `http://localhost:3000/image/products/${file.filename}`,
          });
        }
      });

      const newProduct = new Product({
        name,
        description,
        quantity,
        price,
        offerPrice,
        proCategoryId,
        proSubCategoryId,
        proBrandId,
        proVariantTypeId,
        proVariantIds,
        images,
      });

      await newProduct.save();

      res.json({
        success: true,
        message: "Created product successfully.",
        data: null,
      });
    });
  })
);

// update product
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    uploadProduct.fields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
      { name: "image3", maxCount: 1 },
      { name: "image4", maxCount: 1 },
      { name: "image5", maxCount: 1 },
    ])(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        return res.json({ success: false, message: err.message });
      } else if (err) {
        return res.json({ success: false, message: err });
      }

      let {
        name,
        description,
        quantity,
        price,
        offerPrice,
        proCategoryId,
        proSubCategoryId,
        proBrandId,
        proVariantTypeId,
        proVariantIds, 
      } = req.body;

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });
      }

      if (proVariantIds && !Array.isArray(proVariantIds)) {
        proVariantIds = [proVariantIds];
      }

      product.name = name ?? product.name;
      product.description = description ?? product.description;
      product.quantity = quantity ?? product.quantity;
      product.price = price ?? product.price;
      product.offerPrice = offerPrice ?? product.offerPrice;
      product.proCategoryId = proCategoryId ?? product.proCategoryId;
      product.proSubCategoryId = proSubCategoryId ?? product.proSubCategoryId;
      product.proBrandId = proBrandId ?? product.proBrandId;
      product.proVariantTypeId =
        proVariantTypeId ?? product.proVariantTypeId;
      product.proVariantIds = proVariantIds ?? product.proVariantIds;

      const fields = ["image1", "image2", "image3", "image4", "image5"];
      fields.forEach((field, index) => {
        if (req.files[field]) {
          const file = req.files[field][0];
          const imageUrl = `http://localhost:3000/image/products/${file.filename}`;
          const img = product.images.find((i) => i.image === index + 1);
          if (img) img.url = imageUrl;
          else product.images.push({ image: index + 1, url: imageUrl });
        }
      });

      await product.save();

      res.json({
        success: true,
        message: "Updated product successfully.",
        data: null,
      });
    });
  })
);

// delete product
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    res.json({ success: true, message: "Product deleted successfully." });
  })
);

module.exports = router;
