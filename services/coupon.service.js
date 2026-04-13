const Coupon = require("../model/couponCode");
const Product = require("../model/product");

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

exports.checkCoupon = async ({ couponCode, productIds, purchaseAmount }) => {
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) throw new Error("Coupon not found.");
  
    const currentDate = new Date();
  
    if (coupon.endDate < currentDate) {
      throw new Error("Coupon is expired.");
    }
  
    if (coupon.status !== "active") {
      throw new Error("Coupon is inactive.");
    }
  
    if (
      coupon.minimumPurchaseAmount &&
      purchaseAmount < coupon.minimumPurchaseAmount
    ) {
      throw new Error("Minimum purchase amount not met.");
    }
  
    // apply all
    if (
      !coupon.applicableCategory &&
      !coupon.applicableSubCategory &&
      !coupon.applicableProduct
    ) {
      return coupon;
    }
  
    const products = await Product.find({ _id: { $in: productIds } });
  
    if (!products.length) {
      throw new Error("No products found.");
    }
  
    const isValid = products.every((product) => {
      if (
        coupon.applicableCategory &&
        coupon.applicableCategory.toString() !== product.proCategoryId.toString()
      ) return false;
  
      if (
        coupon.applicableSubCategory &&
        coupon.applicableSubCategory.toString() !== product.proSubCategoryId.toString()
      ) return false;
  
      if (
        coupon.applicableProduct &&
        product._id.toString() !== coupon.applicableProduct.toString()
      ) return false;
  
      return true;
    });
  
    if (!isValid) {
      throw new Error("Coupon is not applicable for the provided products.");
    }
  
    return coupon;
  };
