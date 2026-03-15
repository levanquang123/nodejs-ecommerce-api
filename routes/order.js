const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();
const Order = require("../model/order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const orderPopulate = [
  { path: "couponCode", select: "id couponCode discountType discountAmount" },
  { path: "userID", select: "id name" },
];

// get all orders
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await Order.find()
      .populate(orderPopulate[0])
      .populate(orderPopulate[1])
      .sort({ _id: -1 });
    res.json({
      success: true,
      message: "Orders retrieved successfully.",
      data: orders,
    });
  })
);

router.get(
  "/orderByUserId/:userId",
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const orders = await Order.find({ userID: userId })
      .populate(orderPopulate[0])
      .populate(orderPopulate[1])
      .sort({ _id: -1 });
    res.json({
      success: true,
      message: "Orders retrieved successfully.",
      data: orders,
    });
  })
);

// get an order by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const orderID = req.params.id;
    const order = await Order.findById(orderID)
      .populate(orderPopulate[0])
      .populate(orderPopulate[1]);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    res.json({
      success: true,
      message: "Order retrieved successfully.",
      data: order,
    });
  })
);

// create a new order
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const {
      userID,
      orderStatus,
      items,
      totalPrice,
      shippingAddress,
      paymentMethod,
      couponCode,
      orderTotal,
      trackingUrl,
    } = req.body;

    if (
      !userID ||
      !items ||
      !totalPrice ||
      !shippingAddress ||
      !paymentMethod ||
      !orderTotal
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User ID, items, totalPrice, shippingAddress, paymentMethod, and orderTotal are required.",
      });
    }

    const Product = require("../model/product");

    for (const item of items) {
      const product = await Product.findById(item.productID);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found.`,
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is out of stock.`,
        });
      }
    }

    const order = new Order({
      userID,
      orderStatus,
      items,
      totalPrice,
      shippingAddress,
      paymentMethod,
      couponCode,
      orderTotal,
      trackingUrl,
    });

    await order.save();

    for (const item of items) {
      await Product.findByIdAndUpdate(item.productID, {
        $inc: { quantity: -item.quantity },
      });
    }

    res.json({
      success: true,
      message: "Order created successfully and stock updated.",
      data: null,
    });
  })
);

// update an order
router.put(
  "/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const orderID = req.params.id;
    const { orderStatus, trackingUrl } = req.body;
    if (!orderStatus) {
      return res.status(400).json({ success: false, message: "Order Status required." });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderID,
      { orderStatus, trackingUrl },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    res.json({
      success: true,
      message: "Order updated successfully.",
      data: null,
    });
  })
);

// delete an order
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const orderID = req.params.id;
    const deletedOrder = await Order.findByIdAndDelete(orderID);
    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    res.json({ success: true, message: "Order deleted successfully." });
  })
);

module.exports = router;
