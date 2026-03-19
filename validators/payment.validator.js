const Joi = require("joi");

exports.createPaymentSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().optional(),
  address: Joi.object().optional(),
  amount: Joi.number().min(1).required(),
  currency: Joi.string().required(),
  description: Joi.string().optional(),
});