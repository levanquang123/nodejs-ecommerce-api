const Joi = require("joi");

exports.createPaymentSchema = Joi.object({
  email: Joi.string().required(),

  name: Joi.string().required(),

  address: Joi.object({
    line1: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postal_code: Joi.string().required(),
    country: Joi.string().required(),
  }).required(),

  amount: Joi.number().required().min(100),

  currency: Joi.string().valid("usd", "vnd").required(),

  description: Joi.string().allow("", null),
});