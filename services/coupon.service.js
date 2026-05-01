const Coupon = require("../model/couponCode");
const Product = require("../model/product");
const mongoose = require("mongoose");

const optionalObjectIdFields = [
  "applicableCategory",
  "applicableSubCategory",
  "applicableProduct",
];

function normalizeCouponData(data) {
  const normalized = { ...data };

  if (normalized.couponCode) {
    normalized.couponCode = normalized.couponCode.trim().toLowerCase();
  }

  if (normalized.minimumPurchaseAmount === undefined || normalized.minimumPurchaseAmount === null) {
    normalized.minimumPurchaseAmount = 0;
  }

  for (const field of optionalObjectIdFields) {
    if (normalized[field] === "" || normalized[field] === null) {
      normalized[field] = undefined;
    }
  }

  return normalized;
}

function validateDiscount({ discountType, discountAmount }) {
  if (discountAmount <= 0) {
    throw new Error(
      discountType === "percentage"
        ? "Percentage discount must be greater than 0."
        : "Fixed discount must be greater than 0."
    );
  }

  if (discountType === "percentage" && discountAmount > 100) {
    throw new Error("Percentage discount cannot be greater than 100.");
  }
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function calculateCouponDiscount(coupon, subtotal) {
  if (coupon.discountType === "percentage") {
    return roundMoney(subtotal * (coupon.discountAmount / 100));
  }

  return roundMoney(Math.min(coupon.discountAmount, subtotal));
}

async function buildCouponItems({ items, productIds }) {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item) => ({
      productID: item.productID || item.productId,
      variantId: item.variantId || null,
      quantity: Number(item.quantity || 1),
    }));
  }

  return (productIds || []).map((productId) => ({
    productID: productId,
    variantId: null,
    quantity: 1,
  }));
}

async function normalizeCouponPreviewItems({ items, productIds }) {
  const requestedItems = await buildCouponItems({ items, productIds });
  if (!requestedItems.length) {
    throw new Error("No products found.");
  }

  const ids = requestedItems.map((item) => item.productID);
  const products = await Product.find({ _id: { $in: ids } });
  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  return requestedItems.map((item) => {
    const product = productMap.get(String(item.productID));
    if (!product) {
      throw new Error("No products found.");
    }

    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    let unitPrice =
      product.offerPrice !== undefined && product.offerPrice !== null
        ? product.offerPrice
        : product.price;

    if (hasVariants) {
      if (!item.variantId || !mongoose.Types.ObjectId.isValid(item.variantId)) {
        throw new Error(`variantId is required for product ${product.name}.`);
      }

      const selectedVariant = product.variants.find(
        (variant) =>
          variant._id.toString() === String(item.variantId) &&
          variant.isActive !== false
      );

      if (!selectedVariant) {
        throw new Error(`Selected variant was not found for product ${product.name}.`);
      }

      unitPrice =
        selectedVariant.offerPrice !== undefined &&
        selectedVariant.offerPrice !== null
          ? selectedVariant.offerPrice
          : selectedVariant.price;
    }

    return {
      product,
      quantity: item.quantity,
      unitPrice,
    };
  });
}

function validateCouponApplicability(coupon, normalizedItems) {
  const isValid = normalizedItems.every(({ product }) => {
    if (
      coupon.applicableCategory &&
      coupon.applicableCategory.toString() !== product.proCategoryId.toString()
    ) {
      return false;
    }

    if (
      coupon.applicableSubCategory &&
      coupon.applicableSubCategory.toString() !== product.proSubCategoryId.toString()
    ) {
      return false;
    }

    if (
      coupon.applicableProduct &&
      product._id.toString() !== coupon.applicableProduct.toString()
    ) {
      return false;
    }

    return true;
  });

  if (!isValid) {
    throw new Error("Coupon is not applicable for the provided products.");
  }
}

exports.getAll = async () => {
  return await Coupon.find()
    .populate("applicableCategory", "id name")
    .populate("applicableSubCategory", "id name")
    .populate("applicableProduct", "id name");
};

exports.getById = async (id) => {
  return await Coupon.findById(id)
    .populate("applicableCategory", "id name")
    .populate("applicableSubCategory", "id name")
    .populate("applicableProduct", "id name");
};

exports.create = async (data) => {
  data = normalizeCouponData(data);
  validateDiscount(data);

  const exist = await Coupon.findOne({ couponCode: data.couponCode });
  if (exist) throw new Error("Coupon already exists.");

  const coupon = new Coupon(data);
  return await coupon.save();
};

exports.update = async (id, data) => {
  data = normalizeCouponData(data);
  validateDiscount(data);

  const exist = await Coupon.findOne({
    couponCode: data.couponCode,
    _id: { $ne: id },
  });

  if (exist) throw new Error("Coupon already exists.");

  const updated = await Coupon.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new Error("Coupon not found.");

  return updated;
};

exports.delete = async (id) => {
  const deleted = await Coupon.findByIdAndDelete(id);
  if (!deleted) throw new Error("Coupon not found.");
};

exports.checkCoupon = async ({ couponCode, productIds, purchaseAmount, items }) => {
  const normalizedCouponCode = String(couponCode || "").trim().toLowerCase();
  const coupon = await Coupon.findOne({ couponCode: normalizedCouponCode });
  if (!coupon) throw new Error("Coupon not found.");

  const currentDate = new Date();

  if (coupon.endDate < currentDate) {
    throw new Error("Coupon is expired.");
  }

  if (coupon.status !== "active") {
    throw new Error("Coupon is inactive.");
  }

  const normalizedItems = await normalizeCouponPreviewItems({ items, productIds });
  const subtotal = roundMoney(
    normalizedItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * Number(item.quantity),
      0
    )
  );

  if (coupon.minimumPurchaseAmount && subtotal < coupon.minimumPurchaseAmount) {
    throw new Error("Minimum purchase amount not met.");
  }

  validateCouponApplicability(coupon, normalizedItems);

  const discount = calculateCouponDiscount(coupon, subtotal);
  const total = roundMoney(Math.max(0, subtotal - discount));

  return {
    ...coupon.toObject(),
    calculatedDiscount: discount,
    orderTotal: {
      subtotal,
      discount,
      total,
    },
  };
};
