const Sentry = require("@sentry/node");
const config = require("./config/env");

if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    release: config.sentry.release,
    tracesSampleRate: config.sentry.tracesSampleRate,
    sendDefaultPii: config.sentry.sendDefaultPii,
    enabled: !config.isTest,
  });
}

module.exports = Sentry;
