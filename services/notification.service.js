const Notification = require("../model/notification");
const OneSignal = require("@onesignal/node-onesignal");

const configuration = OneSignal.createConfiguration({
  authMethods: {
    app_key: {
      tokenProvider: {
        getToken: () => process.env.ONE_SIGNAL_REST_API_KEY,
      },
    },
  },
});

const client = new OneSignal.DefaultApi(configuration);
const APP_ID = process.env.ONE_SIGNAL_APP_ID;

exports.sendNotification = async ({ title, description, imageUrl }) => {

  const notification = new OneSignal.Notification();
  notification.app_id = APP_ID;
  notification.contents = { en: description };
  notification.headings = { en: title };
  notification.included_segments = ["All"];

  if (imageUrl) {
    notification.big_picture = imageUrl;
    notification.adm_big_picture = imageUrl;
    notification.chrome_web_image = imageUrl;
    notification.ios_attachments = { id1: imageUrl };
  }

  const response = await client.createNotification(notification);
  const notificationId = response.id;

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
  const response = await client.getNotification(APP_ID, id);

  const stats = response.platform_delivery_stats;

  return {
    platform: "Android",
    success_delivery: stats?.android?.successful || 0,
    failed_delivery: stats?.android?.failed || 0,
    errored_delivery: stats?.android?.errored || 0,
    opened_notification: stats?.android?.converted || 0,
  };
};

exports.getAll = async () => {
  return await Notification.find().sort({ _id: -1 });
};

exports.delete = async (id) => {
  const deleted = await Notification.findByIdAndDelete(id);
  if (!deleted) throw new Error("Notification not found.");
};