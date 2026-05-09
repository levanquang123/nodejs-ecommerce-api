const nodemailer = require("nodemailer");
const config = require("../config/env");

let transporter;
const SEND_TIMEOUT_MS = 8000;
const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

function isConfigured() {
  return Boolean(
    config.email.brevoApiKey ||
      (config.email.host &&
      config.email.user &&
      config.email.pass &&
      config.email.from)
  );
}

function isSmtpConfigured() {
  return Boolean(
    config.email.host &&
      config.email.user &&
      config.email.pass &&
      config.email.from
  );
}

function isBrevoApiConfigured() {
  return Boolean(config.email.brevoApiKey && config.email.from);
}

function getProviderName() {
  if (isBrevoApiConfigured()) return "brevo_api";
  if (isSmtpConfigured()) return "smtp";
  return "none";
}

function getDiagnostics() {
  return {
    configured: isConfigured(),
    provider: getProviderName(),
    hasBrevoApiKey: Boolean(config.email.brevoApiKey),
    hasSmtp: isSmtpConfigured(),
    fromConfigured: Boolean(config.email.from),
    smtpHostConfigured: Boolean(config.email.host),
    smtpUserConfigured: Boolean(config.email.user),
    smtpPassConfigured: Boolean(config.email.pass),
  };
}

function getTransporter() {
  if (!isSmtpConfigured()) return null;
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

function parseEmailAddress(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*)<(.+)>$/);

  if (!match) {
    return { email: raw };
  }

  const name = match[1].trim().replace(/^["']|["']$/g, "");
  return {
    email: match[2].trim(),
    ...(name ? { name } : {}),
  };
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

async function sendViaBrevoApi({ to, code }) {
  const response = await withTimeout(
    fetch(BREVO_SEND_EMAIL_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.email.brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: parseEmailAddress(config.email.from),
        to: [{ email: to }],
        subject: "Verify your QMarket email",
        textContent: `Your QMarket verification code is ${code}. It expires in 10 minutes.`,
        htmlContent: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
            <h2 style="margin:0 0 12px">Verify your email</h2>
            <p>Use this code to finish setting up your QMarket account.</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${code}</div>
            <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
          </div>
        `,
      }),
    }),
    SEND_TIMEOUT_MS,
    "Email delivery timed out."
  );

  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch (_) {
      body = {};
    }

    const error = new Error(
      body?.message || `Brevo email delivery failed with status ${response.status}.`
    );
    error.code = "BREVO_EMAIL_SEND_FAILED";
    error.responseCode = response.status;
    throw error;
  }
}

async function sendViaSmtp({ to, code }) {
  const mailer = getTransporter();

  if (!mailer) {
    throw new Error("Email service is not configured.");
  }

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
}

exports.sendVerificationCode = async ({ to, code }) => {
  if (config.isTest) {
    return;
  }

  if (!isConfigured()) {
    if (!config.isProduction) {
      console.info(`Email verification code for ${to}: ${code}`);
      return;
    }
    throw new Error("Email service is not configured.");
  }

  try {
    console.info(`Sending verification email via ${getProviderName()} to ${to}`);

    if (isBrevoApiConfigured()) {
      await sendViaBrevoApi({ to, code });
      return;
    }

    await sendViaSmtp({ to, code });
  } catch (error) {
    if (error?.code === "EMAIL_SEND_TIMEOUT") {
      transporter?.close?.();
      transporter = null;
    }
    throw error;
  }
};

exports.getDiagnostics = getDiagnostics;
