const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// 1. Cấu hình giới hạn file (5MB)
const FILE_SIZE_LIMIT = 1024 * 1024 * 5;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

// 2. Kết nối Cloudinary (Đảm bảo đã có biến môi trường trên Render)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 3. Hàm tạo Storage an toàn (Sửa lỗi treo/xoay tròn)
function createCloudinaryStorage(folderName) {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // Xử lý tên file an toàn để tránh lỗi logic gây treo request
      const originalName = file.originalname 
        ? file.originalname.split(".")[0].substring(0, 50).replace(/\s+/g, "-") 
        : "image";

      return {
        folder: `ecommerce/${folderName}`,
        allowed_formats: ["jpg", "jpeg", "png"],
        public_id: `${Date.now()}-${originalName}`,
      };
    },
  });
}

// 4. Khởi tạo các Middleware upload cho từng mục đích
const uploadProduct = multer({
  storage: createCloudinaryStorage("products"),
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG and PNG images are allowed."));
    }
    return cb(null, true);
  },
});

const uploadCategory = multer({
  storage: createCloudinaryStorage("categories"),
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG and PNG images are allowed."));
    }
    return cb(null, true);
  },
});

const uploadPosters = multer({
  storage: createCloudinaryStorage("posters"),
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG and PNG images are allowed."));
    }
    return cb(null, true);
  },
});

// 5. Xuất các module để sử dụng ở Routes
module.exports = {
  uploadCategory,
  uploadPosters,
  uploadProduct,
};
