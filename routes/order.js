const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  createOrderSchema,
  updateOrderSchema,
} = require("../validators/order.validator");

const orderController = require("../controllers/order.controller");

router.get("/", auth, admin, orderController.getAll);

router.get("/orderByUserId/:userId", auth, orderController.getByUserId);

router.get("/:id", auth, orderController.getById);

router.post("/", auth, validate(createOrderSchema), orderController.create);

router.put(
  "/:id",
  auth,
  admin,
  validate(updateOrderSchema),
  orderController.update
);

router.delete("/:id", orderController.remove);

module.exports = router;