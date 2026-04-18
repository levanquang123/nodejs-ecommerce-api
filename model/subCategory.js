const mongoose = require("mongoose");

const subCategorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
    },
  },
  { timestamps: true }
);

subCategorySchema.index({ name: 1 }, { unique: true });
subCategorySchema.index({ categoryId: 1 });

const SubCategory = mongoose.model("SubCategory", subCategorySchema);
module.exports = SubCategory;
