const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Notification = require("../model/notification");
const OneSignal = require("onesignal-node");
const dotenv = require("dotenv");
dotenv.config();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const client = new OneSignal.Client(
  process.env.ONE_SIGNAL_APP_ID,
  process.env.ONE_SIGNAL_REST_API_KEY
);

router.post(
  "/send-notification",auth,admin,
  asyncHandler(async (req, res) => {
    const { title, description, imageUrl } = req.body;

    const notificationBody = {
      contents: { en: description },
      headings: { en: title },
      included_segments: ["All"],
      ...(imageUrl && {
        big_picture: imageUrl,
        adm_big_picture: imageUrl,
        chrome_web_image: imageUrl,
        ios_attachments: { id1: imageUrl },
      }),
    };

    const response = await client.createNotification(notificationBody);
    const notificationId = response.body?.id || response.id;

    if (!notificationId) {
      throw new Error("OneSignal failed to return a notification ID");
    }

    const newNotification = await Notification.create({
      notificationId,
      title,
      description,
      imageUrl,
    });

    res.json({
      success: true,
      message: "Notification sent successfully",
      data: newNotification,
    });
  })
);

router.get(
  "/track-notification/:id",
  asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    const response = await client.viewNotification(notificationId);
    const androidStats = response.body.platform_delivery_stats;

    const result = {
      platform: "Android",
      success_delivery: androidStats.android.successful,
      failed_delivery: androidStats.android.failed,
      errored_delivery: androidStats.android.errored,
      opened_notification: androidStats.android.converted,
    };
    res.json({ success: true, message: "success", data: result });
  })
);

router.get(
  "/all-notification",
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({}).sort({ _id: -1 });
    res.json({
      success: true,
      message: "Notifications retrieved successfully.",
      data: notifications,
    });
  })
);

router.delete(
  "/delete-notification/:id",auth,admin,
  asyncHandler(async (req, res) => {
    const notificationID = req.params.id;
    const notification = await Notification.findByIdAndDelete(notificationID);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }
    res.json({
      success: true,
      message: "Notification deleted successfully.",
      data: null,
    });
  })
);

module.exports = router;
