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
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default("15m"),
  CORS_ORIGINS: Joi.string().allow("", null),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().integer().positive(),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().positive(),
  PAYMENT_RATE_LIMIT_MAX: Joi.number().integer().positive(),
  STRIPE_SKRT_KET_TST: Joi.string().allow("", null),
  STRIPE_PBLK_KET_TST: Joi.string().allow("", null),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow("", null),
  CLOUDINARY_API_KEY: Joi.string().allow("", null),
  CLOUDINARY_API_SECRET: Joi.string().allow("", null),
  ONE_SIGNAL_APP_ID: Joi.string().allow("", null),
  ONE_SIGNAL_REST_API_KEY: Joi.string().allow("", null),
  SENTRY_DSN: Joi.string().uri().allow("", null),
  SENTRY_RELEASE: Joi.string().allow("", null),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0),
  SENTRY_SEND_DEFAULT_PII: Joi.boolean().truthy("true").falsy("false").default(false),
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
const productionOnlyEnv = [
  "STRIPE_SKRT_KET_TST",
  "STRIPE_PBLK_KET_TST",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "ONE_SIGNAL_APP_ID",
  "ONE_SIGNAL_REST_API_KEY",
];

const missingProductionEnv = productionOnlyEnv.filter((key) => !env[key]);

if (!accessTokenSecret) {
  throw new Error("ACCESS_TOKEN_SECRET is required.");
}

if (isProduction && missingProductionEnv.length) {
  throw new Error(
    `Missing production environment variables: ${missingProductionEnv.join(", ")}`
  );
}

if (isProduction && accessTokenSecret.length < 32) {
  throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters in production.");
}

if (!isProduction && !isTest && accessTokenSecret.length < 32) {
  console.warn("ACCESS_TOKEN_SECRET is short. Use at least 32 characters in production.");
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

module.exports = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  isProduction,
  isTest,
  port: env.PORT,
  mongoUrl: env.MONGO_URL,
  accessToken: {
    secret: accessTokenSecret,
    expiresIn: accessTokenExpiresIn,
  },
  refreshToken: {
    secret: refreshTokenSecret,
    expiresIn: refreshTokenExpiresIn,
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
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    sendDefaultPii: env.SENTRY_SEND_DEFAULT_PII,
  },
};
