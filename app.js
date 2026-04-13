const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const winston = require("winston");
const config = require("./config/env");
const {
  apiLimiter,
  authLimiter,
  paymentLimiter,
} = require("./middleware/rateLimit");

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

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  const isDatabaseReady = mongoose.connection.readyState === 1;

  res.status(isDatabaseReady ? 200 : 503).json({
    success: isDatabaseReady,
    status: isDatabaseReady ? "ready" : "not_ready",
    checks: {
      database: isDatabaseReady ? "connected" : "disconnected",
    },
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
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);

app.use(apiLimiter);
app.use("/users/login", authLimiter);
app.use("/users/register", authLimiter);
app.use("/payment/stripe", paymentLimiter);
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
    env: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const isOperational = statusCode < 500;

  logger.error({
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message:
      config.isProduction && !isOperational
        ? "Internal Server Error"
        : err.message || "Internal Server Error",
    stack: config.isDevelopment ? err.stack : undefined,
  });
});

module.exports = app;
