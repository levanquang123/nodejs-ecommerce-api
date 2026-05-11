const Poster = require("../model/poster");

exports.getAll = async () => {
  return await Poster.find();
};

exports.getById = async (id) => {
  return await Poster.findById(id);
};

exports.create = async ({ posterName, imageUrl }) => {
  posterName = posterName.toLowerCase();

  const exist = await Poster.findOne({ posterName });
  if (exist) throw new Error("Poster already exists.");

  const newPoster = new Poster({
    posterName,
    imageUrl,
  });

  return await newPoster.save();
};

exports.update = async (id, { posterName, imageUrl }) => {
  const poster = await Poster.findById(id);
  if (!poster) throw new Error("Poster not found.");

  posterName = posterName.toLowerCase();

  const exist = await Poster.findOne({
    posterName,
    _id: { $ne: id },
  });

  if (exist) throw new Error("Poster already exists.");

  poster.posterName = posterName;

  if (imageUrl) {
    poster.imageUrl = imageUrl;
  }

  return await poster.save();
};

exports.delete = async (id) => {
  const deleted = await Poster.findByIdAndDelete(id);

  if (!deleted) throw new Error("Poster not found.");
};
