const request = require("supertest");
const app = require("../app"); 
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../model/user");
const EmailVerification = require("../model/emailVerification");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

describe("User Management System (User API)", () => {
  
  // Clean up test data before running the test suite
  beforeAll(async () => {
    await EmailVerification.deleteMany({
      email: /@example\.com$/,
    });
    await User.deleteMany({
      email: {
        $in: [
          "testuser_quang@example.com",
          "quang_short@example.com",
          "verify_quang@example.com",
          "retry_register_quang@example.com",
          "admin_session_quang@example.com",
          "admin_client_guard_quang@example.com",
        ],
      },
    });
  });

  // Close DB connection and clean up after all tests are finished
  afterAll(async () => {
    await EmailVerification.deleteMany({
      email: /@example\.com$/,
    });
    await User.deleteMany({
      email: {
        $in: [
          "testuser_quang@example.com",
          "quang_short@example.com",
          "verify_quang@example.com",
          "retry_register_quang@example.com",
          "admin_session_quang@example.com",
          "admin_client_guard_quang@example.com",
        ],
      },
    });
    await mongoose.connection.close();
  });

  // --- SECTION 1: REGISTRATION ---
  describe("POST /users/register", () => {
    it("should register successfully with valid credentials", async () => {
      const res = await request(app)
        .post("/users/register")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationRequired).toBe(true);
      expect(res.body.data.email).toBe("testuser_quang@example.com");

      const user = await User.findOne({
        email: "testuser_quang@example.com",
      });
      expect(user).toBeNull();
    });

    it("should fail if password is too short (less than 6 characters)", async () => {
      const res = await request(app)
        .post("/users/register")
        .send({
          email: "quang_short@example.com",
          password: "123"
        });

      expect(res.statusCode).not.toBe(201);
      expect(res.body.success).toBe(false);
    });

    it("should reject reserved email domains outside the test environment guard", async () => {
      const config = require("../config/env");
      const originalIsTest = config.isTest;
      let res;
      try {
        config.isTest = false;
        res = await request(app)
          .post("/users/register")
          .send({
            email: "reserved@example.com",
            password: "password123",
          });
      } finally {
        config.isTest = originalIsTest;
      }

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("real email address");
    });

    it("should resume an unverified registration with the same password", async () => {
      const payload = {
        email: "retry_register_quang@example.com",
        password: "password123",
      };

      const firstRes = await request(app).post("/users/register").send(payload);
      expect(firstRes.statusCode).toEqual(201);
      expect(firstRes.body.data.verificationRequired).toBe(true);

      const retryRes = await request(app).post("/users/register").send(payload);
      expect(retryRes.statusCode).toEqual(201);
      expect(retryRes.body.success).toBe(true);
      expect(retryRes.body.data.verificationRequired).toBe(true);
      expect(retryRes.body.data.email).toBe(payload.email);
    });
  });

  describe("Email verification", () => {
    it("should verify an email with a valid 6-digit code", async () => {
      const registerRes = await request(app)
        .post("/users/register")
        .send({
          email: "verify_quang@example.com",
          password: "password123",
        });

      expect(registerRes.statusCode).toEqual(201);
      expect(registerRes.body.data.verificationRequired).toBe(true);

      await EmailVerification.findOneAndUpdate(
        { email: "verify_quang@example.com" },
        {
          codeHash: hashToken("123456"),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          failedAttempts: 0,
        }
      );

      const verifyRes = await request(app)
        .post("/users/verify-email")
        .send({
          email: "verify_quang@example.com",
          code: "123456",
        });

      expect(verifyRes.statusCode).toEqual(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.emailVerified).toBe(true);

      const verifiedUser = await User.findOne({
        email: "verify_quang@example.com",
      });

      expect(verifiedUser.emailVerified).toBe(true);
      const verification = await EmailVerification.findOne({
        email: "verify_quang@example.com",
      });
      expect(verification).toBeNull();
    });
  });

  // --- SECTION 2: AUTHENTICATION (LOGIN) ---
  describe("POST /users/login", () => {
    beforeAll(async () => {
      await User.findOneAndUpdate(
        { email: "testuser_quang@example.com" },
        {
          email: "testuser_quang@example.com",
          password: await bcrypt.hash("password123", 10),
          emailVerified: true,
        },
        { upsert: true, new: true }
      );
    });

    it("should login successfully and return a Token", async () => {
      const res = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("token");
    });

    it("should return an error for invalid password", async () => {
      const res = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "wrongpassword"
        });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
    });

    it("should extend the session window when refreshing a token", async () => {
      const loginRes = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(loginRes.statusCode).toEqual(200);
      const refreshToken = loginRes.body.data.refreshToken;
      expect(refreshToken).toBeTruthy();

      const user = await User.findOne({
        email: "testuser_quang@example.com",
      }).select("+refreshTokenSessions");
      const previousSessionExpiry = new Date(Date.now() + 30 * 60 * 1000);
      user.refreshTokenSessions[0].refreshTokenSessionExpiresAt =
        previousSessionExpiry;
      await user.save();

      const refreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken });

      expect(refreshRes.statusCode).toEqual(200);
      expect(refreshRes.body.success).toBe(true);

      const refreshedUser = await User.findOne({
        email: "testuser_quang@example.com",
      }).select("+refreshTokenSessions");

      const refreshedSession = refreshedUser.refreshTokenSessions[0];
      expect(
        refreshedSession.refreshTokenSessionExpiresAt.getTime()
      ).toBeGreaterThan(previousSessionExpiry.getTime());
    });

    it("should return 401 when refresh token is missing", async () => {
      const refreshRes = await request(app)
        .post("/users/refresh-token")
        .send({});

      expect(refreshRes.statusCode).toEqual(401);
      expect(refreshRes.body.success).toBe(false);
      expect(refreshRes.body.message).toContain("Refresh token is required");
    });

    it("should keep earlier refresh sessions valid after another login", async () => {
      const firstLoginRes = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(firstLoginRes.statusCode).toEqual(200);
      const firstRefreshToken = firstLoginRes.body.data.refreshToken;

      const secondLoginRes = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(secondLoginRes.statusCode).toEqual(200);

      const refreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken: firstRefreshToken });

      expect(refreshRes.statusCode).toEqual(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.refreshToken).toBeTruthy();
    });

    it("should keep only one active web_admin refresh session", async () => {
      await User.findOneAndUpdate(
        { email: "admin_session_quang@example.com" },
        {
          email: "admin_session_quang@example.com",
          password: await bcrypt.hash("password123", 10),
          role: "admin",
          emailVerified: true,
        },
        { upsert: true, new: true }
      );

      const firstLoginRes = await request(app)
        .post("/users/login")
        .set("x-client-type", "web_admin")
        .send({
          email: "admin_session_quang@example.com",
          password: "password123"
        });

      expect(firstLoginRes.statusCode).toEqual(200);
      const firstRefreshToken = firstLoginRes.body.data.refreshToken;
      const firstAccessToken = firstLoginRes.body.data.accessToken;

      const secondLoginRes = await request(app)
        .post("/users/login")
        .set("x-client-type", "web_admin")
        .send({
          email: "admin_session_quang@example.com",
          password: "password123"
        });

      expect(secondLoginRes.statusCode).toEqual(200);
      const secondRefreshToken = secondLoginRes.body.data.refreshToken;

      const firstRefreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken: firstRefreshToken });

      expect(firstRefreshRes.statusCode).toEqual(401);

      const secondRefreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken: secondRefreshToken });

      expect(secondRefreshRes.statusCode).toEqual(200);
      expect(secondRefreshRes.body.success).toBe(true);

      const revokedAccessRes = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${firstAccessToken}`);

      expect(revokedAccessRes.statusCode).toEqual(401);
    });

    it("should reject role/client login mismatches", async () => {
      const userAsAdminRes = await request(app)
        .post("/users/login")
        .set("x-client-type", "web_admin")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(userAsAdminRes.statusCode).toEqual(403);

      await User.findOneAndUpdate(
        { email: "admin_client_guard_quang@example.com" },
        {
          email: "admin_client_guard_quang@example.com",
          password: await bcrypt.hash("password123", 10),
          role: "admin",
          emailVerified: true,
        },
        { upsert: true, new: true }
      );

      const adminAsMobileRes = await request(app)
        .post("/users/login")
        .set("x-client-type", "mobile_client")
        .send({
          email: "admin_client_guard_quang@example.com",
          password: "password123"
        });

      expect(adminAsMobileRes.statusCode).toEqual(403);

      const adminWithoutClientTypeRes = await request(app)
        .post("/users/login")
        .send({
          email: "admin_client_guard_quang@example.com",
          password: "password123"
        });

      expect(adminWithoutClientTypeRes.statusCode).toEqual(403);
    });

    it("should allow mobile_client sessions to coexist", async () => {
      const firstLoginRes = await request(app)
        .post("/users/login")
        .set("x-client-type", "mobile_client")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(firstLoginRes.statusCode).toEqual(200);
      const firstRefreshToken = firstLoginRes.body.data.refreshToken;

      const secondLoginRes = await request(app)
        .post("/users/login")
        .set("x-client-type", "mobile_client")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(secondLoginRes.statusCode).toEqual(200);

      const firstRefreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken: firstRefreshToken });

      expect(firstRefreshRes.statusCode).toEqual(200);
      expect(firstRefreshRes.body.success).toBe(true);
    });

    it("should tolerate a stale refresh token briefly after token rotation", async () => {
      const loginRes = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(loginRes.statusCode).toEqual(200);
      const refreshToken = loginRes.body.data.refreshToken;

      const firstRefreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken });

      expect(firstRefreshRes.statusCode).toEqual(200);
      expect(firstRefreshRes.body.data.refreshToken).toBeTruthy();

      const staleRefreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken });

      expect(staleRefreshRes.statusCode).toEqual(200);
      expect(staleRefreshRes.body.success).toBe(true);
      expect(staleRefreshRes.body.data.refreshToken).toBeTruthy();
    });

    it("should logout only the current session", async () => {
      const adminLoginRes = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      const clientLoginRes = await request(app)
        .post("/users/login")
        .send({
          email: "testuser_quang@example.com",
          password: "password123"
        });

      expect(adminLoginRes.statusCode).toEqual(200);
      expect(clientLoginRes.statusCode).toEqual(200);

      const adminAccessToken = adminLoginRes.body.data.accessToken;
      const adminRefreshToken = adminLoginRes.body.data.refreshToken;
      const clientAccessToken = clientLoginRes.body.data.accessToken;
      const clientRefreshToken = clientLoginRes.body.data.refreshToken;

      const logoutRes = await request(app)
        .post("/users/logout")
        .set("Authorization", `Bearer ${adminAccessToken}`)
        .send({});

      expect(logoutRes.statusCode).toEqual(200);

      const adminRefreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken: adminRefreshToken });

      expect(adminRefreshRes.statusCode).toEqual(401);

      const adminAccessRes = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${adminAccessToken}`);

      expect(adminAccessRes.statusCode).toEqual(401);

      const clientRefreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken: clientRefreshToken });

      expect(clientRefreshRes.statusCode).toEqual(200);
      expect(clientRefreshRes.body.success).toBe(true);

      const clientAccessRes = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${clientAccessToken}`);

      expect(clientAccessRes.statusCode).toEqual(200);
    });
  });

  // --- SECTION 3: SECURITY & AUTHORIZATION ---
  describe("Security Headers", () => {
    it("should deny access to /me without an Authentication Token", async () => {
      const res = await request(app).get("/users/me");
      
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
