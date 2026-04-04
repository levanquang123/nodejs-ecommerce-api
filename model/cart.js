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
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    sku: {
      type: String,
      trim: true,
      default: "",
    },
    attributes: {
      type: [
        new mongoose.Schema(
          {
            variantTypeId: {
              type: mongoose.Schema.Types.ObjectId,
              default: null,
            },
            variantTypeName: {
              type: String,
              trim: true,
              default: "",
            },
            variantId: {
              type: mongoose.Schema.Types.ObjectId,
              default: null,
            },
            variantName: {
              type: String,
              trim: true,
              default: "",
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    image: {
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
