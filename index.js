const app = require("./app");
const config = require("./config/env");
const Sentry = require("@sentry/node");

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server running in ${config.env} mode on port ${config.port}`);
});

process.on("unhandledRejection", (reason) => {
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", async (error) => {
  Sentry.captureException(error);
  console.error("Uncaught Exception:", error);
  await Sentry.close(2000);
  process.exit(1);
});
