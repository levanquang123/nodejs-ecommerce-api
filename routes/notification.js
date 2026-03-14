const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Notification = require("../model/notification");
const OneSignal = require("onesignal-node");
const dotenv = require("dotenv");
dotenv.config();

const client = new OneSignal.Client(
  process.env.ONE_SIGNAL_APP_ID,
  process.env.ONE_SIGNAL_REST_API_KEY
);

router.post(
  "/send-notification",
  asyncHandler(async (req, res) => {    const { title, description, imageUrl } = req.body;

  const notificationBody = {
    contents: { en: description },
    headings: { en: title },
    included_segments: ["All"],
    ...(imageUrl && { 
      big_picture: imageUrl,      
      adm_big_picture: imageUrl,  
      chrome_web_image: imageUrl, 
      ios_attachments: {          
        "id1": imageUrl 
      }
    }),
  };

    try {
      const response = await client.createNotification(notificationBody);
      
      const notificationId = response.body?.id || response.id;

      if (!notificationId) {
        throw new Error("OneSignal failed to return a notification ID");
      }

      const newNotification = await Notification.create({
        notificationId: notificationId, 
        title,
        description,
        imageUrl,
      });

      res.json({
        success: true,
        message: "Notification sent successfully",
        data: newNotification,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send notification",
      });
    }
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
    console.log("Notification details:", androidStats);
    res.json({ success: true, message: "success", data: result });
  })
);

router.get(
  "/all-notification",
  asyncHandler(async (req, res) => {
    try {
      const notifications = await Notification.find({}).sort({ _id: -1 });
      res.json({
        success: true,
        message: "Notifications retrieved successfully.",
        data: notifications,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

router.delete(
  "/delete-notification/:id",
  asyncHandler(async (req, res) => {
    const notificationID = req.params.id;
    try {
      const notification = await Notification.findByIdAndDelete(notificationID);
      if (!notification) {
        return res
          .status(404)
          .json({ success: false, message: "Notification not found." });
      }
      res.json({
        success: true,
        message: "Notification deleted successfully.",
        data: null,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  })
);

module.exports = router;
