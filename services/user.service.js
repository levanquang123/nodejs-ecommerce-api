const User = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../config/env");

const MIN_PASSWORD_LENGTH = 6;
const ADDRESS_FIELDS = [
  "fullName",
  "phone",
  "street",
  "city",
  "state",
  "postalCode",
  "country",
];

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, tokenType: "access" },
    config.accessToken.secret,
    { expiresIn: config.accessToken.expiresIn }
  );
}

function generateRefreshToken(user, expiresIn = config.refreshToken.expiresIn) {
  return jwt.sign(
    { id: user._id, role: user.role, tokenType: "refresh" },
    config.refreshToken.secret,
    { expiresIn }
  );
}

function sanitizeUser(user) {
  const plain = user.toObject ? user.toObject() : user;
  const {
    password,
    refreshTokenHash,
    refreshTokenExpiresAt,
    refreshTokenSessionExpiresAt,
    ...rest
  } = plain;
  return rest;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildAuthPayload(user, { accessToken, refreshToken }) {
  return {
    user: sanitizeUser(user),
    token: accessToken,
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    accessTokenExpiresIn: config.accessToken.expiresIn,
  };
}

function getRefreshTokenExpiresInSeconds(sessionExpiresAt) {
  const remainingSessionMs = sessionExpiresAt.getTime() - Date.now();
  const refreshTokenMs = Math.min(config.refreshToken.expiresInMs, remainingSessionMs);

  return Math.max(1, Math.floor(refreshTokenMs / 1000));
}

async function issueTokensForUser(user, { startNewSession = false } = {}) {
  if (startNewSession || !user.refreshTokenSessionExpiresAt) {
    user.refreshTokenSessionExpiresAt = new Date(
      Date.now() + config.refreshToken.maxAgeMs
    );
  }

  if (user.refreshTokenSessionExpiresAt.getTime() <= Date.now()) {
    await revokeRefreshToken(user);
    throw createError("Session expired. Please login again.", 401);
  }

  const refreshTokenExpiresInSeconds = getRefreshTokenExpiresInSeconds(
    user.refreshTokenSessionExpiresAt
  );
  const refreshToken = generateRefreshToken(user, refreshTokenExpiresInSeconds);
  const decodedRefresh = jwt.verify(refreshToken, config.refreshToken.secret);
  const accessToken = generateAccessToken(user);

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(decodedRefresh.exp * 1000);
  await user.save();

  return buildAuthPayload(user, { accessToken, refreshToken });
}

async function revokeRefreshToken(user) {
  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;
  user.refreshTokenSessionExpiresAt = null;
  await user.save();
}

exports.getAll = async () => {
  return await User.find().select("-password");
};

exports.getMe = async (userId) => {
  return await User.findById(userId).select("-password");
};

exports.getCurrentUserProfile = async (userId) => {
  return await User.findById(userId).select("-password");
};

exports.getById = async (id) => {
  return await User.findById(id).select("-password");
};

exports.register = async ({ email, password }) => {
  email = email.trim().toLowerCase();

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  const exist = await User.findOne({ email });
  if (exist) throw new Error("Email already exists");

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    password: hashed,
  });

  return await issueTokensForUser(user, { startNewSession: true });
};

exports.login = async ({ email, password }) => {
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid email or password");

  return await issueTokensForUser(user, { startNewSession: true });
};

exports.update = async (id, currentUser, body) => {
  if (currentUser.id !== id) {
    throw new Error("You can only update your own account");
  }

  let { email, password } = body;
  const updateData = {};

  if (email !== undefined) {
    email = email.trim().toLowerCase();
    if (!email) throw new Error("Email cannot be empty");

    const exist = await User.findOne({ email });
    if (exist && exist._id.toString() !== id) {
      throw new Error("Email already exists");
    }

    updateData.email = email;
  }

  if (password !== undefined) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    }

    updateData.password = await bcrypt.hash(password, 10);
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No data provided for update");
  }

  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  }).select("-password");

  if (!user) throw new Error("User not found");

  return user;
};

exports.delete = async (id, currentUser) => {
  if (currentUser.id !== id) {
    throw new Error("You can only delete your own account");
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) throw new Error("User not found");
};

exports.toggleFavorite = async (userId, productId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const isFavorite = user.favorites.includes(productId);

  if (isFavorite) {
    user.favorites.pull(productId);
  } else {
    user.favorites.addToSet(productId);
  }

  await user.save();
  
  const updatedUser = await User.findById(userId)
    .populate("favorites")
    .select("-password");
    
  return updatedUser.favorites;
};

exports.getFavoriteProducts = async (userId) => {
  const user = await User.findById(userId)
    .populate("favorites")
    .select("favorites");

  if (!user) throw new Error("User not found");
  
  return user.favorites; 
};

exports.updateUserAddress = async (userId, payload) => {
  const user = await User.findById(userId).select("-password");
  if (!user) throw createError("User not found", 404);

  const nextAddress = {};
  ADDRESS_FIELDS.forEach((field) => {
    nextAddress[field] = payload[field] ?? "";
  });

  user.address = nextAddress;
  await user.save();

  return user;
};

exports.refreshToken = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw createError("Refresh token is required", 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.refreshToken.secret);
  } catch (error) {
    throw createError("Invalid or expired refresh token", 401);
  }

  if (decoded.tokenType !== "refresh") {
    throw createError("Invalid token type", 401);
  }

  const user = await User.findById(decoded.id).select(
    "+refreshTokenHash +refreshTokenExpiresAt +refreshTokenSessionExpiresAt"
  );

  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    throw createError("Invalid or expired refresh token", 401);
  }

  if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
    await revokeRefreshToken(user);
    throw createError("Refresh token expired. Please login again.", 401);
  }

  if (
    user.refreshTokenSessionExpiresAt &&
    user.refreshTokenSessionExpiresAt.getTime() <= Date.now()
  ) {
    await revokeRefreshToken(user);
    throw createError("Session expired. Please login again.", 401);
  }

  const incomingHash = hashToken(refreshToken);
  if (incomingHash !== user.refreshTokenHash) {
    await revokeRefreshToken(user);
    throw createError("Invalid or expired refresh token", 401);
  }

  return await issueTokensForUser(user);
};

exports.logout = async (userId) => {
  const user = await User.findById(userId).select(
    "+refreshTokenHash +refreshTokenExpiresAt +refreshTokenSessionExpiresAt"
  );

  if (!user) return;

  await revokeRefreshToken(user);
};
