const request = require("supertest");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const stripeClient = require("stripe");

const app = require("../app");
const config = require("../config/env");
const User = require("../model/user");
const Category = require("../model/category");
const SubCategory = require("../model/subCategory");
const Product = require("../model/product");
const Coupon = require("../model/couponCode");
const Order = require("../model/order");
const PaymentSession = require("../model/paymentSession");
const orderService = require("../services/order.service");

const stripe = stripeClient("sk_test_unused");

function unique(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function registerAndLogin(email, password = "password123") {
  await request(app).post("/users/register").send({ email, password });
  const res = await request(app).post("/users/login").send({ email, password });
  return {
    user: res.body.data.user,
    token: res.body.data.accessToken,
  };
}

async function createAdmin(email, password = "password123") {
  const hashed = await bcrypt.hash(password, 10);
  await User.create({
    email,
    password: hashed,
    role: "admin",
  });

  const res = await request(app).post("/users/login").send({ email, password });
  return {
    user: res.body.data.user,
    token: res.body.data.accessToken,
  };
}

async function createProductFixture({ price = 100, offerPrice, quantity = 10 } = {}) {
  const suffix = unique("fixture");
  const category = await Category.create({
    name: `category_${suffix}`,
    image: "https://example.com/category.png",
  });
  const subCategory = await SubCategory.create({
    name: `subcategory_${suffix}`,
    categoryId: category._id,
  });
  const product = await Product.create({
    name: `product_${suffix}`,
    description: "Test product",
    quantity,
    price,
    offerPrice,
    proCategoryId: category._id,
    proSubCategoryId: subCategory._id,
    images: [{ image: 1, url: "https://example.com/product.png" }],
    variants: [],
  });

  return { category, subCategory, product };
}

async function cleanupTestData() {
  const testUsers = await User.find({
    email: /@critical-test\.example\.com$/,
  }).select("_id");
  const testUserIds = testUsers.map((user) => user._id);

  await Promise.all([
    Order.deleteMany({ userID: { $in: testUserIds } }),
    PaymentSession.deleteMany({ userID: { $in: testUserIds } }),
    Product.deleteMany({ name: /^product_fixture_/ }),
    Coupon.deleteMany({ couponCode: /^coupon_fixture_/ }),
    SubCategory.deleteMany({ name: /^subcategory_fixture_/ }),
    Category.deleteMany({ name: /^category_fixture_/ }),
    User.deleteMany({ email: /@critical-test\.example\.com$/ }),
  ]);
}

describe("Production-critical API behavior", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await mongoose.connection.close();
  });

  it("prevents a normal user from reading another user's profile", async () => {
    const userA = await registerAndLogin(
      `user-a-${unique("id")}@critical-test.example.com`
    );
    const userB = await registerAndLogin(
      `user-b-${unique("id")}@critical-test.example.com`
    );

    const res = await request(app)
      .get(`/users/${userB.user._id}`)
      .set("Authorization", `Bearer ${userA.token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("keeps coupon list endpoints admin-only", async () => {
    const normalUser = await registerAndLogin(
      `coupon-user-${unique("id")}@critical-test.example.com`
    );
    const admin = await createAdmin(
      `coupon-admin-${unique("id")}@critical-test.example.com`
    );

    await Coupon.create({
      couponCode: `coupon_${unique("fixture")}`,
      discountType: "percentage",
      discountAmount: 10,
      minimumPurchaseAmount: 0,
      endDate: new Date("2099-12-31T00:00:00.000Z"),
      status: "active",
    });

    const userRes = await request(app)
      .get("/couponCodes")
      .set("Authorization", `Bearer ${normalUser.token}`);

    expect(userRes.statusCode).toBe(403);

    const adminRes = await request(app)
      .get("/couponCodes")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(Array.isArray(adminRes.body.data)).toBe(true);
  });

  it("creates COD orders with token user and server-side prices only", async () => {
    const buyer = await registerAndLogin(
      `buyer-${unique("id")}@critical-test.example.com`
    );
    const otherUser = await registerAndLogin(
      `other-${unique("id")}@critical-test.example.com`
    );
    const { product } = await createProductFixture({
      price: 100,
      offerPrice: 80,
      quantity: 5,
    });

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        userID: otherUser.user._id,
        items: [
          {
            productID: product._id.toString(),
            quantity: 2,
            price: 1,
          },
        ],
        totalPrice: 1,
        orderTotal: {
          subtotal: 1,
          discount: 0,
          total: 1,
        },
        shippingAddress: {
          phone: "1234567890",
          street: "Main Street",
          city: "New York",
          state: "NY",
          postalCode: "10001",
          country: "US",
        },
        paymentMethod: "cod",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userID._id).toBe(buyer.user._id);
    expect(res.body.data.totalPrice).toBe(160);
    expect(res.body.data.orderTotal).toMatchObject({
      subtotal: 160,
      discount: 0,
      total: 160,
    });
    expect(res.body.data.items[0].price).toBe(80);

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct.quantity).toBe(3);
  });

  it("checks coupons using server-side item prices", async () => {
    const { product } = await createProductFixture({
      price: 100,
      offerPrice: 80,
      quantity: 5,
    });

    await Coupon.create({
      couponCode: `coupon_${unique("fixture")}`,
      discountType: "percentage",
      discountAmount: 10,
      minimumPurchaseAmount: 100,
      endDate: new Date("2099-12-31T00:00:00.000Z"),
      status: "active",
    });

    const coupon = await Coupon.findOne({ couponCode: /^coupon_fixture_/ });

    const res = await request(app)
      .post("/couponCodes/check-coupon")
      .send({
        couponCode: coupon.couponCode.toUpperCase(),
        purchaseAmount: 1,
        productIds: [product._id.toString()],
        items: [
          {
            productID: product._id.toString(),
            quantity: 2,
          },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.orderTotal).toMatchObject({
      subtotal: 160,
      discount: 16,
      total: 144,
    });
  });

  it("rejects prepaid order creation through /orders", async () => {
    const buyer = await registerAndLogin(
      `prepaid-reject-${unique("id")}@critical-test.example.com`
    );
    const { product } = await createProductFixture();

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({
        items: [{ productID: product._id.toString(), quantity: 1 }],
        shippingAddress: {
          phone: "1234567890",
          street: "Main Street",
          city: "New York",
          state: "NY",
          postalCode: "10001",
          country: "US",
        },
        paymentMethod: "prepaid",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("/payment/stripe");
  });

  it("keeps unpaid prepaid sessions out of customer order history", async () => {
    const buyer = await registerAndLogin(
      `history-buyer-${unique("id")}@critical-test.example.com`
    );
    const admin = await createAdmin(
      `history-admin-${unique("id")}@critical-test.example.com`
    );
    const { product } = await createProductFixture({ price: 120, quantity: 6 });

    const baseOrder = {
      userID: buyer.user._id,
      paymentMethod: "prepaid",
      items: [
        {
          productID: product._id,
          productName: product.name,
          quantity: 1,
          price: 120,
          variant: "",
          variantId: null,
          sku: "",
          attributes: [],
          image: "",
        },
      ],
      totalPrice: 120,
      shippingAddress: {
        phone: "1234567890",
        street: "Main Street",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "US",
      },
      orderTotal: {
        subtotal: 120,
        discount: 0,
        total: 120,
      },
    };

    const unpaidPrepaid = await orderService.createPendingPayment(buyer.user._id, {
      items: [{ productID: product._id.toString(), quantity: 1 }],
      shippingAddress: baseOrder.shippingAddress,
    });

    expect(unpaidPrepaid).toBeTruthy();
    expect(unpaidPrepaid.orderTotal.total).toBe(120);
    expect(await Order.findById(unpaidPrepaid._id)).toBeNull();

    const paidPrepaid = await Order.create({
      ...baseOrder,
      orderStatus: "pending",
      paymentStatus: "paid",
      paymentIntentId: `pi_${unique("paid")}`,
    });

    const codOrder = await Order.create({
      ...baseOrder,
      paymentMethod: "cod",
      orderStatus: "pending",
      paymentStatus: "unpaid",
      paymentIntentId: undefined,
    });

    const customerHistory = await request(app)
      .get(`/orders/orderByUserId/${buyer.user._id}`)
      .set("Authorization", `Bearer ${buyer.token}`);

    expect(customerHistory.statusCode).toBe(200);
    const customerOrderIds = customerHistory.body.data.map((order) => order._id);
    expect(customerOrderIds).not.toContain(unpaidPrepaid._id.toString());
    expect(customerOrderIds).toEqual(
      expect.arrayContaining([
        paidPrepaid._id.toString(),
        codOrder._id.toString(),
      ])
    );

    const hiddenDetail = await request(app)
      .get(`/orders/${unpaidPrepaid._id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(hiddenDetail.statusCode).toBe(404);

    const adminHistory = await request(app)
      .get(`/orders/orderByUserId/${buyer.user._id}`)
      .set("Authorization", `Bearer ${admin.token}`);
    const adminOrderIds = adminHistory.body.data.map((order) => order._id);
    expect(adminOrderIds).not.toContain(unpaidPrepaid._id.toString());
  });

  it("creates prepaid orders only after Stripe payment succeeds", async () => {
    const buyer = await registerAndLogin(
      `stripe-session-buyer-${unique("id")}@critical-test.example.com`
    );
    const { product } = await createProductFixture({ price: 150, quantity: 3 });
    const paymentIntentId = `pi_${unique("session")}`;

    const paymentSession = await orderService.createPendingPayment(
      buyer.user._id,
      {
        items: [{ productID: product._id.toString(), quantity: 2 }],
        shippingAddress: {
          phone: "1234567890",
          street: "Main Street",
          city: "New York",
          state: "NY",
          postalCode: "10001",
          country: "US",
        },
      }
    );

    await orderService.attachPaymentIntent(paymentSession._id, paymentIntentId);

    expect(await Order.findOne({ paymentIntentId })).toBeNull();

    await orderService.markPaymentSucceeded(paymentIntentId);

    const createdOrder = await Order.findOne({ paymentIntentId });
    expect(createdOrder).toBeTruthy();
    expect(createdOrder.paymentStatus).toBe("paid");
    expect(createdOrder.orderStatus).toBe("pending");
    expect(createdOrder.orderTotal.total).toBe(300);

    const completedSession = await PaymentSession.findById(paymentSession._id);
    expect(completedSession.paymentStatus).toBe("paid");
    expect(completedSession.completedOrder.toString()).toBe(
      createdOrder._id.toString()
    );

    const productAfterPayment = await Product.findById(product._id);
    expect(productAfterPayment.quantity).toBe(1);

    await orderService.markPaymentSucceeded(paymentIntentId);

    const orderCount = await Order.countDocuments({ paymentIntentId });
    const productAfterRetry = await Product.findById(product._id);
    expect(orderCount).toBe(1);
    expect(productAfterRetry.quantity).toBe(1);
  });

  it("rejects Stripe webhooks with invalid signatures", async () => {
    const payload = JSON.stringify({
      id: `evt_${unique("stripe")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: `pi_${unique("stripe")}` } },
    });

    const res = await request(app)
      .post("/payment/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "invalid")
      .send(payload);

    expect(res.statusCode).toBe(400);
  });

  it("marks paid Stripe orders and decrements stock exactly once", async () => {
    const buyer = await registerAndLogin(
      `stripe-buyer-${unique("id")}@critical-test.example.com`
    );
    const { product } = await createProductFixture({ price: 120, quantity: 4 });
    const paymentIntentId = `pi_${unique("fixture")}`;

    const order = await Order.create({
      userID: buyer.user._id,
      orderStatus: "pending_payment",
      paymentStatus: "requires_payment",
      paymentMethod: "prepaid",
      paymentIntentId,
      items: [
        {
          productID: product._id,
          productName: product.name,
          quantity: 2,
          price: 120,
          variant: "",
          variantId: null,
          sku: "",
          attributes: [],
          image: "",
        },
      ],
      totalPrice: 240,
      shippingAddress: {
        phone: "1234567890",
        street: "Main Street",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "US",
      },
      orderTotal: {
        subtotal: 240,
        discount: 0,
        total: 240,
      },
    });

    const payload = JSON.stringify({
      id: `evt_${unique("stripe")}`,
      type: "payment_intent.succeeded",
      data: { object: { id: paymentIntentId } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: config.stripe.webhookSecret,
    });

    const firstRes = await request(app)
      .post("/payment/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(payload);

    expect(firstRes.statusCode).toBe(200);

    const paidOrder = await Order.findById(order._id);
    expect(paidOrder.paymentStatus).toBe("paid");
    expect(paidOrder.orderStatus).toBe("pending");

    const productAfterFirstWebhook = await Product.findById(product._id);
    expect(productAfterFirstWebhook.quantity).toBe(2);

    const secondRes = await request(app)
      .post("/payment/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(payload);

    expect(secondRes.statusCode).toBe(200);

    const productAfterRetry = await Product.findById(product._id);
    expect(productAfterRetry.quantity).toBe(2);
  });
});
