const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createPaymentSchema } = require("../validators/payment.validator");
const paymentController = require("../controllers/payment.controller");

router.post(
  "/stripe",
  auth,
  validate(createPaymentSchema),
  paymentController.createPayment
);

module.exports = router;
