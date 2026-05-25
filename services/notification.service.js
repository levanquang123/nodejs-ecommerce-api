const Notification = require("../model/notification");
const OneSignal = require("@onesignal/node-onesignal");
const config = require("../config/env");

const configuration = OneSignal.createConfiguration({
  restApiKey: config.oneSignal.restApiKey,
});

const client = new OneSignal.DefaultApi(configuration);

function assertOneSignalConfigured() {
  if (!config.oneSignal.appId || !config.oneSignal.restApiKey) {
    throw new Error("Missing OneSignal env vars");
  }
}

exports.sendNotification = async ({ title, description, imageUrl }) => {
  assertOneSignalConfigured();

  const notification = new OneSignal.Notification();
  notification.app_id = config.oneSignal.appId;
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

exports.sendToExternalUser = async ({
  externalId,
  title,
  description,
  imageUrl,
  data,
  idempotencyKey,
}) => {
  assertOneSignalConfigured();

  const normalizedExternalId = String(externalId || "").trim();
  if (!normalizedExternalId) return null;

  const notification = new OneSignal.Notification();
  notification.app_id = config.oneSignal.appId;
  notification.contents = { en: description };
  notification.headings = { en: title };
  notification.include_aliases = {
    external_id: [normalizedExternalId],
  };
  notification.target_channel = "push";

  if (data) {
    notification.data = data;
  }

  if (idempotencyKey) {
    notification.idempotency_key = idempotencyKey;
  }

  if (imageUrl) {
    notification.big_picture = imageUrl;
    notification.adm_big_picture = imageUrl;
    notification.chrome_web_image = imageUrl;
    notification.ios_attachments = { id1: imageUrl };
  }

  return await client.createNotification(notification);
};

exports.trackNotification = async (id) => {
  assertOneSignalConfigured();

  const response = await client.getNotification(config.oneSignal.appId, id);

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
