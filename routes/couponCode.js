const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createCouponSchema,
  updateCouponSchema,
  checkCouponSchema,
} = require("../validators/coupon.validator");

const couponController = require("../controllers/coupon.controller");

router.get("/", couponController.getAll);

router.get("/:id", couponController.getById);

router.post(
  "/",
  auth,
  admin,
  validate(createCouponSchema),
  couponController.create
);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateCouponSchema),
  couponController.update
);

router.delete(
  "/:id",
  auth,
  admin,
  couponController.remove
);

router.post(
  "/check-coupon",
  validate(checkCouponSchema),
  couponController.checkCoupon
);

module.exports = router;