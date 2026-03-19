const Product = require("../model/product");
const { uploadProduct } = require("../uploadFile");
const multer = require("multer");

const PRODUCT_IMAGE_FIELDS = [
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
  { name: "image5", maxCount: 1 },
];

function handleMulterError(err) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    throw new Error("File size is too large. Maximum filesize is 5MB per image.");
  }
  throw new Error(err.message || "Upload failed.");
}

function buildImageUrls(files) {
  const imageUrls = [];
  const fieldNames = ["image1", "image2", "image3", "image4", "image5"];

  fieldNames.forEach((field, index) => {
    if (files[field] && files[field].length > 0) {
      imageUrls.push({
        image: index + 1,
        url: files[field][0].path,
      });
    }
  });

  return imageUrls;
}

exports.getAll = async () => {
  return await Product.find()
    .populate("proCategoryId", "id name")
    .populate("proSubCategoryId", "id name")
    .populate("proBrandId", "id name")
    .populate("proVariantTypeId", "id type")
    .populate("proVariantId", "id name");
};

exports.getById = async (id) => {
  return await Product.findById(id)
    .populate("proCategoryId", "id name")
    .populate("proSubCategoryId", "id name")
    .populate("proBrandId", "id name")
    .populate("proVariantTypeId", "id name")
    .populate("proVariantId", "id name");
};

exports.create = async (req) => {
  return new Promise((resolve, reject) => {
    uploadProduct.fields(PRODUCT_IMAGE_FIELDS)(req, null, async (err) => {
      if (err) return reject(handleMulterError(err));

      try {
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
          proVariantId,
        } = req.body;

        if (offerPrice && Number(offerPrice) > Number(price)) {
          throw new Error("Offer price cannot be greater than original price.");
        }

        name = name.toLowerCase();

        const exist = await Product.findOne({ name });
        if (exist) throw new Error("Product already exists.");

        const images = buildImageUrls(req.files || {});

        const product = new Product({
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
          images,
        });

        await product.save();

        resolve(product);
      } catch (error) {
        reject(error);
      }
    });
  });
};

exports.update = async (id, req) => {
  return new Promise((resolve, reject) => {
    uploadProduct.fields(PRODUCT_IMAGE_FIELDS)(req, null, async (err) => {
      if (err) return reject(handleMulterError(err));

      try {
        const product = await Product.findById(id);
        if (!product) throw new Error("Product not found.");

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
          proVariantId,
        } = req.body;

        const finalPrice = price ?? product.price;
        const finalOfferPrice = offerPrice ?? product.offerPrice;

        if (
          finalOfferPrice !== undefined &&
          Number(finalOfferPrice) > Number(finalPrice)
        ) {
          throw new Error("Offer price cannot be greater than original price.");
        }

        if (name) {
          name = name.toLowerCase();

          const exist = await Product.findOne({
            name,
            _id: { $ne: id },
          });

          if (exist) throw new Error("Product already exists.");

          product.name = name;
        }

        product.description = description ?? product.description;
        product.quantity = quantity ?? product.quantity;
        product.price = price ?? product.price;
        product.offerPrice = offerPrice ?? product.offerPrice;
        product.proCategoryId = proCategoryId ?? product.proCategoryId;
        product.proSubCategoryId =
          proSubCategoryId ?? product.proSubCategoryId;
        product.proBrandId = proBrandId ?? product.proBrandId;
        product.proVariantTypeId =
          proVariantTypeId ?? product.proVariantTypeId;
        product.proVariantId = proVariantId ?? product.proVariantId;

        const fieldNames = ["image1", "image2", "image3", "image4", "image5"];
        const files = req.files || {};

        fieldNames.forEach((field, index) => {
          if (files[field] && files[field].length > 0) {
            const imageUrl = files[field][0].path;

            const existing = product.images.find(
              (img) => img.image === index + 1
            );

            if (existing) {
              existing.url = imageUrl;
            } else {
              product.images.push({
                image: index + 1,
                url: imageUrl,
              });
            }
          }
        });

        await product.save();

        const updated = await this.getById(id);
        resolve(updated);
      } catch (error) {
        reject(error);
      }
    });
  });
};

exports.delete = async (id) => {
  const deleted = await Product.findByIdAndDelete(id);
  if (!deleted) throw new Error("Product not found.");
};