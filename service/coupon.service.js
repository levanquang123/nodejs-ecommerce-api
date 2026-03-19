const Coupon = require("../model/couponCode");
const Product = require("../model/product");

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
  data.couponCode = data.couponCode.toLowerCase();

  const exist = await Coupon.findOne({ couponCode: data.couponCode });
  if (exist) throw new Error("Coupon already exists.");

  const coupon = new Coupon(data);
  return await coupon.save();
};

exports.update = async (id, data) => {
  data.couponCode = data.couponCode.toLowerCase();

  const exist = await Coupon.findOne({
    couponCode: data.couponCode,
    _id: { $ne: id },
  });

  if (exist) throw new Error("Coupon already exists.");

  const updated = await Coupon.findByIdAndUpdate(id, data, { new: true });
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