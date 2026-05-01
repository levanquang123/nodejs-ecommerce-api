const mongoose = require("mongoose");

const paymentSessionSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [
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
          variant: String,
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
      required: true,
    },
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
    paymentIntentId: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["requires_payment", "paid", "failed", "cancelled"],
      default: "requires_payment",
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
    completedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  },
  { timestamps: true }
);

paymentSessionSchema.index({ userID: 1, _id: -1 });
paymentSessionSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("PaymentSession", paymentSessionSchema);
