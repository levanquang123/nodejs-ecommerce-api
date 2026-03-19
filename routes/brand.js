const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createBrandSchema,
  updateBrandSchema,
} = require("../validators/brand.validator");

const brandController = require("../controllers/brand.controller");

router.get("/", brandController.getAll);

router.get("/:id", auth, admin, brandController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createBrandSchema),
  brandController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateBrandSchema),
  brandController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  brandController.remove
);

module.exports = router;