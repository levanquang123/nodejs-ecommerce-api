const Joi = require("joi");

exports.createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
});

exports.updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).required(),
});
