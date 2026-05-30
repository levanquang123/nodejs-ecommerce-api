const rateLimit = require("express-rate-limit");
const config = require("../config/env");
const { RedisStore } = require("rate-limit-redis");
const { redis, hasRedisConfig } = require("../services/redis.service");
const Sentry = require("@sentry/node");

async function sendUpstashCommand(...command) {
  try {
    const [name, ...args] = command;
    const normalizedName = String(name).toLowerCase();

    switch (normalizedName) {
      case "script":
        if (String(args[0]).toLowerCase() === "load") {
          return await redis.scriptLoad(args[1]);
        }
        break;
      case "evalsha":
        return await redis.evalsha(args[0], [args[2]], args.slice(3));
      case "decr":
        return await redis.decr(args[0]);
      case "del":
        return await redis.del(args[0]);
      default:
        throw new Error(`Unsupported Redis command: ${name}`);
    }
  } catch (error) {
    console.error("Redis Command Execution Failure:", error.message);
    throw error;
  }
}

function getClientIp(req) {
  if (req.headers["cf-connecting-ip"]) {
    return req.headers["cf-connecting-ip"];
  }
  if (req.headers["true-client-ip"]) {
    return req.headers["true-client-ip"];
  }
  if (req.headers["x-real-ip"]) {
    return req.headers["x-real-ip"];
  }
  if (req.headers["x-forwarded-for"]) {
    const ips = req.headers["x-forwarded-for"].split(",").map((ip) => ip.trim());
    return ips[0];
  }
  return req.ip;
}

function createLimiter({ max, message, prefix }) {
  const store =
    hasRedisConfig && !config.isTest
      ? new RedisStore({
          sendCommand: sendUpstashCommand,
          prefix: prefix || "rate-limit:",
        })
      : undefined;

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max,
    store,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => config.isTest,
    keyGenerator: (req) => getClientIp(req),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        requestId: req.requestId,
        message,
      });
    },
  });

  return (req, res, next) => {
    if (!store) {
      return limiter(req, res, next);
    }

    try {
      return limiter(req, res, (err) => {
        if (err) {
          console.warn(`[RateLimit Fail-Open] Redis issue encountered: ${err.message}. Proceeding without rate limit.`);
          
          if (!config.isTest) {
            Sentry.withScope((scope) => {
              scope.setTag("component", "rate-limiter");
              scope.setExtra("ip", getClientIp(req));
              scope.setExtra("route", req.originalUrl);
              Sentry.captureException(err);
            });
          }
          return next();
        }
        next();
      });
    } catch (err) {
      console.error("[RateLimit Critical Wrapper Error]", err);
      if (!config.isTest) {
        Sentry.captureException(err);
      }
      return next();
    }
  };
}

exports.apiLimiter = createLimiter({
  max: config.rateLimit.apiMax,
  message: "Too many requests. Please try again later.",
  prefix: "rate-limit:api:",
});

exports.authLimiter = createLimiter({
  max: config.rateLimit.authMax,
  message: "Too many authentication attempts. Please try again later.",
  prefix: "rate-limit:auth:",
});

exports.paymentLimiter = createLimiter({
  max: config.rateLimit.paymentMax,
  message: "Too many payment requests. Please try again later.",
  prefix: "rate-limit:payment:",
});

