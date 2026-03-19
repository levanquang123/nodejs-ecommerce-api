const Joi = require("joi");

exports.createCategorySchema = Joi.object({
  name: Joi.string().min(2).required(),
});

exports.updateCategorySchema = Joi.object({
  name: Joi.string().min(2).optional(),
});