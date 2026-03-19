const Joi = require("joi");

exports.createSubCategorySchema = Joi.object({
  name: Joi.string().min(2).required(),
  categoryId: Joi.string().required(),
});

exports.updateSubCategorySchema = Joi.object({
  name: Joi.string().min(2).required(),
  categoryId: Joi.string().required(),
});