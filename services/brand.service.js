const Brand = require("../model/brand");
const Product = require("../model/product");

exports.getAll = async () => {
  return await Brand.find()
    .populate("subCategoryId")
    .sort({ subCategoryId: 1 });
};

exports.getById = async (id) => {
  return await Brand.findById(id).populate("subCategoryId");
};

exports.create = async ({ name, subCategoryId }) => {
  const exist = await Brand.findOne({ name });
  if (exist) throw new Error("Brand already exists");

  const brand = new Brand({ name, subCategoryId });
  return await brand.save();
};

exports.update = async (id, { name, subCategoryId }) => {
  const exist = await Brand.findOne({
    name,
    _id: { $ne: id },
  });

  if (exist) throw new Error("Brand already exists");

  const updated = await Brand.findByIdAndUpdate(
    id,
    { name, subCategoryId },
    { new: true }
  );

  if (!updated) throw new Error("Brand not found.");

  return updated;
};

exports.delete = async (id) => {
  const products = await Product.countDocuments({
    proBrandId: id,
  });

  if (products > 0) {
    throw new Error(
      "Cannot delete brand. It is associated with one or more products."
    );
  }

  const deleted = await Brand.findByIdAndDelete(id);
  if (!deleted) throw new Error("Brand not found.");
};