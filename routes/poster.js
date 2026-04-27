const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const posterController = require("../controllers/poster.controller");

router.get("/", posterController.getAll);

router.get("/:id", posterController.getById);

router.post(
  "/",
  auth,
  admin,
  posterController.create
);

router.put(
  "/:id",
  auth,
  admin,
  posterController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  posterController.remove
);

module.exports = router;
