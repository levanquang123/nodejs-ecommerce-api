const SubCategory = require("../model/subCategory");
const Brand = require("../model/brand");
const Product = require("../model/product");

exports.getAll = async () => {
  return await SubCategory.find()
    .populate("categoryId")
    .sort({ categoryId: 1 });
};

exports.getById = async (id) => {
  return await SubCategory.findById(id).populate("categoryId");
};

exports.create = async ({ name, categoryId }) => {
  name = name.toLowerCase();

  const exist = await SubCategory.findOne({ name });
  if (exist) throw new Error("SubCategory already exists");

  const subCategory = new SubCategory({ name, categoryId });
  return await subCategory.save();
};

exports.update = async (id, { name, categoryId }) => {
  name = name.toLowerCase();

  const exist = await SubCategory.findOne({
    name,
    _id: { $ne: id },
  });

  if (exist) throw new Error("SubCategory already exists");

  const updated = await SubCategory.findByIdAndUpdate(
    id,
    { name, categoryId },
    { new: true }
  );

  if (!updated) throw new Error("Sub-category not found.");

  return updated;
};

exports.delete = async (id) => {
  const brands = await Brand.countDocuments({ subCategoryId: id });
  if (brands > 0) {
    throw new Error("Cannot delete sub-category. It is associated with brands.");
  }

  const products = await Product.countDocuments({ proSubCategoryId: id });
  if (products > 0) {
    throw new Error("Cannot delete sub-category. It is associated with products.");
  }

  const deleted = await SubCategory.findByIdAndDelete(id);
  if (!deleted) throw new Error("Sub-category not found.");
};