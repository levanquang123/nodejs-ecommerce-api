const Joi = require("joi");

exports.registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
});