const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createProductSchema,
  updateProductSchema,
} = require("../validators/product.validator");

const productController = require("../controllers/product.controller");

router.get("/", productController.getAll);

router.get("/:id", productController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createProductSchema),
  productController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateProductSchema),
  productController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  productController.remove
);

module.exports = router;