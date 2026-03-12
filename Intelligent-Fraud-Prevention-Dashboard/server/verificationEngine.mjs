/**
 * Step-Up Verification Engine
 *
 * Manages email OTP and IVR (Twilio) phone call verification for
 * identity risk cases. In-memory store with TTL enforcement.
 *
 * Prototype mode: OTP is logged to console AND returned in the response.
 * Production: uses SMTP for email, and Twilio for IVR calls.
 */

import { originateVerificationCall, getCallStatus } from "./twilio-ivr.mjs";
import { sendOTPEmail } from "./smtp-client.mjs";
import crypto from "node:crypto";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;
const verifications = [];

// ─── OTP Generation ─────────────────────────────────────────────────────────

function generateOTP() {
  // Cryptographically random 6-digit code
  return String(crypto.randomInt(100000, 999999));
}

// ─── Email OTP ──────────────────────────────────────────────────────────────

export async function requestEmailOTP({ bookingId, email }) {
  if (!email) return { error: "Email is required" };

  const otp = generateOTP();
  const verification = {
    id: `VER-${String(verifications.length + 1).padStart(4, "0")}`,
    bookingId: bookingId ?? null,
    method: "email_otp",
    target: email,
    status: "sent",
    otp, // stored for validation
    requestedBy: "system",
    requestedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    verifiedAt: null,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
  };
  verifications.push(verification);

  // Send via real SMTP if configured, otherwise falls back to console log
  const emailResult = await sendOTPEmail({ email, otp, bookingId });

  const response = {
    verificationId: verification.id,
    status: verification.status,
    expiresAt: verification.expiresAt,
    emailDelivery: emailResult.mode, // "smtp" | "console" | "smtp_error"
  };

  // Include OTP in response only when SMTP is not active (dev mode)
  if (emailResult.mode === "console") {
    response._devOtp = otp;
  }

  return response;
}

// ─── IVR Phone Call ─────────────────────────────────────────────────────────

export function requestIVRCall({ bookingId, phone }) {
  if (!phone) return { error: "Phone number is required" };

  const code = generateOTP();
  const verification = {
    id: `VER-${String(verifications.length + 1).padStart(4, "0")}`,
    bookingId: bookingId ?? null,
    method: "ivr_call",
    target: phone,
    status: "pending",
    otp: code,
    requestedBy: "system",
    requestedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    verifiedAt: null,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    twilioCallId: null,
  };
  verifications.push(verification);

  console.log(`[VERIFICATION] IVR code for ${phone} (${verification.id}): ${code}`);

  // Originate call via Twilio client (mock or real depending on env)
  const callResult = originateVerificationCall(phone, code, (dtmfInput) => {
    // Callback when DTMF is collected (mock mode only)
    verifyCode({ verificationId: verification.id, code: dtmfInput });
  }, verification.id);
  verification.twilioCallId = callResult.callId;

  return {
    verificationId: verification.id,
    status: verification.status,
    twilioCallId: callResult.callId,
  };
}

// ─── Verify OTP / IVR Code ─────────────────────────────────────────────────

export function verifyCode({ verificationId, code }) {
  const ver = verifications.find((v) => v.id === verificationId);
  if (!ver) return { verified: false, error: "Verification not found", attemptsRemaining: 0 };

  // Check expiry
  if (new Date() > new Date(ver.expiresAt)) {
    ver.status = "expired";
    return { verified: false, error: "Verification expired", attemptsRemaining: 0 };
  }

  // Check if already verified or failed
  if (ver.status === "verified") return { verified: true, attemptsRemaining: ver.maxAttempts - ver.attempts };
  if (ver.status === "failed") return { verified: false, error: "Max attempts exceeded", attemptsRemaining: 0 };

  ver.attempts += 1;

  // Press-1 confirmation from IVR call (no code match needed)
  if (code === "__PRESS1__" || code === "1") {
    ver.status = "verified";
    ver.verifiedAt = new Date().toISOString();
    console.log(`[VERIFICATION] ${ver.id} VERIFIED via press-1 confirmation`);
    return { verified: true, attemptsRemaining: ver.maxAttempts - ver.attempts };
  }

  if (String(code) === String(ver.otp)) {
    ver.status = "verified";
    ver.verifiedAt = new Date().toISOString();
    console.log(`[VERIFICATION] ${ver.id} VERIFIED successfully`);
    return { verified: true, attemptsRemaining: ver.maxAttempts - ver.attempts };
  }

  const remaining = ver.maxAttempts - ver.attempts;
  if (remaining <= 0) {
    ver.status = "failed";
    console.log(`[VERIFICATION] ${ver.id} FAILED — max attempts exceeded`);
  }

  return { verified: false, error: "Invalid code", attemptsRemaining: Math.max(0, remaining) };
}

// ─── Status Query ───────────────────────────────────────────────────────────

export function getVerificationStatus(verificationId) {
  const ver = verifications.find((v) => v.id === verificationId);
  if (!ver) return null;

  // Check if IVR call status has updated (for mock polling)
  if (ver.method === "ivr_call" && ver.twilioCallId) {
    const callStatus = getCallStatus(ver.twilioCallId);
    if (callStatus?.status === "verified" && ver.status !== "verified") {
      ver.status = "verified";
      ver.verifiedAt = new Date().toISOString();
    } else if (callStatus?.status === "answered" && ver.status === "pending") {
      ver.status = "sent"; // call connected
    }
  }

  // Auto-expire
  if (ver.status !== "verified" && ver.status !== "failed" && new Date() > new Date(ver.expiresAt)) {
    ver.status = "expired";
  }

  return {
    verificationId: ver.id,
    bookingId: ver.bookingId,
    method: ver.method,
    target: ver.target,
    status: ver.status,
    attempts: ver.attempts,
    maxAttempts: ver.maxAttempts,
    requestedAt: ver.requestedAt,
    expiresAt: ver.expiresAt,
    verifiedAt: ver.verifiedAt,
  };
}
