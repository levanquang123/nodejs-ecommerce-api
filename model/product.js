const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is requiredd"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: [true, "Price is requiredd"],
    },
    offerPrice: {
      type: Number,
    },
    images: [
      {
        image: {
          type: Number,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    proCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    proSubCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    proBrandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    proVariantTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VariantType",
    },
    proVariantIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
