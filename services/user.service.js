const User = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../config/env");

const MIN_PASSWORD_LENGTH = 6;
const REFRESH_TOKEN_SESSION_LIMIT = 10;
const REFRESH_TOKEN_ROTATION_GRACE_MS = 60 * 1000;
const CLIENT_TYPES = new Set(["web_admin", "mobile_client"]);
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

function generateAccessToken(user, sessionId, clientType) {
  const payload = { id: user._id, role: user.role, tokenType: "access" };
  if (sessionId) payload.sid = sessionId;
  if (clientType) payload.clientType = normalizeClientType(clientType);

  return jwt.sign(
    payload,
    config.accessToken.secret,
    { expiresIn: config.accessToken.expiresIn }
  );
}

function generateRefreshToken(
  user,
  sessionId,
  expiresIn = config.refreshToken.expiresIn
) {
  const payload = { id: user._id, role: user.role, tokenType: "refresh" };
  if (sessionId) payload.sid = sessionId;

  return jwt.sign(
    payload,
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
    refreshTokenSessions,
    ...rest
  } = plain;
  return rest;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeClientType(clientType) {
  const normalized = String(clientType || "").trim().toLowerCase();
  return CLIENT_TYPES.has(normalized) ? normalized : "unknown";
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

async function issueTokensForUser(
  user,
  {
    startNewSession = false,
    sessionId,
    preservePreviousRefreshTokenHash,
    clientType,
  } = {}
) {
  return await issueTokensForSession(user, {
    startNewSession,
    sessionId,
    preservePreviousRefreshTokenHash,
    clientType,
  });
}

function getUsableRefreshTokenSessions(user) {
  const now = Date.now();
  return (Array.isArray(user.refreshTokenSessions)
    ? user.refreshTokenSessions
    : []
  ).filter((session) => {
    return (
      session &&
      session.refreshTokenHash &&
      session.refreshTokenExpiresAt &&
      session.refreshTokenSessionExpiresAt &&
      session.refreshTokenExpiresAt.getTime() > now &&
      session.refreshTokenSessionExpiresAt.getTime() > now
    );
  });
}

function limitRefreshTokenSessions(user) {
  user.refreshTokenSessions = getUsableRefreshTokenSessions(user)
    .sort((a, b) => {
      const aTime = a.updatedAt ? a.updatedAt.getTime() : 0;
      const bTime = b.updatedAt ? b.updatedAt.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, REFRESH_TOKEN_SESSION_LIMIT);
}

async function issueTokensForSession(
  user,
  {
    startNewSession = false,
    sessionId,
    preservePreviousRefreshTokenHash,
    clientType,
  } = {}
) {
  if (!Array.isArray(user.refreshTokenSessions)) {
    user.refreshTokenSessions = [];
  }

  const normalizedClientType = normalizeClientType(clientType);

  if (startNewSession && normalizedClientType === "web_admin") {
    user.refreshTokenSessions = user.refreshTokenSessions.filter(
      (session) =>
        session.clientType &&
        session.clientType !== "unknown" &&
        session.clientType !== "web_admin"
    );
  }

  limitRefreshTokenSessions(user);

  let session =
    !startNewSession && sessionId
      ? user.refreshTokenSessions.find((item) => item.sessionId === sessionId)
      : null;

  if (!session) {
    user.refreshTokenSessions.push({
      sessionId: sessionId || crypto.randomUUID(),
      clientType: normalizedClientType,
      createdAt: new Date(),
    });
    session = user.refreshTokenSessions[user.refreshTokenSessions.length - 1];
  }

  if (!session.clientType || session.clientType === "unknown") {
    session.clientType = normalizedClientType;
  }

  session.refreshTokenSessionExpiresAt = new Date(
    Date.now() + config.refreshToken.maxAgeMs
  );

  const refreshTokenExpiresInSeconds = getRefreshTokenExpiresInSeconds(
    session.refreshTokenSessionExpiresAt
  );
  const refreshToken = generateRefreshToken(
    user,
    session.sessionId,
    refreshTokenExpiresInSeconds
  );
  const decodedRefresh = jwt.verify(refreshToken, config.refreshToken.secret);
  const accessToken = generateAccessToken(
    user,
    session.sessionId,
    session.clientType || normalizedClientType
  );

  const previousHash = preservePreviousRefreshTokenHash || session.refreshTokenHash;
  if (previousHash) {
    session.previousRefreshTokenHash = previousHash;
    session.previousRefreshTokenValidUntil = new Date(
      Date.now() + REFRESH_TOKEN_ROTATION_GRACE_MS
    );
  }

  session.refreshTokenHash = hashToken(refreshToken);
  session.refreshTokenExpiresAt = new Date(decodedRefresh.exp * 1000);
  session.updatedAt = new Date();

  user.refreshTokenHash = session.refreshTokenHash;
  user.refreshTokenExpiresAt = session.refreshTokenExpiresAt;
  user.refreshTokenSessionExpiresAt = session.refreshTokenSessionExpiresAt;

  limitRefreshTokenSessions(user);
  await user.save();

  return buildAuthPayload(user, { accessToken, refreshToken });
}

async function revokeRefreshToken(user) {
  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;
  user.refreshTokenSessionExpiresAt = null;
  user.refreshTokenSessions = [];
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

function isAdmin(user) {
  return user && (user.role === "admin" || user.role === "superadmin");
}

exports.getById = async (id, currentUser) => {
  if (!isAdmin(currentUser) && currentUser?.id !== id) {
    throw createError("You can only access your own account.", 403);
  }

  return await User.findById(id).select("-password");
};

exports.register = async ({ email, password }, clientType) => {
  email = email.trim().toLowerCase();

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  const exist = await User.findOne({ email });
  if (exist) throw createError("Email already exists", 409);

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    password: hashed,
  });

  return await issueTokensForUser(user, {
    startNewSession: true,
    clientType,
  });
};

exports.login = async ({ email, password }, clientType) => {
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email }).select(
    "+refreshTokenHash +refreshTokenExpiresAt +refreshTokenSessionExpiresAt +refreshTokenSessions"
  );
  if (!user) throw createError("Invalid email or password", 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw createError("Invalid email or password", 401);

  return await issueTokensForUser(user, {
    startNewSession: true,
    clientType,
  });
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

exports.refreshToken = async ({ refreshToken } = {}) => {
  if (!refreshToken) {
    throw createError("Refresh token is required", 401);
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
    "+refreshTokenHash +refreshTokenExpiresAt +refreshTokenSessionExpiresAt +refreshTokenSessions"
  );

  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    const hasSessionTokens =
      user &&
      Array.isArray(user.refreshTokenSessions) &&
      user.refreshTokenSessions.length > 0;
    if (!hasSessionTokens) {
      throw createError("Invalid or expired refresh token", 401);
    }
  }

  const incomingHash = hashToken(refreshToken);
  const session = decoded.sid && Array.isArray(user.refreshTokenSessions)
    ? user.refreshTokenSessions.find((item) => item.sessionId === decoded.sid)
    : null;

  if (session) {
    if (session.refreshTokenExpiresAt.getTime() < Date.now()) {
      user.refreshTokenSessions = user.refreshTokenSessions.filter(
        (item) => item.sessionId !== session.sessionId
      );
      await user.save();
      throw createError("Refresh token expired. Please login again.", 401);
    }

    if (session.refreshTokenSessionExpiresAt.getTime() <= Date.now()) {
      user.refreshTokenSessions = user.refreshTokenSessions.filter(
        (item) => item.sessionId !== session.sessionId
      );
      await user.save();
      throw createError("Session expired. Please login again.", 401);
    }

    if (incomingHash !== session.refreshTokenHash) {
      const previousTokenStillAllowed =
        session.previousRefreshTokenHash &&
        incomingHash === session.previousRefreshTokenHash &&
        session.previousRefreshTokenValidUntil &&
        session.previousRefreshTokenValidUntil.getTime() > Date.now();

      if (previousTokenStillAllowed) {
        return await issueTokensForUser(user, {
          sessionId: session.sessionId,
          preservePreviousRefreshTokenHash: incomingHash,
        });
      }

      throw createError("Invalid or expired refresh token", 401);
    }

    return await issueTokensForUser(user, { sessionId: session.sessionId });
  }

  if (
    !user.refreshTokenHash ||
    !user.refreshTokenExpiresAt ||
    incomingHash !== user.refreshTokenHash
  ) {
    throw createError("Invalid or expired refresh token", 401);
  }

  if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    user.refreshTokenSessionExpiresAt = null;
    await user.save();
    throw createError("Refresh token expired. Please login again.", 401);
  }

  if (
    user.refreshTokenSessionExpiresAt &&
    user.refreshTokenSessionExpiresAt.getTime() <= Date.now()
  ) {
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    user.refreshTokenSessionExpiresAt = null;
    await user.save();
    throw createError("Session expired. Please login again.", 401);
  }

  return await issueTokensForUser(user, { startNewSession: true });
};

exports.logout = async (userId, sessionId) => {
  const user = await User.findById(userId).select(
    "+refreshTokenHash +refreshTokenExpiresAt +refreshTokenSessionExpiresAt +refreshTokenSessions"
  );

  if (!user) return;

  if (!sessionId) {
    await revokeRefreshToken(user);
    return;
  }

  user.refreshTokenSessions = (user.refreshTokenSessions || []).filter(
    (session) => session.sessionId !== sessionId
  );

  await user.save();
};
