const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");

describe("Basic API Connectivity Checks", () => {
  
  // Test Home route
  it("GET / - should return API operational status", async () => {
    const res = await request(app).get("/");
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("E-commerce API is live");
  });

  // Test 404 handler
  it("GET /404 - should return 404 for non-existent routes", async () => {
    const res = await request(app).get("/api/non-existent-route");
    expect(res.statusCode).toEqual(404);
  });
});

// Close DB connection after testing to prevent terminal hang
afterAll(async () => {
  await mongoose.connection.close();
});