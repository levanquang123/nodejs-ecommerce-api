const { redis } = require("../services/redis.service");

(async () => {
  if (!redis) {
    console.log("Redis is not configured");
    return;
  }

  await redis.set("health:test", "ok", { ex: 60 });
  const value = await redis.get("health:test");

  console.log("Redis value:", value);
})();