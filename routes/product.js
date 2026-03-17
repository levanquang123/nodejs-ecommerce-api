const express = require("express");
const router = express.Router();
const Product = require("../model/product");
const multer = require("multer");
const { uploadProduct } = require("../uploadFile");
const asyncHandler = require("express-async-handler");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const PRODUCT_IMAGE_FIELDS = [
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
  { name: "image5", maxCount: 1 },
];

function handleMulterError(err, res) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size is too large. Maximum filesize is 5MB per image.",
    });
  }

  return res.status(400).json({
    success: false,
    message: err.message || "Upload failed.",
  });
}

function buildProductImageUrls(files) {
  const imageUrls = [];
  const fieldNames = ["image1", "image2", "image3", "image4", "image5"];

  fieldNames.forEach((field, index) => {
    if (files[field] && files[field].length > 0) {
      const file = files[field][0];

      imageUrls.push({
        image: index + 1,
        url: file.path, // Cloudinary URL
      });
    }
  });

  return imageUrls;
}

// get all products
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const products = await Product.find()
      .populate("proCategoryId", "id name")
      .populate("proSubCategoryId", "id name")
      .populate("proBrandId", "id name")
      .populate("proVariantTypeId", "id type")
      .populate("proVariantId", "id name");

    res.json({
      success: true,
      message: "Products retrieved successfully.",
      data: products,
    });
  })
);

// get a product by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const productID = req.params.id;

    const product = await Product.findById(productID)
      .populate("proCategoryId", "id name")
      .populate("proSubCategoryId", "id name")
      .populate("proBrandId", "id name")
      .populate("proVariantTypeId", "id name")
      .populate("proVariantId", "id name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    res.json({
      success: true,
      message: "Product retrieved successfully.",
      data: product,
    });
  })
);

// create a new product
router.post(
  "/",
  auth, admin,
  asyncHandler(async (req, res) => {
    uploadProduct.fields(PRODUCT_IMAGE_FIELDS)(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const {
        name,
        description,
        quantity,
        price,
        offerPrice,
        proCategoryId,
        proSubCategoryId,
        proBrandId,
        proVariantTypeId,
        proVariantId,
      } = req.body;

      if (!name || !quantity || !price || !proCategoryId || !proSubCategoryId) {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing.",
        });
      }

      if (offerPrice && Number(offerPrice) > Number(price)) {
        return res.status(400).json({
          success: false,
          message: "Offer price cannot be greater than original price.",
        });
      }

      const imageUrls = buildProductImageUrls(req.files || {});

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
        proVariantId,
        images: imageUrls,
      });

      await newProduct.save();

      res.status(201).json({
        success: true,
        message: "Product created successfully.",
        data: newProduct,
      });
    });
  })
);

// update a product
router.put(
  "/:id",
  auth, admin,
  asyncHandler(async (req, res) => {
    const productId = req.params.id;

    uploadProduct.fields(PRODUCT_IMAGE_FIELDS)(req, res, async function (err) {
      if (err) return handleMulterError(err, res);

      const {
        name,
        description,
        quantity,
        price,
        offerPrice,
        proCategoryId,
        proSubCategoryId,
        proBrandId,
        proVariantTypeId,
        proVariantId,
      } = req.body;

      const productToUpdate = await Product.findById(productId);

      if (!productToUpdate) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      const finalPrice = price ?? productToUpdate.price;
      const finalOfferPrice = offerPrice ?? productToUpdate.offerPrice;

      if (
        finalOfferPrice !== undefined &&
        finalOfferPrice !== null &&
        finalOfferPrice !== "" &&
        Number(finalOfferPrice) > Number(finalPrice)
      ) {
        return res.status(400).json({
          success: false,
          message: "Offer price cannot be greater than original price.",
        });
      }

      productToUpdate.name = name ?? productToUpdate.name;
      productToUpdate.description = description ?? productToUpdate.description;
      productToUpdate.quantity = quantity ?? productToUpdate.quantity;
      productToUpdate.price = price ?? productToUpdate.price;
      productToUpdate.offerPrice = offerPrice ?? productToUpdate.offerPrice;
      productToUpdate.proCategoryId = proCategoryId ?? productToUpdate.proCategoryId;
      productToUpdate.proSubCategoryId =
        proSubCategoryId ?? productToUpdate.proSubCategoryId;
      productToUpdate.proBrandId = proBrandId ?? productToUpdate.proBrandId;
      productToUpdate.proVariantTypeId =
        proVariantTypeId ?? productToUpdate.proVariantTypeId;
      productToUpdate.proVariantId = proVariantId ?? productToUpdate.proVariantId;

      const fieldNames = ["image1", "image2", "image3", "image4", "image5"];
      const files = req.files || {};

      fieldNames.forEach((field, index) => {
        if (files[field] && files[field].length > 0) {
          const imageUrl = files[field][0].path; // Cloudinary URL
          const imageEntry = productToUpdate.images.find(
            (img) => img.image === index + 1
          );

          if (imageEntry) {
            imageEntry.url = imageUrl;
          } else {
            productToUpdate.images.push({
              image: index + 1,
              url: imageUrl,
            });
          }
        }
      });

      await productToUpdate.save();

      res.json({
        success: true,
        message: "Product updated successfully.",
        data: productToUpdate,
      });
    });
  })
);

// delete a product
router.delete(
  "/:id",
  auth, admin,
  asyncHandler(async (req, res) => {
    const productID = req.params.id;

    const product = await Product.findByIdAndDelete(productID);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully.",
    });
  })
);

module.exports = router;