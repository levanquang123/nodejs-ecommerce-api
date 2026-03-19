const Poster = require("../model/poster");
const { uploadPosters } = require("../uploadFile");
const multer = require("multer");

function handleMulterError(err) {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    throw new Error("File size is too large. Maximum filesize is 5MB.");
  }

  throw new Error(err.message || "Upload failed.");
}

exports.getAll = async () => {
  return await Poster.find();
};

exports.getById = async (id) => {
  return await Poster.findById(id);
};

exports.create = async (req) => {
  return new Promise((resolve, reject) => {
    uploadPosters.single("img")(req, null, async (err) => {
      if (err) return reject(handleMulterError(err));

      try {
        let { posterName } = req.body;
        posterName = posterName.toLowerCase();

        const exist = await Poster.findOne({ posterName });
        if (exist) throw new Error("Poster already exists.");

        const imageUrl = req.file ? req.file.path : "no_url";

        const newPoster = new Poster({
          posterName,
          imageUrl,
        });

        await newPoster.save();

        resolve(newPoster);
      } catch (error) {
        reject(error);
      }
    });
  });
};

exports.update = async (id, req) => {
  return new Promise((resolve, reject) => {
    uploadPosters.single("img")(req, null, async (err) => {
      if (err) return reject(handleMulterError(err));

      try {
        const poster = await Poster.findById(id);
        if (!poster) throw new Error("Poster not found.");

        let { posterName } = req.body;

        if (posterName) {
          posterName = posterName.toLowerCase();

          const exist = await Poster.findOne({
            posterName,
            _id: { $ne: id },
          });

          if (exist) throw new Error("Poster already exists.");

          poster.posterName = posterName;
        }

        if (req.file) {
          poster.imageUrl = req.file.path;
        }

        await poster.save();

        resolve(poster);
      } catch (error) {
        reject(error);
      }
    });
  });
};

exports.delete = async (id) => {
  const deleted = await Poster.findByIdAndDelete(id);

  if (!deleted) throw new Error("Poster not found.");
};