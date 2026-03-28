const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const cartController = require("../controllers/cart.controller");

const {
  addItemToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  clearCartSchema,
} = require("../validators/cart.validator");

router.get("/", auth, cartController.getCart);
router.post("/items", auth, validate(addItemToCartSchema), cartController.addItem);
router.put("/items", auth, validate(updateCartItemSchema), cartController.updateItem);
router.delete("/items", auth, validate(removeCartItemSchema), cartController.removeItem);
router.delete("/clear", auth, validate(clearCartSchema), cartController.clearCart);

module.exports = router;
