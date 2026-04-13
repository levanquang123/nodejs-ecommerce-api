const rateLimit = require("express-rate-limit");
const config = require("../config/env");

function createLimiter({ max, message }) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => config.isTest,
    message: {
      success: false,
      message,
    },
  });
}

exports.apiLimiter = createLimiter({
  max: config.rateLimit.apiMax,
  message: "Too many requests. Please try again later.",
});

exports.authLimiter = createLimiter({
  max: config.rateLimit.authMax,
  message: "Too many authentication attempts. Please try again later.",
});

exports.paymentLimiter = createLimiter({
  max: config.rateLimit.paymentMax,
  message: "Too many payment requests. Please try again later.",
});
