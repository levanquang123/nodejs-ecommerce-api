const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createSubCategorySchema,
  updateSubCategorySchema,
} = require("../validators/subCategory.validator");

const subCategoryController = require("../controllers/subCategory.controller");

router.get("/", subCategoryController.getAll);

router.get("/:id", subCategoryController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createSubCategorySchema),
  subCategoryController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateSubCategorySchema),
  subCategoryController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  subCategoryController.remove
);

module.exports = router;