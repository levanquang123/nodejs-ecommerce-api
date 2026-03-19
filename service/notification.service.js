const Notification = require("../model/notification");
const OneSignal = require("onesignal-node");

const client = new OneSignal.Client(
  process.env.ONE_SIGNAL_APP_ID,
  process.env.ONE_SIGNAL_REST_API_KEY
);

exports.sendNotification = async ({ title, description, imageUrl }) => {
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

  return newNotification;
};

exports.trackNotification = async (id) => {
  const response = await client.viewNotification(id);

  const androidStats = response.body.platform_delivery_stats;

  return {
    platform: "Android",
    success_delivery: androidStats.android.successful,
    failed_delivery: androidStats.android.failed,
    errored_delivery: androidStats.android.errored,
    opened_notification: androidStats.android.converted,
  };
};

exports.getAll = async () => {
  return await Notification.find().sort({ _id: -1 });
};

exports.delete = async (id) => {
  const deleted = await Notification.findByIdAndDelete(id);
  if (!deleted) throw new Error("Notification not found.");
};