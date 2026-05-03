const jwt = require("jsonwebtoken");
const Sentry = require("@sentry/node");
const config = require("../config/env");
const User = require("../model/user");

module.exports = async (req, res, next) => {
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

    if (decoded.clientType === "web_admin") {
      if (!decoded.sid) {
        return res.status(401).json({
          success: false,
          requestId: req.requestId,
          message: "Admin session is no longer active",
        });
      }

      const user = await User.findById(decoded.id).select("+refreshTokenSessions");
      const hasActiveAdminSession =
        user &&
        Array.isArray(user.refreshTokenSessions) &&
        user.refreshTokenSessions.some((session) => {
          return (
            session.sessionId === decoded.sid &&
            session.clientType === "web_admin" &&
            session.refreshTokenHash &&
            session.refreshTokenExpiresAt &&
            session.refreshTokenSessionExpiresAt &&
            session.refreshTokenExpiresAt.getTime() > Date.now() &&
            session.refreshTokenSessionExpiresAt.getTime() > Date.now()
          );
        });

      if (!hasActiveAdminSession) {
        return res.status(401).json({
          success: false,
          requestId: req.requestId,
          message: "Admin session is no longer active",
        });
      }
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      sessionId: decoded.sid,
      clientType: decoded.clientType,
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
