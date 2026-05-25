const User = require("../model/user");
const EmailVerification = require("../model/emailVerification");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../config/env");
const emailService = require("./email.service");
const { redis, hasRedisConfig } = require("./redis.service");

const MIN_PASSWORD_LENGTH = 6;
const REFRESH_TOKEN_SESSION_LIMIT = 10;
const REFRESH_TOKEN_ROTATION_GRACE_MS = 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_SECONDS = Math.ceil(EMAIL_VERIFICATION_TTL_MS / 1000);
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_REDIS_PREFIX = "email-verification:";
const RESERVED_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "test.com",
  "invalid.com",
]);
const CLIENT_TYPES = new Set(["web_admin", "mobile_client"]);
const REFRESH_SESSION_SELECT = "+refreshTokenSessions";
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

function summarizeEmailDeliveryError(error) {
  return {
    message: error?.message,
    code: error?.code,
    responseCode: error?.responseCode,
    command: error?.command,
  };
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
  const { password, refreshTokenSessions, ...rest } = plain;
  return rest;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function shouldUseRedisForEmailVerification() {
  return hasRedisConfig && !config.isTest;
}

function assertEmailVerificationStoreAvailable() {
  if (config.isProduction && !hasRedisConfig) {
    throw createError("Email verification service is not configured.", 503);
  }
}

function getEmailVerificationRedisKey(email) {
  return `${EMAIL_VERIFICATION_REDIS_PREFIX}${email}`;
}

function normalizeVerificationRecord(record) {
  if (!record) return null;

  return {
    ...record,
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
    lastSentAt: record.lastSentAt ? new Date(record.lastSentAt) : null,
  };
}

async function findRegistrationVerification(email) {
  assertEmailVerificationStoreAvailable();

  if (shouldUseRedisForEmailVerification()) {
    const value = await redis.get(getEmailVerificationRedisKey(email));
    const record = typeof value === "string" ? JSON.parse(value) : value;
    return normalizeVerificationRecord(record);
  }

  return await EmailVerification.findOne({ email, type: "register" }).select(
    "+passwordHash +codeHash"
  );
}

async function saveRegistrationVerification(email, data) {
  assertEmailVerificationStoreAvailable();

  if (shouldUseRedisForEmailVerification()) {
    const record = {
      email,
      passwordHash: data.passwordHash,
      codeHash: data.codeHash,
      type: "register",
      expiresAt: data.expiresAt.toISOString(),
      lastSentAt: data.lastSentAt.toISOString(),
      failedAttempts: data.failedAttempts || 0,
    };

    await redis.set(getEmailVerificationRedisKey(email), JSON.stringify(record), {
      ex: EMAIL_VERIFICATION_TTL_SECONDS,
    });

    return normalizeVerificationRecord(record);
  }

  const verification =
    (await EmailVerification.findOne({ email }).select("+passwordHash +codeHash")) ||
    new EmailVerification({ email });

  verification.passwordHash = data.passwordHash;
  verification.codeHash = data.codeHash;
  verification.type = "register";
  verification.expiresAt = data.expiresAt;
  verification.lastSentAt = data.lastSentAt;
  verification.failedAttempts = data.failedAttempts || 0;
  await verification.save();

  return verification;
}

async function updateRegistrationVerification(email, changes) {
  assertEmailVerificationStoreAvailable();

  if (shouldUseRedisForEmailVerification()) {
    const verification = await findRegistrationVerification(email);
    if (!verification) return null;

    const nextVerification = {
      ...verification,
      ...changes,
    };

    const expiresAt = nextVerification.expiresAt?.getTime?.() || 0;
    const ttlSeconds = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));

    await redis.set(
      getEmailVerificationRedisKey(email),
      JSON.stringify({
        ...nextVerification,
        expiresAt: nextVerification.expiresAt.toISOString(),
        lastSentAt: nextVerification.lastSentAt.toISOString(),
      }),
      { ex: ttlSeconds }
    );

    return nextVerification;
  }

  const verification = await findRegistrationVerification(email);
  if (!verification) return null;

  Object.assign(verification, changes);
  await verification.save();
  return verification;
}

async function deleteRegistrationVerification(email, verification) {
  assertEmailVerificationStoreAvailable();

  if (shouldUseRedisForEmailVerification()) {
    await redis.del(getEmailVerificationRedisKey(email));
    return;
  }

  if (verification?._id) {
    await EmailVerification.deleteOne({ _id: verification._id });
  } else {
    await EmailVerification.deleteOne({ email, type: "register" });
  }
}

function assertDeliverableEmail(email) {
  if (config.isTest) return;

  const domain = String(email || "").split("@").pop()?.toLowerCase();
  if (!domain || RESERVED_EMAIL_DOMAINS.has(domain)) {
    throw createError("Please use a real email address to receive the verification code.", 400);
  }
}

async function createOrRefreshRegistrationVerification({
  email,
  passwordHash,
  enforceCooldown = true,
  skipIfCoolingDown = false,
  awaitDelivery = true,
}) {
  const existing = await findRegistrationVerification(email);

  if (
    existing &&
    enforceCooldown &&
    existing.lastSentAt &&
    Date.now() - existing.lastSentAt.getTime() <
      EMAIL_VERIFICATION_RESEND_COOLDOWN_MS
  ) {
    if (skipIfCoolingDown) return existing;
    throw createError("Please wait before requesting another code.", 429);
  }

  const code = generateVerificationCode();
  const now = new Date();
  const verification = await saveRegistrationVerification(email, {
    passwordHash,
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    lastSentAt: now,
    failedAttempts: 0,
  });

  const delivery = emailService.sendVerificationCode({
    to: email,
    code,
  });

  if (awaitDelivery) {
    try {
      await delivery;
    } catch (error) {
      await updateRegistrationVerification(email, { lastSentAt: new Date(0) });
      throw error;
    }
  } else {
    delivery.catch(async (error) => {
      await updateRegistrationVerification(email, {
        lastSentAt: new Date(0),
      }).catch(() => {});
      console.error(
        "Email verification delivery failed:",
        summarizeEmailDeliveryError(error)
      );
    });
  }

  return verification;
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

function findRefreshSession(user, sessionId) {
  if (!sessionId || !Array.isArray(user.refreshTokenSessions)) return null;
  return user.refreshTokenSessions.find(
    (session) => session.sessionId === sessionId
  );
}

async function removeRefreshSession(user, sessionId) {
  user.refreshTokenSessions = (user.refreshTokenSessions || []).filter(
    (session) => session.sessionId !== sessionId
  );
  await user.save();
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
    user.refreshTokenSessions = [];
  }

  limitRefreshTokenSessions(user);

  let session =
    !startNewSession && sessionId
      ? findRefreshSession(user, sessionId)
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

  limitRefreshTokenSessions(user);
  await user.save();

  return buildAuthPayload(user, { accessToken, refreshToken });
}

async function revokeRefreshToken(user) {
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

function assertClientRoleAllowed(user, clientType) {
  const normalizedClientType = normalizeClientType(clientType);

  if (normalizedClientType === "web_admin" && !isAdmin(user)) {
    throw createError("Only admin accounts can sign in to the admin dashboard.", 403);
  }

  if (normalizedClientType === "mobile_client" && isAdmin(user)) {
    throw createError("Admin accounts cannot sign in to the customer app.", 403);
  }

  if (normalizedClientType === "unknown" && isAdmin(user)) {
    throw createError("Admin accounts must sign in through the admin dashboard.", 403);
  }
}

exports.getById = async (id, currentUser) => {
  if (!isAdmin(currentUser) && currentUser?.id !== id) {
    throw createError("You can only access your own account.", 403);
  }

  return await User.findById(id).select("-password");
};

exports.register = async ({ email, password }, clientType) => {
  email = email.trim().toLowerCase();
  assertDeliverableEmail(email);

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    );
  }

  const exist = await User.findOne({ email });
  if (exist) {
    throw createError("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await createOrRefreshRegistrationVerification({
    email,
    passwordHash,
    skipIfCoolingDown: true,
    awaitDelivery: false,
  });

  return {
    email,
    verificationRequired: true,
  };
};

exports.verifyEmail = async ({ email, code }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  assertDeliverableEmail(normalizedEmail);
  const normalizedCode = String(code || "").replace(/\D/g, "");
  if (!normalizedEmail || normalizedCode.length !== 6) {
    throw createError("Invalid or expired verification code.", 400);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser?.emailVerified) {
    return sanitizeUser(existingUser);
  }

  const verification = await findRegistrationVerification(normalizedEmail);

  if (!verification) {
    throw createError("Invalid or expired verification code.", 400);
  }

  const expiresAt = verification.expiresAt?.getTime() || 0;
  if (!verification.codeHash || expiresAt < Date.now()) {
    throw createError("Invalid or expired verification code.", 400);
  }

  if (
    verification.failedAttempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS
  ) {
    throw createError("Too many incorrect attempts. Request a new code.", 429);
  }

  if (hashToken(normalizedCode) !== verification.codeHash) {
    await updateRegistrationVerification(normalizedEmail, {
      failedAttempts: verification.failedAttempts + 1,
    });
    throw createError("Invalid or expired verification code.", 400);
  }

  const user = existingUser || new User({
    email: normalizedEmail,
    password: verification.passwordHash,
  });
  user.emailVerified = true;
  await user.save();
  await deleteRegistrationVerification(normalizedEmail, verification);

  return sanitizeUser(user);
};

exports.resendEmailVerification = async ({ email }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  assertDeliverableEmail(normalizedEmail);
  if (!normalizedEmail) {
    return;
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (user?.emailVerified) {
    return;
  }

  const verification = await findRegistrationVerification(normalizedEmail);

  if (!verification) return;

  await createOrRefreshRegistrationVerification({
    email: normalizedEmail,
    passwordHash: verification.passwordHash,
    enforceCooldown: true,
    awaitDelivery: false,
  });
};

exports.login = async ({ email, password }, clientType) => {
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email }).select(REFRESH_SESSION_SELECT);
  if (!user) throw createError("Invalid email or password", 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw createError("Invalid email or password", 401);
  if (!user.emailVerified) {
    throw createError("Please verify your email before signing in.", 403);
  }
  assertClientRoleAllowed(user, clientType);

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

  const user = await User.findById(decoded.id).select(REFRESH_SESSION_SELECT);

  if (!user || !decoded.sid) {
    throw createError("Invalid or expired refresh token", 401);
  }

  const incomingHash = hashToken(refreshToken);
  const session = findRefreshSession(user, decoded.sid);

  if (!session) {
    throw createError("Invalid or expired refresh token", 401);
  }

  if (session.refreshTokenExpiresAt.getTime() < Date.now()) {
    await removeRefreshSession(user, session.sessionId);
    throw createError("Refresh token expired. Please login again.", 401);
  }

  if (session.refreshTokenSessionExpiresAt.getTime() <= Date.now()) {
    await removeRefreshSession(user, session.sessionId);
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
};

exports.logout = async (userId, sessionId) => {
  const user = await User.findById(userId).select(REFRESH_SESSION_SELECT);

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
