const Product = require("../model/product");
const Variant = require("../model/variant");
const VariantType = require("../model/variantType");
const { uploadProduct } = require("../uploadFile");
const multer = require("multer");
const mongoose = require("mongoose");

const PRODUCT_IMAGE_FIELDS = [
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
  { name: "image5", maxCount: 1 },
];

function handleMulterError(err) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return new Error("File size is too large. Maximum filesize is 5MB per image.");
  }
  return new Error(err.message || "Upload failed.");
}

function buildImageUrls(files) {
  const imageUrls = [];
  const fieldNames = ["image1", "image2", "image3", "image4", "image5"];
  const fileMap = toFileMap(files);

  fieldNames.forEach((field, index) => {
    if (fileMap.has(field)) {
      imageUrls.push({
        image: index + 1,
        url: fileMap.get(field).path,
      });
    }
  });

  return imageUrls;
}

function toFileMap(files) {
  const fileMap = new Map();
  if (!files) return fileMap;

  if (Array.isArray(files)) {
    for (const file of files) {
      if (file?.fieldname) fileMap.set(file.fieldname, file);
    }
    return fileMap;
  }

  for (const [fieldname, fieldFiles] of Object.entries(files)) {
    if (Array.isArray(fieldFiles) && fieldFiles.length > 0) {
      fileMap.set(fieldname, fieldFiles[0]);
    }
  }
  return fileMap;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    throw new Error("Invalid number value.");
  }
  return numberValue;
}

function toNullableBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Invalid boolean value.");
}

function normalizeObjectId(value, fieldName) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`${fieldName} is invalid.`);
  }
  return new mongoose.Types.ObjectId(value);
}

function parseRawAttributes(attributes) {
  if (attributes === undefined || attributes === null || attributes === "") return [];

  let parsedAttributes = attributes;
  if (typeof attributes === "string") {
    try {
      parsedAttributes = JSON.parse(attributes);
    } catch (error) {
      throw new Error("Invalid variant attributes format.");
    }
  }

  if (!Array.isArray(parsedAttributes)) {
    throw new Error("Invalid variant attributes format.");
  }

  return parsedAttributes.map((attribute) => ({
    variantTypeId: normalizeObjectId(attribute.variantTypeId, "variantTypeId"),
    variantId: normalizeObjectId(attribute.variantId, "variantId"),
  }));
}

async function parseAttributes(attributes) {
  const parsedAttributes = parseRawAttributes(attributes);

  if (parsedAttributes.length === 0) {
    return [];
  }

  const variantTypeIds = [
    ...new Set(parsedAttributes.map((item) => item.variantTypeId.toString())),
  ];
  const variantIds = [
    ...new Set(parsedAttributes.map((item) => item.variantId.toString())),
  ];

  const [variantTypes, variants] = await Promise.all([
    VariantType.find({ _id: { $in: variantTypeIds } }).lean(),
    Variant.find({ _id: { $in: variantIds } }).lean(),
  ]);

  if (variantTypes.length !== variantTypeIds.length) {
    throw new Error("One or more variantTypeId values do not exist.");
  }

  if (variants.length !== variantIds.length) {
    throw new Error("One or more variantId values do not exist.");
  }

  const variantTypeMap = new Map(
    variantTypes.map((item) => [item._id.toString(), item])
  );
  const variantMap = new Map(variants.map((item) => [item._id.toString(), item]));
  const seenTypeIds = new Set();

  return parsedAttributes.map((attribute) => {
    const variantTypeId = attribute.variantTypeId.toString();
    const variantId = attribute.variantId.toString();
    const variant = variantMap.get(variantId);

    if (!variant) {
      throw new Error(`Variant ${variantId} does not exist.`);
    }

    if (!variantTypeMap.has(variantTypeId)) {
      throw new Error(`Variant type ${variantTypeId} does not exist.`);
    }

    if (variant.variantTypeId.toString() !== variantTypeId) {
      throw new Error("Variant does not belong to the provided variant type.");
    }

    if (seenTypeIds.has(variantTypeId)) {
      throw new Error("A variant type can only appear once in each SKU.");
    }
    seenTypeIds.add(variantTypeId);

    return {
      variantTypeId: attribute.variantTypeId,
      variantId: attribute.variantId,
    };
  });
}

function parseVariantImages(images, fileMap) {
  if (images === undefined || images === null || images === "") return [];

  let finalImages = images;
  if (typeof images === "string") {
    try {
      finalImages = JSON.parse(images);
    } catch (error) {
      throw new Error("Invalid variant images format.");
    }
  }

  if (!Array.isArray(finalImages)) {
    throw new Error("Invalid variant images format.");
  }

  return finalImages.map((image) => {
    const imageOrder = Number(image.image);
    if (Number.isNaN(imageOrder) || imageOrder < 1) {
      throw new Error("Variant image position must be a positive number.");
    }

    if (!image.url || typeof image.url !== "string") {
      throw new Error("Variant image url is required.");
    }

    const rawUrl = image.url.trim();
    const mappedFile = fileMap?.get(rawUrl);
    const resolvedUrl = mappedFile?.path || rawUrl;

    return {
      image: imageOrder,
      url: resolvedUrl,
    };
  });
}

function parseRemoveImages(removeImages) {
  if (removeImages === undefined || removeImages === null || removeImages === "") {
    return [];
  }

  let parsed = removeImages;
  if (typeof removeImages === "string") {
    try {
      parsed = JSON.parse(removeImages);
    } catch (error) {
      throw new Error("Invalid removeImages format. Expected JSON array.");
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid removeImages format. Expected array.");
  }

  return parsed.map((imageNumber) => {
    const parsedNumber = Number(imageNumber);
    if (!Number.isInteger(parsedNumber) || parsedNumber < 1 || parsedNumber > 5) {
      throw new Error("removeImages must contain image numbers from 1 to 5.");
    }
    return parsedNumber;
  });
}

async function parseVariants(rawVariants, fileMap) {
  if (rawVariants === undefined) return undefined;
  if (rawVariants === "" || rawVariants === null) return [];

  let variants = rawVariants;
  if (typeof rawVariants === "string") {
    try {
      variants = JSON.parse(rawVariants);
    } catch (error) {
      throw new Error("Invalid variants format. Expected JSON array.");
    }
  }

  if (!Array.isArray(variants)) {
    throw new Error("Invalid variants format. Expected array.");
  }

  return await Promise.all(variants.map(async (variant) => {
    const price = toNullableNumber(variant.price);
    const offerPrice = toNullableNumber(variant.offerPrice);
    const quantity = toNullableNumber(variant.quantity);

    if (!variant.sku || !String(variant.sku).trim()) {
      throw new Error("Variant sku is required.");
    }

    if (price === null || price < 0) {
      throw new Error(`Variant price is invalid for sku "${variant.sku}".`);
    }

    if (quantity === null || quantity < 0 || !Number.isInteger(quantity)) {
      throw new Error(`Variant quantity is invalid for sku "${variant.sku}".`);
    }

    if (offerPrice !== null && offerPrice > price) {
      throw new Error(`Variant offerPrice cannot be greater than price for sku "${variant.sku}".`);
    }

    const parsedVariant = {
      sku: String(variant.sku).trim(),
      attributes: await parseAttributes(variant.attributes),
      price,
      quantity,
      images: parseVariantImages(variant.images, fileMap),
      isActive: toNullableBoolean(variant.isActive, true),
    };

    if (offerPrice !== null) {
      parsedVariant.offerPrice = offerPrice;
    } else {
      parsedVariant.offerPrice = undefined;
    }

    if (variant._id && mongoose.Types.ObjectId.isValid(variant._id)) {
      parsedVariant._id = variant._id;
    }

    return parsedVariant;
  }));
}

function validateVariantUniqueness(variants) {
  const seenSkus = new Set();
  const seenCombinations = new Set();

  for (const variant of variants) {
    const normalizedSku = variant.sku.toLowerCase();
    if (seenSkus.has(normalizedSku)) {
      throw new Error(`Duplicate variant sku detected: "${variant.sku}".`);
    }
    seenSkus.add(normalizedSku);

    const attributesEntries = (variant.attributes || [])
      .map((attribute) => [
        attribute.variantTypeId.toString(),
        attribute.variantId.toString(),
      ])
      .sort(([a], [b]) => a.localeCompare(b));
    const combinationKey = JSON.stringify(attributesEntries);

    if (combinationKey !== "[]" && seenCombinations.has(combinationKey)) {
      throw new Error(`Duplicate variant attributes combination detected for sku "${variant.sku}".`);
    }
    if (combinationKey !== "[]") {
      seenCombinations.add(combinationKey);
    }
  }
}

exports.getAll = async () => {
  return await Product.find()
    .populate("proCategoryId", "id name")
    .populate("proSubCategoryId", "id name")
    .populate("proBrandId", "id name")
    .populate("proVariantTypeId", "id type")
    .populate("variants.attributes.variantTypeId", "name type")
    .populate("variants.attributes.variantId", "name variantTypeId");
};

exports.getById = async (id) => {
  return await Product.findById(id)
    .populate("proCategoryId", "id name")
    .populate("proSubCategoryId", "id name")
    .populate("proBrandId", "id name")
    .populate("proVariantTypeId", "id name")
    .populate("variants.attributes.variantTypeId", "name type")
    .populate("variants.attributes.variantId", "name variantTypeId");
};

exports.create = async (req) => {
  return new Promise((resolve, reject) => {
    uploadProduct.any()(req, null, async (err) => {
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
          variants,
        } = req.body;

        const parsedPrice = toNullableNumber(price);
        const parsedOfferPrice = toNullableNumber(offerPrice);
        const parsedQuantity = toNullableNumber(quantity);
        const fileMap = toFileMap(req.files || []);
        const parsedVariants = await parseVariants(variants, fileMap);

        if (parsedPrice === null || parsedPrice < 0) {
          throw new Error("Product price is required and must be greater than or equal to 0.");
        }

        if (parsedQuantity === null || parsedQuantity < 0 || !Number.isInteger(parsedQuantity)) {
          throw new Error("Product quantity is required and must be an integer greater than or equal to 0.");
        }

        if (parsedOfferPrice !== null && parsedOfferPrice > parsedPrice) {
          throw new Error("Offer price cannot be greater than original price.");
        }

        if (parsedVariants !== undefined) {
          validateVariantUniqueness(parsedVariants);
        }

        name = name.toLowerCase();

        const exist = await Product.findOne({ name });
        if (exist) throw new Error("Product already exists.");

        const images = buildImageUrls(req.files || []);

        const product = new Product({
          name,
          description,
          quantity: parsedQuantity,
          price: parsedPrice,
          offerPrice: parsedOfferPrice ?? undefined,
          proCategoryId,
          proSubCategoryId,
          proBrandId,
          proVariantTypeId,
          proVariantId,
          images,
          variants: parsedVariants ?? [],
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
    uploadProduct.any()(req, null, async (err) => {
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
          variants,
        } = req.body;

        const nextPrice = price ?? product.price;
        const nextOfferPrice = offerPrice ?? product.offerPrice;
        const parsedPrice = toNullableNumber(nextPrice);
        const parsedOfferPrice = toNullableNumber(nextOfferPrice);
        const parsedQuantity =
          quantity !== undefined ? toNullableNumber(quantity) : product.quantity;
        const fileMap = toFileMap(req.files || []);
        const parsedVariants = await parseVariants(variants, fileMap);

        if (parsedPrice === null || parsedPrice < 0) {
          throw new Error("Product price must be greater than or equal to 0.");
        }

        if (
          parsedQuantity === null ||
          parsedQuantity < 0 ||
          !Number.isInteger(parsedQuantity)
        ) {
          throw new Error("Product quantity must be an integer greater than or equal to 0.");
        }

        if (
          parsedOfferPrice !== null &&
          parsedOfferPrice > parsedPrice
        ) {
          throw new Error("Offer price cannot be greater than original price.");
        }

        if (parsedVariants !== undefined) {
          validateVariantUniqueness(parsedVariants);
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
        product.quantity = parsedQuantity;
        product.price = parsedPrice;
        product.offerPrice = parsedOfferPrice ?? undefined;
        product.proCategoryId = proCategoryId ?? product.proCategoryId;
        product.proSubCategoryId =
          proSubCategoryId ?? product.proSubCategoryId;
        product.proBrandId = proBrandId ?? product.proBrandId;
        product.proVariantTypeId =
          proVariantTypeId ?? product.proVariantTypeId;
        product.proVariantId = proVariantId ?? product.proVariantId;
        if (parsedVariants !== undefined) {
          product.variants = parsedVariants;
        }

        if (imageNumbersToRemove.size > 0) {
          product.images = product.images.filter(
            (img) => !imageNumbersToRemove.has(img.image)
          );
        }

        const fieldNames = ["image1", "image2", "image3", "image4", "image5"];
        const fileMapForProduct = toFileMap(req.files || []);

        fieldNames.forEach((field, index) => {
          const file = fileMapForProduct.get(field);
          if (file) {
            const imageUrl = file.path;

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
