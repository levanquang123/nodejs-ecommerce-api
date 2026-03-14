const express = require("express");
const bodyParser = require("body-parser");
const asyncHandler = require("express-async-handler");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const PORT = process.env.PORT;
const URL = process.env.MONGO_URL;

if (!URL) {
  throw new Error("MONGO_URL is missing in .env");
}

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// setting static folder path
app.use("/image/products", express.static("public/products"));
app.use("/image/category", express.static("public/category"));
app.use("/image/poster", express.static("public/posters"));

mongoose
  .connect(URL)
  .then(() => console.log("Connected to Database"))
  .catch((error) => console.error(error));

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

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});