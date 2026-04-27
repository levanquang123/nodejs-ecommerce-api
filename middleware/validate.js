module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body ?? {}, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      requestId: req.requestId,
      message: error.details.map((detail) => detail.message).join(", "),
    });
  }

  req.body = value;
  next();
};
