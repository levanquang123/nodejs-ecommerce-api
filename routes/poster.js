const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createPosterSchema,
  updatePosterSchema,
} = require("../validators/poster.validator");

const posterController = require("../controllers/poster.controller");

router.get("/", posterController.getAll);

router.get("/:id", posterController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createPosterSchema),
  posterController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updatePosterSchema),
  posterController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  posterController.remove
);

module.exports = router;