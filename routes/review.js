const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const reviewController = require("../controllers/review.controller");

const {
  createReviewSchema,
  updateReviewSchema,
} = require("../validators/review.validator");

router.get("/product/:productId", reviewController.getByProduct);

router.post(
  "/product/:productId",
  auth,
  validate(createReviewSchema),
  reviewController.create
);

router.put(
  "/:id",
  auth,
  validate(updateReviewSchema),
  reviewController.update
);

router.delete("/:id", auth, reviewController.remove);

module.exports = router;
