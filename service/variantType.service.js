const VariantType = require("../model/variantType");
const Variant = require("../model/variant");
const Product = require("../model/product");

exports.getAll = async () => {
  return await VariantType.find();
};

exports.getById = async (id) => {
  return await VariantType.findById(id);
};

exports.create = async ({ name, type }) => {
  const exist = await VariantType.findOne({
    name: new RegExp(`^${name}$`, "i"),
  });
  if (exist) throw new Error("VariantType already exists");

  const variantType = new VariantType({ name, type });
  return await variantType.save();
};

exports.update = async (id, { name, type }) => {
  const exist = await VariantType.findOne({
    name: new RegExp(`^${name}$`, "i"),
    _id: { $ne: id },
  });

  if (exist) throw new Error("VariantType already exists");

  const updated = await VariantType.findByIdAndUpdate(
    id,
    { name, type },
    { new: true }
  );

  if (!updated) throw new Error("VariantType not found.");

  return updated;
};

exports.delete = async (id) => {
  const variantCount = await Variant.countDocuments({
    variantTypeId: id,
  });

  if (variantCount > 0) {
    throw new Error(
      "Cannot delete variant type. It is associated with variants."
    );
  }

  const productCount = await Product.countDocuments({
    proVariantTypeId: id,
  });

  if (productCount > 0) {
    throw new Error(
      "Cannot delete variant type. It is associated with products."
    );
  }

  const deleted = await VariantType.findByIdAndDelete(id);
  if (!deleted) throw new Error("Variant type not found.");
};
