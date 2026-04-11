const Joi = require("joi");
const mongoose = require("mongoose");

const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid ObjectId");
  }
  return value;
};

exports.createReviewSchema = Joi.object({
  orderID: Joi.string().required().custom(objectId),
  orderItemID: Joi.string().required().custom(objectId),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(3).max(1000).required(),
});

exports.updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  comment: Joi.string().trim().min(3).max(1000).optional(),
}).or("rating", "comment");
