const Joi = require("joi");
const mongoose = require("mongoose");

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid ObjectId");
  }
  return value;
};

exports.createOrderSchema = Joi.object({
  userID: Joi.string().required().custom(objectId),

  orderStatus: Joi.string()
    .valid("pending", "processing", "shipped", "delivered", "cancelled")
    .optional(),

  items: Joi.array()
    .items(
      Joi.object({
        productID: Joi.string().required().custom(objectId),
        productName: Joi.string().required(),
        quantity: Joi.number().required().min(1),
        price: Joi.number().required().min(0),
        variant: Joi.string().allow("", null),
      })
    )
    .min(1)
    .required(),

  totalPrice: Joi.number().required().min(0),

  shippingAddress: Joi.object({
    phone: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required(),
  }).required(),

  paymentMethod: Joi.string().valid("cod", "prepaid").required(),

  couponCode: Joi.string().allow(null, ""),

  orderTotal: Joi.object({
    subtotal: Joi.number().required(),
    discount: Joi.number().min(0).default(0),
    total: Joi.number().required(),
  }).required(),

  trackingUrl: Joi.string().uri().allow("", null),
});

exports.updateOrderSchema = Joi.object({
  orderStatus: Joi.string()
    .valid("pending", "processing", "shipped", "delivered", "cancelled")
    .required(),

  trackingUrl: Joi.string().uri().allow("", null),
});