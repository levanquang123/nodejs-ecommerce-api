const Joi = require("joi");

exports.registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  password: Joi.string().min(6).required(),
});

exports.loginSchema = Joi.object({
  name: Joi.string().required(),
  password: Joi.string().required(),
});

exports.updateUserSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  password: Joi.string().min(6).optional(),
});