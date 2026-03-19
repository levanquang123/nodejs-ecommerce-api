const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createVariantSchema,
  updateVariantSchema,
} = require("../validators/variant.validator");

const variantController = require("../controllers/variant.controller");

router.get("/", variantController.getAll);

router.get("/:id", variantController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createVariantSchema),
  variantController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateVariantSchema),
  variantController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  variantController.remove
);

module.exports = router;