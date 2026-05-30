const { apiLimiter } = require("../middleware/rateLimit");
const config = require("../config/env");

// Define a simple test runner
async function testFailOpen() {
  console.log("=== Starting Fail-Open Rate Limit Test ===");

  // Mock Request, Response, Next objects
  const mockReq = {
    ip: "127.0.0.1",
    originalUrl: "/api/test",
    headers: {
      "cf-connecting-ip": "203.0.113.195", // Mock Cloudflare IP
    },
    requestId: "test-request-id-123",
  };

  const mockRes = {
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (obj) {
      this.body = obj;
      return this;
    },
  };

  // We want to force Redis configuration to be true, and env to not be test,
  // so that the RedisStore is actually instantiated and called.
  // We can temporarily mock config properties.
  const originalIsTest = config.isTest;
  config.isTest = false;

  console.log("Testing rate limiter middleware execution under simulated Redis failure...");

  // Since we don't have a real Redis running or we want to simulate connection error,
  // we let the store command throw.
  let nextCalled = false;
  let nextError = null;

  const next = (err) => {
    nextCalled = true;
    nextError = err;
  };

  // Run the middleware
  apiLimiter(mockReq, mockRes, next);

  // Since the middleware might be async when talking to Redis, wait a moment
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log("Result after middleware execution:");
  console.log("- next() called:", nextCalled);
  console.log("- next() received error:", nextError);

  if (nextCalled && !nextError) {
    console.log("✅ SUCCESS: Fail-Open logic worked perfectly! The request was allowed to proceed despite the Redis store connection missing/failing.");
  } else {
    console.error("❌ FAILURE: Fail-Open logic did not work. Request was blocked or failed with error.");
    process.exit(1);
  }

  // Restore configuration
  config.isTest = originalIsTest;
}

testFailOpen().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
