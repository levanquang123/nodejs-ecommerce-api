const multer = require("multer");
const path = require("path");

const FILE_SIZE_LIMIT = 1024 * 1024 * 5;
const ALLOWED_EXT = /\.(jpeg|png|jpg)$/i;

function createStorage(destination, filenameFn) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      if (!ALLOWED_EXT.test(path.extname(file.originalname))) {
        return cb(new Error("Only .jpeg, .jpg, .png files are allowed!"));
      }
      cb(null, filenameFn(file));
    },
  });
}

const uploadProduct = multer({
  storage: createStorage("./public/products", (file) => `${Date.now()}_${file.originalname}`),
  limits: { fileSize: FILE_SIZE_LIMIT },
});

const uploadCategory = multer({
  storage: createStorage("./public/category", (file) =>
    `${Date.now()}_${Math.floor(Math.random() * 1000)}${path.extname(file.originalname)}`
  ),
  limits: { fileSize: FILE_SIZE_LIMIT },
});

const uploadPosters = multer({
  storage: createStorage("./public/posters", (file) => `${Date.now()}_${file.originalname}`),
  limits: { fileSize: FILE_SIZE_LIMIT },
});

module.exports = {
  uploadCategory,
  uploadPosters,
  uploadProduct,
};
