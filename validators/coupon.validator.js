const Joi = require("joi");

const objectId = Joi.string().hex().length(24);
const discountAmount = Joi.when("discountType", {
  is: "percentage",
  then: Joi.number().greater(0).max(100).required().messages({
    "number.greater": "Percentage discount must be greater than 0.",
    "number.max": "Percentage discount cannot be greater than 100.",
  }),
  otherwise: Joi.number().greater(0).required().messages({
    "number.greater": "Fixed discount must be greater than 0.",
  }),
});

exports.createCouponSchema = Joi.object({
  couponCode: Joi.string().trim().lowercase().required(),
  discountType: Joi.string().valid("percentage", "fixed").required(),
  discountAmount,
  minimumPurchaseAmount: Joi.number().min(0).default(0),
  endDate: Joi.date().required(),
  status: Joi.string().valid("active", "inactive").required(),
  applicableCategory: objectId.allow(null, ""),
  applicableSubCategory: objectId.allow(null, ""),
  applicableProduct: objectId.allow(null, ""),
});

exports.updateCouponSchema = exports.createCouponSchema;

exports.checkCouponSchema = Joi.object({
  couponCode: Joi.string().required(),
  productIds: Joi.array().items(Joi.string()).required(),
  purchaseAmount: Joi.number().required(),
});
