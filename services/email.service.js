const nodemailer = require("nodemailer");
const config = require("../config/env");

let transporter;
const SEND_TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(
    config.email.host &&
      config.email.user &&
      config.email.pass &&
      config.email.from
  );
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });

  return transporter;
}

function withTimeout(promise, timeoutMs, message) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error(message);
      error.code = "EMAIL_SEND_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeout);
  });
}

exports.sendVerificationCode = async ({ to, code }) => {
  if (config.isTest) {
    return;
  }

  const mailer = getTransporter();
  if (!mailer) {
    if (!config.isProduction) {
      console.info(`Email verification code for ${to}: ${code}`);
      return;
    }
    throw new Error("Email service is not configured.");
  }

  try {
    await withTimeout(
      mailer.sendMail({
        from: config.email.from,
        to,
        subject: "Verify your QMarket email",
        text: `Your QMarket verification code is ${code}. It expires in 10 minutes.`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
            <h2 style="margin:0 0 12px">Verify your email</h2>
            <p>Use this code to finish setting up your QMarket account.</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${code}</div>
            <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
          </div>
        `,
      }),
      SEND_TIMEOUT_MS,
      "Email delivery timed out."
    );
  } catch (error) {
    if (error?.code === "EMAIL_SEND_TIMEOUT") {
      transporter?.close?.();
      transporter = null;
    }
    throw error;
  }
};
