const Joi = require("joi");

exports.createCouponSchema = Joi.object({
  couponCode: Joi.string().lowercase().required(),
  discountType: Joi.string().valid("percentage", "fixed").required(),
  discountAmount: Joi.number().min(0).required(),
  minimumPurchaseAmount: Joi.number().min(0).optional(),
  endDate: Joi.date().required(),
  status: Joi.string().valid("active", "inactive").required(),
  applicableCategory: Joi.string().optional(),
  applicableSubCategory: Joi.string().optional(),
  applicableProduct: Joi.string().optional(),
});

exports.updateCouponSchema = exports.createCouponSchema;

exports.checkCouponSchema = Joi.object({
  couponCode: Joi.string().required(),
  productIds: Joi.array().items(Joi.string()).required(),
  purchaseAmount: Joi.number().required(),
});