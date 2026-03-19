const Joi = require("joi");

exports.createProductSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow("", null),
  quantity: Joi.number().required(),
  price: Joi.number().required(),
  offerPrice: Joi.number().allow(null),
  proCategoryId: Joi.string().required(),
  proSubCategoryId: Joi.string().required(),
  proBrandId: Joi.string().allow(null),
  proVariantTypeId: Joi.string().allow(null),
  proVariantId: Joi.string().allow(null),
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  description: Joi.string().allow("", null),
  quantity: Joi.number().optional(),
  price: Joi.number().optional(),
  offerPrice: Joi.number().allow(null),
  proCategoryId: Joi.string().optional(),
  proSubCategoryId: Joi.string().optional(),
  proBrandId: Joi.string().allow(null),
  proVariantTypeId: Joi.string().allow(null),
  proVariantId: Joi.string().allow(null),
});