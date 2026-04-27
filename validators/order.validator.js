const Joi = require("joi");
const mongoose = require("mongoose");

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid ObjectId");
  }
  return value;
};

exports.createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productID: Joi.string().required().custom(objectId),
        variantId: Joi.alternatives().try(
          Joi.string().custom(objectId),
          Joi.valid("", null)
        ),
        productName: Joi.string().optional(),
        quantity: Joi.number().required().min(1),
        price: Joi.number().min(0),
        variant: Joi.string().allow("", null),
        sku: Joi.string().allow("", null),
        attributes: Joi.array()
          .items(
            Joi.object({
              variantTypeId: Joi.string().hex().length(24).allow("", null),
              variantTypeName: Joi.string().allow("", null),
              variantId: Joi.string().hex().length(24).allow("", null),
              variantName: Joi.string().allow("", null),
            })
          )
          .optional(),
        image: Joi.string().uri().allow("", null),
      })
    )
    .min(1)
    .required(),

  shippingAddress: Joi.object({
    phone: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required(),
  }).required(),

  paymentMethod: Joi.string().valid("cod", "prepaid").required(),

  couponCode: Joi.string().custom(objectId).allow(null, ""),
});

exports.updateOrderSchema = Joi.object({
  orderStatus: Joi.string()
    .valid("pending_payment", "pending", "processing", "shipped", "delivered", "cancelled")
    .required(),

  trackingUrl: Joi.string().uri().allow("", null),
});
