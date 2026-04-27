const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  orderStatus: {
    type: String,
    enum: [
      "pending_payment",
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ],
    default: "pending",
  },
  items: [
    {
      productID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      productName: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      variant: {
        type: String,
      },
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      sku: {
        type: String,
        trim: true,
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
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    phone: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },

  paymentMethod: {
    type: String,
    enum: ["cod", "prepaid"],
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "requires_payment", "paid", "failed", "cancelled"],
    default: "unpaid",
  },
  paymentIntentId: {
    type: String,
    trim: true,
  },
  stockReservedAt: {
    type: Date,
  },

  couponCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
  },
  orderTotal: {
    subtotal: Number,
    discount: Number,
    total: Number,
  },
  trackingUrl: {
    type: String,
  },
});

orderSchema.index({ userID: 1, _id: -1 });
orderSchema.index({ userID: 1, orderStatus: 1 });
orderSchema.index(
  { paymentIntentId: 1 },
  { unique: true, sparse: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
