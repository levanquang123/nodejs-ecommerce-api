const stripeClient = require("stripe");
const Sentry = require("@sentry/node");
const config = require("../config/env");
const orderService = require("./order.service");
const User = require("../model/user");

function getStripe() {
  if (!config.stripe.secretKey || !config.stripe.publishableKey) {
    throw new Error("Missing Stripe env vars");
  }

  return stripeClient(config.stripe.secretKey);
}

exports.createPaymentIntent = async (userId, orderPayload) => {
  const stripe = getStripe();
  const user = await User.findById(userId).select("email address");
  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  let order;

  try {
    order = await orderService.createPendingPayment(userId, orderPayload);
    const totalInCents = Math.round(Number(order.orderTotal.total) * 100);

    if (totalInCents < 100) {
      const error = new Error("Order total must be at least $1.00 for card payment.");
      error.status = 400;
      throw error;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.address?.fullName || user.email,
      address: {
        line1: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postal_code: order.shippingAddress.postalCode,
        country: order.shippingAddress.country || "US",
      },
    });

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2026-01-28.clover" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalInCents,
      currency: "usd",
      customer: customer.id,
      description: `Order ${order._id}`,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
    });

    await orderService.attachPaymentIntent(order._id, paymentIntent.id);

    return {
      orderId: order._id,
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: config.stripe.publishableKey,
      orderTotal: order.orderTotal,
    };
  } catch (error) {
    if (order?._id) {
      await orderService.cancelPendingPaymentOrder(order._id);
    }
    throw error;
  }
};

exports.handleStripeWebhook = async (req) => {
  const stripe = getStripe();

  if (!config.stripe.webhookSecret) {
    throw new Error("Missing Stripe webhook secret");
  }

  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      config.stripe.webhookSecret
    );
  } catch (error) {
    Sentry.captureMessage("Stripe webhook signature verification failed", {
      level: "warning",
      tags: {
        service: "stripe-webhook",
        webhook_error: "invalid_signature",
      },
      extra: {
        message: error.message,
      },
    });
    error.status = 400;
    throw error;
  }

  Sentry.setTag("stripe_event_type", event.type);
  Sentry.setTag("stripe_event_id", event.id);

  if (event.type === "payment_intent.succeeded") {
    await orderService.markPaymentSucceeded(event.data.object.id);
  }

  if (event.type === "payment_intent.payment_failed") {
    await orderService.markPaymentFailed(event.data.object.id, "failed");
    Sentry.captureMessage("Stripe payment intent failed", {
      level: "warning",
      tags: {
        service: "stripe-webhook",
        stripe_event_type: event.type,
      },
      extra: {
        eventId: event.id,
        paymentIntentId: event.data.object.id,
        lastPaymentError: event.data.object.last_payment_error,
      },
    });
  }

  if (event.type === "payment_intent.canceled") {
    await orderService.markPaymentFailed(event.data.object.id, "cancelled");
    Sentry.captureMessage("Stripe payment intent canceled", {
      level: "info",
      tags: {
        service: "stripe-webhook",
        stripe_event_type: event.type,
      },
      extra: {
        eventId: event.id,
        paymentIntentId: event.data.object.id,
      },
    });
  }
};
