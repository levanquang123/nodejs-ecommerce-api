const request = require("supertest");
const app = require("../app"); 
const mongoose = require("mongoose");
const User = require("../model/user");

describe("User Management System (User API)", () => {
  
  // Clean up test data before running the test suite
  beforeAll(async () => {
    await User.deleteMany({
      email: { $in: ["testuser_quang@example.com", "quang_short@example.com"] },
    });
  });

  // Close DB connection and clean up after all tests are finished
  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ["testuser_quang@example.com", "quang_short@example.com"] },
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
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data.user.email).toBe("testuser_quang@example.com");
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
  });

  // --- SECTION 2: AUTHENTICATION (LOGIN) ---
  describe("POST /users/login", () => {
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
      }).select("+refreshTokenSessionExpiresAt");
      const previousSessionExpiry = new Date(Date.now() + 30 * 60 * 1000);
      user.refreshTokenSessionExpiresAt = previousSessionExpiry;
      await user.save();

      const refreshRes = await request(app)
        .post("/users/refresh-token")
        .send({ refreshToken });

      expect(refreshRes.statusCode).toEqual(200);
      expect(refreshRes.body.success).toBe(true);

      const refreshedUser = await User.findOne({
        email: "testuser_quang@example.com",
      }).select("+refreshTokenSessionExpiresAt");

      expect(refreshedUser.refreshTokenSessionExpiresAt.getTime()).toBeGreaterThan(
        previousSessionExpiry.getTime()
      );
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
