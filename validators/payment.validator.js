const Joi = require("joi");

exports.createPaymentSchema = Joi.object({
  shippingAddress: Joi.object({
    phone: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required(),
  }).required(),

  items: Joi.array()
    .items(
      Joi.object({
        productID: Joi.string().hex().length(24).required(),
        variantId: Joi.string().hex().length(24).allow(null, ""),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),

  couponCode: Joi.string().hex().length(24).allow(null, ""),
});
