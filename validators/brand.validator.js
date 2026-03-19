const Joi = require("joi");

exports.createBrandSchema = Joi.object({
  name: Joi.string().min(2).required(),
  subCategoryId: Joi.string().required(),
});

exports.updateBrandSchema = Joi.object({
  name: Joi.string().min(2).required(),
  subCategoryId: Joi.string().required(),
});