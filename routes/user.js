const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const admin = require("../middleware/admin");

const {
  registerSchema,
  loginSchema,
  updateUserSchema,
} = require("../validators/user.validator");

const userController = require("../controllers/user.controller");

router.get("/", auth, admin, userController.getAll);

router.get("/me", auth, userController.getMe);

router.get("/:id", auth, userController.getById);

router.post("/register", validate(registerSchema), userController.register);

router.post("/login", validate(loginSchema), userController.login);

router.put(
  "/:id",
  auth,
  validate(updateUserSchema),
  userController.update
);

router.delete("/:id", auth, userController.remove);

module.exports = router;