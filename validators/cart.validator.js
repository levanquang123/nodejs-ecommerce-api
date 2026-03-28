const Joi = require("joi");

const objectIdSchema = Joi.string().hex().length(24);

exports.addItemToCartSchema = Joi.object({
  productId: objectIdSchema.required(),
  quantity: Joi.number().integer().min(1).required(),
  variant: Joi.string().allow("").default(""),
});

exports.updateCartItemSchema = Joi.object({
  productId: objectIdSchema.required(),
  quantity: Joi.number().integer().min(1).required(),
  variant: Joi.string().allow("").default(""),
});

exports.removeCartItemSchema = Joi.object({
  productId: objectIdSchema.required(),
  variant: Joi.string().allow("").default(""),
});

exports.clearCartSchema = Joi.object({});
