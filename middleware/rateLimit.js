const rateLimit = require("express-rate-limit");
const config = require("../config/env");
const { RedisStore } = require("rate-limit-redis");
const { redis, hasRedisConfig } = require("../services/redis.service");

async function sendUpstashCommand(...command) {
  const [name, ...args] = command;
  const normalizedName = String(name).toLowerCase();

  switch (normalizedName) {
    case "script":
      if (String(args[0]).toLowerCase() === "load") {
        return redis.scriptLoad(args[1]);
      }
      break;
    case "evalsha":
      return redis.evalsha(args[0], [args[2]], args.slice(3));
    case "decr":
      return redis.decr(args[0]);
    case "del":
      return redis.del(args[0]);
    default:
      throw new Error(`Unsupported Redis command: ${name}`);
  }
}

function createLimiter({ max, message, prefix }) {
  const store =
    hasRedisConfig && !config.isTest
      ? new RedisStore({
          sendCommand: sendUpstashCommand,
          prefix: prefix || "rate-limit:",
        })
      : undefined;

  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max,
    store,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        requestId: req.requestId,
        message,
      });
    },
  });
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
