const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validate = require("../middleware/validate");

const {
  sendNotificationSchema,
} = require("../validators/notification.validator");

const notificationController = require("../controllers/notification.controller");

router.post(
  "/send-notification",
  auth,
  admin,
  validate(sendNotificationSchema),
  notificationController.send
);

router.get(
  "/track-notification/:id",
  auth,
  admin,
  notificationController.track
);

router.get(
  "/all-notification",
  auth,
  admin,
  notificationController.getAll
);

router.delete(
  "/delete-notification/:id",
  auth,
  admin,
  notificationController.remove
);

module.exports = router;
