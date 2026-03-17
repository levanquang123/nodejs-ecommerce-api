const express = require("express");
const bodyParser = require("body-parser");
const asyncHandler = require("express-async-handler");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const URL = process.env.MONGO_URL;

if (!URL) {
  throw new Error("MONGO_URL is missing in .env");
}

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(URL)
  .then(() => console.log("Connected to Database"))
  .catch((error) => {
    console.error("Database connection error:", error);
    process.exit(1);
  });

// Routes
app.use("/categories", require("./routes/category"));
app.use("/users", require("./routes/user"));
app.use("/subCategories", require("./routes/subCategory"));
app.use("/brands", require("./routes/brand"));
app.use("/variantTypes", require("./routes/variantType"));
app.use("/variants", require("./routes/variant"));
app.use("/products", require("./routes/product"));
app.use("/posters", require("./routes/poster"));
app.use("/couponCodes", require("./routes/couponCode"));
app.use("/orders", require("./routes/order"));
app.use("/notification", require("./routes/notification"));
app.use("/payment", require("./routes/payment"));

app.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: "API working successfully",
      data: null,
    });
  })
);

// Global error handler
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    data: null,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});