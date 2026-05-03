const jwt = require("jsonwebtoken");
const Sentry = require("@sentry/node");
const config = require("../config/env");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      requestId: req.requestId,
      message: "Authorization token missing",
    });
  }

  try {
    const decoded = jwt.verify(token, config.accessToken.secret);

    if (decoded.tokenType && decoded.tokenType !== "access") {
      return res.status(401).json({
        success: false,
        requestId: req.requestId,
        message: "Invalid token type",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      sessionId: decoded.sid,
    };

    Sentry.setUser({
      id: decoded.id,
      role: decoded.role,
    });
    Sentry.setTag("user_id", decoded.id);
    Sentry.setTag("user_role", decoded.role || "unknown");

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      requestId: req.requestId,
      message: "Invalid or expired token",
    });
  }
};
