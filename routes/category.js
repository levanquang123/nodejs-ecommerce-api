const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const categoryController = require("../controllers/category.controller");

router.get("/", categoryController.getAll);

router.get("/:id", categoryController.getById);

router.post(
  "/",
  auth,
  admin,
  categoryController.create
);

router.put(
  "/:id",
  auth,
  admin,
  categoryController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  categoryController.remove
);

module.exports = router;
