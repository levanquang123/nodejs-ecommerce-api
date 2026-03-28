const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const admin = require("../middleware/admin");

const {
  registerSchema,
  loginSchema,
  updateUserSchema,
  toggleFavoriteSchema,
  updateAddressSchema,
} = require("../validators/user.validator");

const userController = require("../controllers/user.controller");

// 1. Các route cố định (Static Routes) - PHẢI ĐỂ LÊN ĐẦU
router.post("/register", validate(registerSchema), userController.register);
router.post("/login", validate(loginSchema), userController.login);

// Các route cần auth
router.get("/me", auth, userController.getMe);
router.put("/me/address", auth, validate(updateAddressSchema), userController.updateMyAddress);

// QUAN TRỌNG: Chuyển favorites lên trên :id
router.get("/favorites", auth, userController.getFavoriteProducts); 

router.post(
  "/favorite",
  auth,
  validate(toggleFavoriteSchema), 
  userController.toggleFavorite
);

// 2. Các route có chứa tham số (Dynamic Routes) - PHẢI ĐỂ DƯỚI CÙNG
router.get("/", auth, admin, userController.getAll);
router.get("/:id", auth, userController.getById);

router.put(
  "/:id",
  auth,
  validate(updateUserSchema),
  userController.update
);

router.delete("/:id", auth, userController.remove);

// 3. Export router sau khi đã định nghĩa xong tất cả
module.exports = router;
