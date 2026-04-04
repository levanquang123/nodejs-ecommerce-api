const Joi = require("joi");

const variantAttributeSchema = Joi.object({
  variantTypeId: Joi.string().hex().length(24).required(),
  variantId: Joi.string().hex().length(24).required(),
});

const variantSchema = Joi.object({
  _id: Joi.string().hex().length(24).optional(),
  sku: Joi.string().trim().min(1).required(),
  attributes: Joi.array().items(variantAttributeSchema).default([]),
  price: Joi.number().min(0).required(),
  offerPrice: Joi.number().min(0).allow(null),
  quantity: Joi.number().integer().min(0).required(),
  images: Joi.array()
    .items(
      Joi.object({
        image: Joi.number().integer().min(1).required(),
        url: Joi.string().uri().required(),
      })
    )
    .default([]),
  isActive: Joi.boolean().default(true),
});

exports.createProductSchema = Joi.object({
  name: Joi.string().min(2).required(),
  description: Joi.string().allow("", null),
  quantity: Joi.number().required(),
  price: Joi.number().required(),
  offerPrice: Joi.number().allow(null),
  proCategoryId: Joi.string().required(),
  proSubCategoryId: Joi.string().required(),
  proBrandId: Joi.string().allow(null),
  proVariantTypeId: Joi.string().allow(null),
  proVariantId: Joi.string().allow(null),
  variants: Joi.alternatives()
    .try(Joi.array().items(variantSchema), Joi.string().allow(""))
    .optional(),
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  description: Joi.string().allow("", null),
  quantity: Joi.number().optional(),
  price: Joi.number().optional(),
  offerPrice: Joi.number().allow(null),
  proCategoryId: Joi.string().optional(),
  proSubCategoryId: Joi.string().optional(),
  proBrandId: Joi.string().allow(null),
  proVariantTypeId: Joi.string().allow(null),
  proVariantId: Joi.string().allow(null),
  variants: Joi.alternatives()
    .try(Joi.array().items(variantSchema), Joi.string().allow(""))
    .optional(),
});
