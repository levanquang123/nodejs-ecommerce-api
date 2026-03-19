const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createCategorySchema,
  updateCategorySchema,
} = require("../validators/category.validator");

const categoryController = require("../controllers/category.controller");

router.get("/", categoryController.getAll);

router.get("/:id", categoryController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createCategorySchema),
  categoryController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateCategorySchema),
  categoryController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  categoryController.remove
);

module.exports = router;