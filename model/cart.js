const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    variant: {
      type: String,
      trim: true,
      default: "",
    },

    priceAtAdd: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;