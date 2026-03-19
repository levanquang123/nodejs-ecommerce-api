const express = require("express");
const router = express.Router();

const validate = require("../middleware/validate");
const { createPaymentSchema } = require("../validators/payment.validator");
const paymentController = require("../controllers/payment.controller");

router.post(
  "/stripe",
  validate(createPaymentSchema),
  paymentController.createPayment
);

module.exports = router;