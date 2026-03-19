const Joi = require("joi");

exports.sendNotificationSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  imageUrl: Joi.string().optional(),
});