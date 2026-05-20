const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const admin = require("../middleware/admin");

const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendEmailVerificationSchema,
  updateUserSchema,
  toggleFavoriteSchema,
  updateAddressSchema,
} = require("../validators/user.validator");

const userController = require("../controllers/user.controller");

// Static routes must stay above dynamic "/:id" routes.
router.post("/register", validate(registerSchema), userController.register);
router.post("/login", validate(loginSchema), userController.login);
router.post("/verify-email", validate(verifyEmailSchema), userController.verifyEmail);
router.post(
  "/resend-verification-code",
  validate(resendEmailVerificationSchema),
  userController.resendEmailVerification
);
router.post("/refresh-token", userController.refreshToken);

// Authenticated account routes.
router.get("/me", auth, userController.getMe);
router.put("/me/address", auth, validate(updateAddressSchema), userController.updateMyAddress);
router.post("/logout", auth, userController.logout);

// Favorites routes must stay above "/:id".
router.get("/favorites", auth, userController.getFavoriteProducts);

router.post(
  "/favorite",
  auth,
  validate(toggleFavoriteSchema),
  userController.toggleFavorite
);

// Dynamic routes belong last so they do not swallow static paths.
router.get("/", auth, admin, userController.getAll);
router.get("/:id", auth, userController.getById);

router.put(
  "/:id",
  auth,
  validate(updateUserSchema),
  userController.update
);

router.delete("/:id", auth, userController.remove);

module.exports = router;
