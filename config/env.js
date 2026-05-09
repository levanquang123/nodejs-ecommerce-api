const dotenv = require("dotenv");
const Joi = require("joi");

dotenv.config({ quiet: true });

const defaultCorsOrigins = [
  "https://levanquang.com",
  "https://shop.levanquang.com",
  "https://www.levanquang.com",
  "http://localhost:3000",
];

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(3000),
  MONGO_URL: Joi.string().required(),
  ACCESS_TOKEN_SECRET: Joi.string().allow("", null),
  REFRESH_TOKEN_SECRET: Joi.string().allow("", null),
  ACCESS_TOKEN_EXPIRES_IN: Joi.string().default("2m"),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default("7d"),
  REFRESH_TOKEN_MAX_AGE: Joi.string().default("30d"),
  CORS_ORIGINS: Joi.string().allow("", null),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().integer().positive(),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().positive(),
  PAYMENT_RATE_LIMIT_MAX: Joi.number().integer().positive(),
  STRIPE_SKRT_KET_TST: Joi.string().allow("", null),
  STRIPE_PBLK_KET_TST: Joi.string().allow("", null),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow("", null),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow("", null),
  CLOUDINARY_API_KEY: Joi.string().allow("", null),
  CLOUDINARY_API_SECRET: Joi.string().allow("", null),
  ONE_SIGNAL_APP_ID: Joi.string().allow("", null),
  ONE_SIGNAL_REST_API_KEY: Joi.string().allow("", null),
  SMTP_HOST: Joi.string().allow("", null),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().truthy("true").falsy("false").default(false),
  SMTP_USER: Joi.string().allow("", null),
  SMTP_PASS: Joi.string().allow("", null),
  EMAIL_FROM: Joi.string().allow("", null),
  BREVO_API_KEY: Joi.string().allow("", null),
  SENTRY_DSN: Joi.string().uri().allow("", null),
  SENTRY_RELEASE: Joi.string().allow("", null),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).allow(null),
  SENTRY_PROFILES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0),
  SENTRY_SEND_DEFAULT_PII: Joi.boolean().truthy("true").falsy("false").default(false),
  DEBUG_IP_TOKEN: Joi.string().allow("", null),
}).unknown(true);

const { error, value: env } = schema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  throw new Error(
    `Environment validation failed: ${error.details
      .map((detail) => detail.message)
      .join(", ")}`
  );
}

const isProduction = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";
const accessTokenSecret = env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = env.REFRESH_TOKEN_SECRET || accessTokenSecret;
const accessTokenExpiresIn = env.ACCESS_TOKEN_EXPIRES_IN;
const refreshTokenExpiresIn = env.REFRESH_TOKEN_EXPIRES_IN;
const refreshTokenMaxAge = env.REFRESH_TOKEN_MAX_AGE;
const refreshTokenExpiresInMs = parseDurationMs(refreshTokenExpiresIn, "REFRESH_TOKEN_EXPIRES_IN");
const refreshTokenMaxAgeMs = parseDurationMs(refreshTokenMaxAge, "REFRESH_TOKEN_MAX_AGE");
const productionOnlyEnv = [
  "STRIPE_SKRT_KET_TST",
  "STRIPE_PBLK_KET_TST",
  "STRIPE_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "ONE_SIGNAL_APP_ID",
  "ONE_SIGNAL_REST_API_KEY",
  "EMAIL_FROM",
];

const missingProductionEnv = productionOnlyEnv.filter((key) => !env[key]);
const hasEmailProvider =
  Boolean(env.BREVO_API_KEY) ||
  Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

if (!accessTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET is required.");
}

if (isProduction && !env.REFRESH_TOKEN_SECRET) {
  throw new Error("REFRESH_TOKEN_SECRET is required in production.");
}

if (isProduction && missingProductionEnv.length) {
  throw new Error(
    `Missing production environment variables: ${missingProductionEnv.join(", ")}`
  );
}

if (isProduction && !hasEmailProvider) {
  throw new Error(
    "Missing email provider configuration: set BREVO_API_KEY or SMTP_HOST, SMTP_USER, and SMTP_PASS."
  );
}

if (isProduction && accessTokenSecret.length < 32) {
  throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters in production.");
}

if (isProduction && refreshTokenSecret.length < 32) {
  throw new Error("REFRESH_TOKEN_SECRET must be at least 32 characters in production.");
}

if (isProduction && refreshTokenSecret === accessTokenSecret) {
  throw new Error("REFRESH_TOKEN_SECRET must be different from ACCESS_TOKEN_SECRET in production.");
}

if (refreshTokenExpiresInMs > refreshTokenMaxAgeMs) {
  throw new Error("REFRESH_TOKEN_EXPIRES_IN cannot be greater than REFRESH_TOKEN_MAX_AGE.");
}

if (!isProduction && !isTest && accessTokenSecret.length < 32) {
  console.warn("ACCESS_TOKEN_SECRET is short. Use at least 32 characters in production.");
}

if (!isProduction && !isTest && (!env.REFRESH_TOKEN_SECRET || refreshTokenSecret === accessTokenSecret)) {
  console.warn("Use a separate REFRESH_TOKEN_SECRET in production.");
}

if (!isProduction && !isTest && missingProductionEnv.length) {
  console.warn(
    `Optional integration env vars missing for local development: ${missingProductionEnv.join(", ")}`
  );
}

function parseCorsOrigins(value) {
  if (!value) return defaultCorsOrigins;

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseDurationMs(value, fieldName) {
  const match = String(value).trim().match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) {
    throw new Error(`${fieldName} must use a duration like 15m, 7d, or 24h.`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

module.exports = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  isProduction,
  isTest,
  port: env.PORT,
  mongoUrl: env.MONGO_URL,
  debugIpToken: env.DEBUG_IP_TOKEN,
  accessToken: {
    secret: accessTokenSecret,
    expiresIn: accessTokenExpiresIn,
  },
  refreshToken: {
    secret: refreshTokenSecret,
    expiresIn: refreshTokenExpiresIn,
    expiresInMs: refreshTokenExpiresInMs,
    maxAge: refreshTokenMaxAge,
    maxAgeMs: refreshTokenMaxAgeMs,
  },
  corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    apiMax: env.RATE_LIMIT_MAX || (isProduction ? 300 : 1000),
    authMax: env.AUTH_RATE_LIMIT_MAX || (isProduction ? 10 : 100),
    paymentMax: env.PAYMENT_RATE_LIMIT_MAX || (isProduction ? 20 : 100),
  },
  sentry: {
    dsn: env.SENTRY_DSN,
    release: env.SENTRY_RELEASE || `store_api@${require("../package.json").version}`,
    tracesSampleRate:
      env.SENTRY_TRACES_SAMPLE_RATE ??
      (env.NODE_ENV === "production" ? 0.1 : 1.0),
    profilesSampleRate: env.SENTRY_PROFILES_SAMPLE_RATE,
    sendDefaultPii: env.SENTRY_SEND_DEFAULT_PII,
  },
  stripe: {
    secretKey: env.STRIPE_SKRT_KET_TST,
    publishableKey: env.STRIPE_PBLK_KET_TST,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
    brevoApiKey: env.BREVO_API_KEY,
  },
};
