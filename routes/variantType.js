const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createVariantTypeSchema,
  updateVariantTypeSchema,
} = require("../validators/variantType.validator");

const variantTypeController = require("../controllers/variantType.controller");

router.get("/", variantTypeController.getAll);

router.get("/:id", variantTypeController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createVariantTypeSchema),
  variantTypeController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateVariantTypeSchema),
  variantTypeController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  variantTypeController.remove
);

module.exports = router;