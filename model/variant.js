const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    variantTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VariantType",
      required: true,
    },
  },
  { timestamps: true }
);

variantSchema.index({ variantTypeId: 1 });
variantSchema.index({ variantTypeId: 1, name: 1 });

module.exports = mongoose.model("Variant", variantSchema);
