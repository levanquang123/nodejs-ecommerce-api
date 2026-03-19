const Joi = require("joi");

exports.createVariantTypeSchema = Joi.object({
  name: Joi.string().lowercase().trim().min(2).required(),
  type: Joi.string().optional(),
});

exports.updateVariantTypeSchema = Joi.object({
  name: Joi.string().lowercase().trim().min(2).required(),
  type: Joi.string().optional(),
});