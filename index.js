const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const winston = require("winston");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const NODE_ENV = process.env.NODE_ENV || "development";

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

if (!MONGO_URL) {
  console.error("❌ MONGO_URL is missing in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("✅ Database Connected Successfully"))
  .catch((err) => {
    console.error("❌ Database Connection Error:", err.message);
    process.exit(1);
  });

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const allowedOrigins = [
  "https://levanquang.com",
  "https://shop.levanquang.com",
  "https://www.levanquang.com",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
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
};

Object.keys(routes).forEach((path) => {
  app.use(`${apiPrefix}/${path}`, routes[path]);
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "E-commerce API is live 🚀",
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  logger.error(`${req.method} ${req.url} - ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: NODE_ENV === "development" ? err.stack : null,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
});
