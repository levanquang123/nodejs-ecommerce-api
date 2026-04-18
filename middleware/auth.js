const jwt = require("jsonwebtoken");
const Sentry = require("@sentry/node");
const config = require("../config/env");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authorization token missing" });
  }

  try {
    const decoded = jwt.verify(token, config.accessToken.secret);

    if (decoded.tokenType && decoded.tokenType !== "access") {
      return res.status(401).json({ success: false, message: "Invalid token type" });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    Sentry.setUser({
      id: decoded.id,
      role: decoded.role,
    });

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
