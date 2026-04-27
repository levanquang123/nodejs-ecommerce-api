const Sentry = require("@sentry/node");
const config = require("./config/env");

const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "cookie",
  "set-cookie",
  "secret",
  "api_key",
  "apikey",
  "cardnumber",
  "cvv",
  "otp",
]);

function sanitizeValue(input) {
  if (Array.isArray(input)) {
    return input.map(sanitizeValue);
  }

  if (!input || typeof input !== "object") {
    return input;
  }

  const output = {};
  for (const [key, value] of Object.entries(input)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (SENSITIVE_KEYS.has(normalized)) {
      output[key] = REDACTED;
      continue;
    }

    output[key] = sanitizeValue(value);
  }

  return output;
}

if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    release: config.sentry.release,
    tracesSampleRate: config.sentry.tracesSampleRate,
    profilesSampleRate: config.sentry.profilesSampleRate,
    sendDefaultPii: config.sentry.sendDefaultPii,
    tracesSampler: (samplingContext) => {
      const txn = String(samplingContext.name || "").toLowerCase();
      if (txn.includes("/health") || txn.includes("/ready")) {
        return 0;
      }
      return config.sentry.tracesSampleRate;
    },
    beforeSend(event) {
      if (event.request) {
        event.request.headers = sanitizeValue(event.request.headers);
        event.request.data = sanitizeValue(event.request.data);
        event.request.cookies = sanitizeValue(event.request.cookies);
      }

      event.extra = sanitizeValue(event.extra);
      return event;
    },
    enabled: !config.isTest,
  });
}

module.exports = Sentry;
