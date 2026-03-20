const express = require("express");
const asyncHandler = require("express-async-handler");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression"); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;

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

// 3. Cấu hình CORS linh hoạt
const allowedOrigins = [
  'https://levanquang.com', 
  'https://shop.levanquang.com', 
  'https://www.levanquang.com',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true
}));


app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const apiPrefix = "";
app.use(`${apiPrefix}/categories`, require("./routes/category"));
app.use(`${apiPrefix}/users`, require("./routes/user"));
app.use(`${apiPrefix}/subCategories`, require("./routes/subCategory"));
app.use(`${apiPrefix}/brands`, require("./routes/brand"));
app.use(`${apiPrefix}/variantTypes`, require("./routes/variantType"));
app.use(`${apiPrefix}/variants`, require("./routes/variant"));
app.use(`${apiPrefix}/products`, require("./routes/product"));
app.use(`${apiPrefix}/posters`, require("./routes/poster"));
app.use(`${apiPrefix}/couponCodes`, require("./routes/couponCode"));
app.use(`${apiPrefix}/orders`, require("./routes/order"));
app.use(`${apiPrefix}/notification`, require("./routes/notification"));
app.use(`${apiPrefix}/payment`, require("./routes/payment"));

// 6. Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "E-commerce API is live",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});


app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  console.error(`[ERROR] ${req.method} ${req.url}: ${err.message}`);
  
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});