const stripeClient = require("stripe");

function getStripe() {
  if (!process.env.STRIPE_SKRT_KET_TST || !process.env.STRIPE_PBLK_KET_TST) {
    throw new Error("Missing Stripe env vars");
  }

  return stripeClient(process.env.STRIPE_SKRT_KET_TST);
}

exports.createPaymentIntent = async ({
  email,
  name,
  address,
  amount,
  currency,
  description,
}) => {
  const stripe = getStripe();

  const customer = await stripe.customers.create({
    email,
    name,
    address,
  });

  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customer.id },
    { apiVersion: "2026-01-28.clover" }
  );

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customer.id,
    description,
    automatic_payment_methods: { enabled: true },
  });

  return {
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey: process.env.STRIPE_PBLK_KET_TST,
  };
};
