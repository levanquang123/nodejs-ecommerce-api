const Joi = require("joi");

exports.createPosterSchema = Joi.object({
  posterName: Joi.string().min(2).required(),
});

exports.updatePosterSchema = Joi.object({
  posterName: Joi.string().min(2).optional(),
});