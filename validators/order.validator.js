const Joi = require("joi");

exports.createOrderSchema = Joi.object({
  userID: Joi.string().required(),
  orderStatus: Joi.string().allow("", null),
  items: Joi.array()
    .items(
      Joi.object({
        productID: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
      })
    )
    .required(),
  totalPrice: Joi.number().required(),
  shippingAddress: Joi.string().required(),
  paymentMethod: Joi.string().required(),
  couponCode: Joi.string().allow(null, ""),
  orderTotal: Joi.number().required(),
  trackingUrl: Joi.string().allow("", null),
});

exports.updateOrderSchema = Joi.object({
  orderStatus: Joi.string().required(),
  trackingUrl: Joi.string().allow("", null),
});