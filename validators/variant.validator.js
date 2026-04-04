const Joi = require("joi");

exports.createVariantSchema = Joi.object({
  name: Joi.string().lowercase().trim().min(1).required(),
  variantTypeId: Joi.string().required(),
});

exports.updateVariantSchema = Joi.object({
  name: Joi.string().lowercase().trim().min(1).required(),
  variantTypeId: Joi.string().required(),
});