module.exports = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "superadmin")
  ) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin resources only.",
    });
  }
};