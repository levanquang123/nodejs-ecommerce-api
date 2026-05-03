const Category = require("../model/category");
const SubCategory = require("../model/subCategory");
const Product = require("../model/product");

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

exports.getAll = async () => {
  return await Category.find();
};

exports.getById = async (id) => {
  return await Category.findById(id);
};

exports.create = async ({ name, image }) => {
  const exist = await Category.findOne({ name });
  if (exist) {
    throw createError("Category already exists.", 409);
  }

  const category = new Category({ name, image });
  return await category.save();
};

exports.update = async (id, { name, image }) => {
  const category = await Category.findById(id);
  if (!category) throw new Error("Category not found.");

  if (name) {
    const exist = await Category.findOne({
      name,
      _id: { $ne: id },
    });
    if (exist) throw createError("Category already exists.", 409);
    category.name = name;
  }

  if (image) {
    category.image = image;
  }

  return await category.save();
};

exports.delete = async (id) => {
  const sub = await SubCategory.find({ categoryId: id });
  if (sub.length > 0) {
    throw new Error("Cannot delete Category, subCategories are referencing it.");
  }

  const products = await Product.find({ proCategoryId: id });
  if (products.length > 0) {
    throw new Error("Cannot delete Category, products are referencing it.");
  }

  const deleted = await Category.findByIdAndDelete(id);
  if (!deleted) throw new Error("Category not found.");
};
