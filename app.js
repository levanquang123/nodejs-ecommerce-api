require("./instrument");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const winston = require("winston");
const Sentry = require("@sentry/node");
const config = require("./config/env");
const requestContext = require("./middleware/requestContext");
const {
  apiLimiter,
  authLimiter,
  paymentLimiter,
} = require("./middleware/rateLimit");
const paymentController = require("./controllers/payment.controller");
const packageJson = require("./package.json");

const app = express();

if (config.isProduction) {
  app.set("trust proxy", 1);
}

const logger = winston.createLogger({
  level: config.isProduction ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    ...(config.isProduction || config.isTest
      ? []
      : [new winston.transports.File({ filename: "error.log", level: "error" })]),
  ],
});

mongoose
  .connect(config.mongoUrl)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => {
    console.error("Database connection error:", err.message);
    process.exit(1);
  });

app.use(helmet());
app.use(compression());
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(requestContext);
app.use((req, res, next) => {
  Sentry.setUser(null);
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: packageJson.name,
    version: packageJson.version,
    status: "ok",
    environment: config.env,
    env: config.env,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  const isDatabaseReady = mongoose.connection.readyState === 1;
  const databaseStatusByState = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(isDatabaseReady ? 200 : 503).json({
    success: isDatabaseReady,
    service: packageJson.name,
    version: packageJson.version,
    status: isDatabaseReady ? "ready" : "not_ready",
    environment: config.env,
    env: config.env,
    checks: {
      api: "ok",
      database:
        databaseStatusByState[mongoose.connection.readyState] || "unknown",
    },
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.isDevelopment || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS policy"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "x-request-id",
      "x-client-type",
      "sentry-trace",
      "baggage",
    ],
    exposedHeaders: ["x-request-id", "sentry-trace", "baggage"],
    credentials: true,
  })
);

app.use(apiLimiter);
app.use("/users/login", authLimiter);
app.use("/users/register", authLimiter);
app.use("/users/refresh-token", authLimiter);
app.use("/payment/stripe", paymentLimiter);
app.post(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleStripeWebhook
);
app.post(
  "/",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    if (!req.headers["stripe-signature"]) return next();
    return paymentController.handleStripeWebhook(req, res, next);
  }
);
app.use(express.json({ limit: config.isProduction ? "1mb" : "10mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: config.isProduction ? "1mb" : "10mb",
  })
);

const apiPrefix = "";
const routes = {
  categories: require("./routes/category"),
  users: require("./routes/user"),
  subCategories: require("./routes/subCategory"),
  brands: require("./routes/brand"),
  variantTypes: require("./routes/variantType"),
  variants: require("./routes/variant"),
  products: require("./routes/product"),
  posters: require("./routes/poster"),
  couponCodes: require("./routes/couponCode"),
  orders: require("./routes/order"),
  notification: require("./routes/notification"),
  payment: require("./routes/payment"),
  cart: require("./routes/cart"),
  reviews: require("./routes/review"),
};

Object.keys(routes).forEach((path) => {
  app.use(`${apiPrefix}/${path}`, routes[path]);
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "E-commerce API is live",
    service: packageJson.name,
    version: packageJson.version,
    environment: config.env,
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

if (!config.isProduction) {
  app.get("/debug-sentry", (req, res) => {
    throw new Error("Sentry test error");
  });
}

app.use((req, res) => {
  res.status(404).json({
    success: false,
    requestId: req.requestId,
    message: "Route not found",
  });
});

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const isOperational = statusCode < 500;

  if (statusCode >= 500 && !res.sentry) {
    Sentry.withScope((scope) => {
      scope.setTag("status_code", String(statusCode));
      scope.setTag("request_id", req.requestId || "unknown");
      scope.setExtra("method", req.method);
      scope.setExtra("url", req.originalUrl);
      scope.setExtra("requestId", req.requestId);
      if (req.user?.id) {
        scope.setUser({ id: req.user.id, role: req.user.role });
      }
      Sentry.captureException(err);
    });
  }

  if (!(config.isTest && isOperational)) {
    logger.error({
      method: req.method,
      url: req.originalUrl,
      requestId: req.requestId,
      userId: req.user?.id,
      statusCode,
      message: err.message,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    requestId: req.requestId,
    errorId: res.sentry,
    message:
      config.isProduction && !isOperational
        ? "Internal Server Error"
        : err.message || "Internal Server Error",
    stack: config.isDevelopment ? err.stack : undefined,
  });
});

module.exports = app;
