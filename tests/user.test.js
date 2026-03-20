const request = require("supertest");
const app = require("../app"); 
const mongoose = require("mongoose");
const User = require("../model/user");

describe("User Management System (User API)", () => {
  
  // Clean up test data before running the test suite
  beforeAll(async () => {
    await User.deleteMany({ name: "testuser_quang" });
    await User.deleteMany({ name: "quang_short" });
  });

  // Close DB connection and clean up after all tests are finished
  afterAll(async () => {
    await User.deleteMany({ name: "testuser_quang" });
    await mongoose.connection.close();
  });

  // --- SECTION 1: REGISTRATION ---
  describe("POST /users/register", () => {
    it("should register successfully with valid credentials", async () => {
      const res = await request(app)
        .post("/users/register")
        .send({
          name: "testuser_quang",
          password: "password123"
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data.user.name).toBe("testuser_quang");
    });

    it("should fail if password is too short (less than 6 characters)", async () => {
      const res = await request(app)
        .post("/users/register")
        .send({
          name: "quang_short",
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
          name: "testuser_quang",
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
          name: "testuser_quang",
          password: "wrongpassword"
        });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);
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