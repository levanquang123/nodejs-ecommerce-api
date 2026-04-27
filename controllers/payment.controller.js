const asyncHandler = require("express-async-handler");
const paymentService = require("../services/payment.service");

exports.createPayment = asyncHandler(async (req, res) => {
  const data = await paymentService.createPaymentIntent(req.user.id, req.body);

  res.json({
    success: true,
    message: "Payment intent created successfully",
    data,
  });
});

exports.handleStripeWebhook = asyncHandler(async (req, res) => {
  await paymentService.handleStripeWebhook(req);

  res.json({
    received: true,
  });
});
