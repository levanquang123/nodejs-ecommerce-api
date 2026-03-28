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

exports.toggleFavoriteSchema = Joi.object({
  productId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid Product ID',
    'any.required': 'Product ID is required.'
  }),
});

exports.updateAddressSchema = Joi.object({
  fullName: Joi.string().allow("").default(""),
  phone: Joi.string().allow("").default(""),
  street: Joi.string().allow("").default(""),
  city: Joi.string().allow("").default(""),
  state: Joi.string().allow("").default(""),
  postalCode: Joi.string().allow("").default(""),
  country: Joi.string().allow("").default(""),
}).min(1);
