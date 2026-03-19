const multer = require("multer");
const multerStorageCloudinary = require('multer-storage-cloudinary');
const CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;
const cloudinary = require("cloudinary").v2;

const FILE_SIZE_LIMIT = 1024 * 1024 * 5;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function createCloudinaryStorage(folderName) {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const originalName = file.originalname.split(".")[0].replace(/\s+/g, "-");

      return {
        folder: `ecommerce/${folderName}`,
        allowed_formats: ["jpg", "jpeg", "png"],
        public_id: `${Date.now()}-${originalName}`,
      };
    },
  });
}

const uploadProduct = multer({
  storage: createCloudinaryStorage("products"),
  limits: { fileSize: FILE_SIZE_LIMIT },
});

const uploadCategory = multer({
  storage: createCloudinaryStorage("categories"),
  limits: { fileSize: FILE_SIZE_LIMIT },
});

const uploadPosters = multer({
  storage: createCloudinaryStorage("posters"),
  limits: { fileSize: FILE_SIZE_LIMIT },
});

module.exports = {
  uploadCategory,
  uploadPosters,
  uploadProduct,
};