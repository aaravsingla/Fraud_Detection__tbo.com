/**
 * SMTP Email Client for OTP Delivery
 *
 * Dual-mode: Console log (default) for development, real SMTP for production.
 * Set SMTP_ENABLED=true with SMTP_* env vars to send real emails.
 *
 * Environment Variables:
 *   SMTP_ENABLED  — "true" to enable real email sending
 *   SMTP_HOST     — SMTP server hostname (e.g., smtp.gmail.com, smtp.sendgrid.net)
 *   SMTP_PORT     — SMTP port (587 for STARTTLS, 465 for SSL, 25 for plain)
 *   SMTP_SECURE   — "true" for port 465 SSL, "false" for STARTTLS (default)
 *   SMTP_USER     — SMTP username / API key
 *   SMTP_PASSWORD  — SMTP password / API secret
 *   SMTP_FROM     — Sender address (default: "noreply@fraudshield.tbo.com")
 */

import { createTransport } from "nodemailer";

const SMTP_ENABLED = process.env.SMTP_ENABLED === "true";
const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // true for 465, false for 587
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? "noreply@fraudshield.tbo.com";

let transporter = null;

// ─── Initialise Transporter ─────────────────────────────────────────────────

function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_ENABLED) return null;

  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.warn("[SMTP] SMTP_ENABLED=true but SMTP_USER or SMTP_PASSWORD is missing. Falling back to console.");
    return null;
  }

  transporter = createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
    // Connection timeouts
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  // Verify connection on first use
  transporter.verify()
    .then(() => console.log(`[SMTP] Connected to ${SMTP_HOST}:${SMTP_PORT}`))
    .catch((err) => console.error(`[SMTP] Connection verification failed: ${err.message}`));

  return transporter;
}

// ─── HTML Email Template ────────────────────────────────────────────────────

function buildOTPEmail(otp, bookingId) {
  const otpDigits = String(otp).split("").map(
    (d) => `<td style="width:40px;height:48px;text-align:center;font-size:24px;font-weight:bold;border:2px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-family:'Courier New',monospace;letter-spacing:2px;">${d}</td>`
  ).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.07);overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;">
          <table width="100%"><tr>
            <td style="color:#f8fafc;font-size:20px;font-weight:700;">🛡️ FraudShield</td>
            <td align="right" style="color:#94a3b8;font-size:12px;">TBO.com Security</td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="color:#1e293b;font-size:16px;margin:0 0 8px;">Identity Verification Required</p>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.5;">
            A step-up verification has been triggered${bookingId ? ` for booking <strong>${bookingId}</strong>` : ""}. 
            Use the code below to confirm your identity.
          </p>
          <!-- OTP Box -->
          <table cellpadding="0" cellspacing="8" style="margin:0 auto 24px;">
            <tr>${otpDigits}</tr>
          </table>
          <p style="text-align:center;color:#ef4444;font-size:13px;margin:0 0 24px;">
            ⏱ This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.5;">
            If you did not request this verification, please ignore this email or contact the fraud operations team immediately.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:11px;margin:0;text-align:center;">
            Intelligent Fraud Prevention Dashboard &mdash; TBO.com &copy; 2026
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildPlainText(otp, bookingId) {
  return [
    "FraudShield — Identity Verification",
    "",
    bookingId ? `Booking: ${bookingId}` : "",
    "",
    `Your verification code is: ${otp}`,
    "",
    "This code expires in 5 minutes.",
    "Do not share this code with anyone.",
    "",
    "If you did not request this, please contact the fraud operations team.",
  ].filter(Boolean).join("\n");
}

// ─── Send OTP Email ─────────────────────────────────────────────────────────

export async function sendOTPEmail({ email, otp, bookingId }) {
  // Always log for audit trail
  console.log(`[SMTP] OTP for ${email} (booking ${bookingId ?? "N/A"}): ${otp}`);

  const transport = getTransporter();
  if (!transport) {
    console.log("[SMTP] Real SMTP disabled — OTP logged to console only.");
    return { sent: false, mode: "console", email };
  }

  try {
    const info = await transport.sendMail({
      from: `"FraudShield Verification" <${SMTP_FROM}>`,
      to: email,
      subject: `Your verification code: ${otp}`,
      text: buildPlainText(otp, bookingId),
      html: buildOTPEmail(otp, bookingId),
    });

    console.log(`[SMTP] Email sent to ${email} — messageId: ${info.messageId}`);
    return { sent: true, mode: "smtp", email, messageId: info.messageId };
  } catch (err) {
    console.error(`[SMTP] Failed to send email to ${email}: ${err.message}`);
    // Don't block the flow — OTP was already stored
    return { sent: false, mode: "smtp_error", email, error: err.message };
  }
}
