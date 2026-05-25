const { Redis } = require("@upstash/redis");
const config = require("../config/env");

const hasRedisConfig =
  Boolean(config.redis.upstashRestUrl) &&
  Boolean(config.redis.upstashRestToken);

const redis = hasRedisConfig
  ? new Redis({
      url: config.redis.upstashRestUrl,
      token: config.redis.upstashRestToken,
    })
  : null;

async function checkRedisReady() {
  if (!redis) {
    return {
      ready: false,
      status: "not_configured",
    };
  }

  try {
    const result = await redis.ping();
    return {
      ready: result === "PONG",
      status: result === "PONG" ? "connected" : "unexpected_response",
    };
  } catch (error) {
    return {
      ready: false,
      status: "error",
      message: error.message,
    };
  }
}

module.exports = {
  redis,
  hasRedisConfig,
  checkRedisReady,
};
