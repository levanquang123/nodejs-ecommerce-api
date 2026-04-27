const { randomUUID } = require("node:crypto");
const Sentry = require("@sentry/node");

const REQUEST_ID_HEADER = "x-request-id";

function resolveRequestId(headerValue) {
  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }

  if (Array.isArray(headerValue) && headerValue[0] && headerValue[0].trim()) {
    return headerValue[0].trim();
  }

  return randomUUID();
}

module.exports = (req, res, next) => {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const clientType = req.headers["x-client-type"] || "unknown";

  Sentry.setTag("service", "api");
  Sentry.setTag("request_id", requestId);
  Sentry.setTag("client_type", String(clientType));
  Sentry.setTag("endpoint", req.path);
  Sentry.setTag("http_method", req.method);

  Sentry.setContext("request", {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers["user-agent"],
    clientType: String(clientType),
  });

  next();
};
