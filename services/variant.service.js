const Variant = require("../model/variant");
const Product = require("../model/product");

exports.getAll = async () => {
  return await Variant.find()
    .populate("variantTypeId")
    .sort({ variantTypeId: 1 });
};

exports.getById = async (id) => {
  return await Variant.findById(id).populate("variantTypeId");
};

exports.create = async ({ name, variantTypeId }) => {
  name = name.toLowerCase().trim();

  const exist = await Variant.findOne({
    name: new RegExp(`^${name}$`, "i"),
    variantTypeId,
  });

  if (exist) throw new Error("Variant already exists");

  const variant = new Variant({ name, variantTypeId });
  return await variant.save();
};

exports.update = async (id, { name, variantTypeId }) => {
  name = name.toLowerCase().trim();

  const exist = await Variant.findOne({
    name: new RegExp(`^${name}$`, "i"),
    variantTypeId,
    _id: { $ne: id },
  });

  if (exist) throw new Error("Variant already exists");

  const updated = await Variant.findByIdAndUpdate(
    id,
    { name, variantTypeId },
    { new: true }
  );

  if (!updated) throw new Error("Variant not found.");

  return updated;
};

exports.delete = async (id) => {
  const productCount = await Product.countDocuments({
    $or: [
      { proVariantId: id },
      { "variants.attributes.variantId": id },
    ],
  });

  if (productCount > 0) {
    throw new Error("Cannot delete variant. Products are referencing it.");
  }

  const deleted = await Variant.findByIdAndDelete(id);
  if (!deleted) throw new Error("Variant not found.");
};
