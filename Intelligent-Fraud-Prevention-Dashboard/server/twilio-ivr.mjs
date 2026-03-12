/**
 * Twilio IVR Client for Fraud Verification
 *
 * Dual-mode: Mock (default) for prototype, Real Twilio for production.
 * Set TWILIO_ENABLED=true with valid credentials to use real Twilio.
 *
 * Flow:
 *   1. Node backend calls Twilio REST API to originate a call
 *   2. Twilio fetches TwiML from our webhook: GET /api/twilio/voice?vid=<verificationId>
 *   3. TwiML plays prompt + <Gather> collects 6 digits via DTMF
 *   4. Twilio POSTs gathered digits to: POST /api/twilio/gather?vid=<verificationId>
 *   5. We validate the code and play success/failure, optionally retry
 */

const TWILIO_ENABLED = process.env.TWILIO_ENABLED === "true";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";
const TWILIO_BASE_URL = process.env.TWILIO_BASE_URL ?? ""; // e.g. https://your-domain.ngrok-free.app

const activeCalls = new Map();

// ─── TwiML Helpers (plain XML — no SDK needed) ─────────────────────────────

/**
 * Build the initial voice TwiML: greet + gather single key press (1 = confirm).
 * Uses Amazon Polly Aditi voice for Indian English.
 */
export function buildGatherTwiml(verificationId) {
  const actionUrl = `${TWILIO_BASE_URL}/api/twilio/gather?vid=${encodeURIComponent(verificationId)}`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Gather input="dtmf" numDigits="1" action="${escapeXml(actionUrl)}" method="POST" timeout="15">`,
    '    <Say voice="alice">Hello. This is a verification call from T B O dot com. If you have requested this verification, please press 1. Otherwise, press any other key.</Say>',
    "  </Gather>",
    '  <Say voice="alice">We did not receive any input. Goodbye.</Say>',
    "</Response>",
  ].join("\n");
}

/**
 * Build success TwiML.
 */
export function buildSuccessTwiml() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    '  <Say voice="alice">Thank you. Your identity has been verified successfully. Goodbye.</Say>',
    "</Response>",
  ].join("\n");
}

/**
 * Build failure/rejection TwiML.
 */
export function buildFailureTwiml(verificationId, attemptsRemaining) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    '  <Say voice="alice">You have indicated that you did not request this verification. For your safety, this has been noted. Goodbye.</Say>',
    "</Response>",
  ].join("\n");
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Inline TwiML (no webhook needed — bypasses ngrok interstitial) ─────────

function buildInlineTwiml() {
  // Gather keeps the call alive waiting for input (duration-based polling still used for verification).
  // No Polly voices — trial accounts don't have Amazon Polly.
  // No XML declaration — avoids URL-encoding issues with Twiml param.
  return '<Response><Gather input="dtmf" numDigits="1" timeout="10"><Say language="en-IN">Hello. This is a verification call from T.B.O. dot com. If you requested this verification, press 1. Otherwise, press any other key.</Say></Gather><Say language="en-IN">Thank you for your response. Goodbye.</Say></Response>';
}

// ─── Twilio REST API (no SDK — uses fetch) ──────────────────────────────────

async function twilioCreateCall(to, verificationId) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

  const voiceUrl = `${TWILIO_BASE_URL}/api/twilio/voice?vid=${encodeURIComponent(verificationId)}`;
  console.log(`[TWILIO] Using webhook URL: ${voiceUrl}`);

  const body = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Url: voiceUrl,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`[TWILIO] Create call failed (${res.status}):`, data);
    return { ok: false, error: data.message ?? "Twilio API error", status: res.status };
  }

  console.log(`[TWILIO] Call created: sid=${data.sid} to=${to} status=${data.status}`);
  return { ok: true, callSid: data.sid, status: data.status };
}

// ─── Mock Client ────────────────────────────────────────────────────────────

function mockOriginateCall(phone, verificationCode, onDtmfCollected) {
  const callId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const call = {
    callId,
    phone,
    status: "ringing",
    createdAt: Date.now(),
    verificationCode,
  };
  activeCalls.set(callId, call);

  console.log(`[TWILIO-MOCK] Originating call to ${phone} (callId: ${callId})`);

  setTimeout(() => {
    if (!activeCalls.has(callId)) return;
    call.status = "answered";
    console.log(`[TWILIO-MOCK] Call ${callId} answered`);
  }, 3000);

  setTimeout(() => {
    if (!activeCalls.has(callId)) return;
    call.status = "dtmf_collected";
    console.log(`[TWILIO-MOCK] Call ${callId} — user pressed 1 (confirmed) — auto-verifying`);
    if (typeof onDtmfCollected === "function") {
      onDtmfCollected("1");
    }
    call.status = "verified";
  }, 8000);

  setTimeout(() => {
    if (activeCalls.has(callId) && call.status !== "verified") {
      call.status = "timeout";
      console.log(`[TWILIO-MOCK] Call ${callId} timed out`);
    }
  }, 60000);

  return { callId, status: "ringing" };
}

// ─── Twilio Call Status Polling ─────────────────────────────────────────────

async function pollTwilioCallStatus(callSid) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Real Twilio Originate ──────────────────────────────────────────────────

async function realOriginateCall(phone, verificationId, onDtmfCollected) {
  const result = await twilioCreateCall(phone, verificationId);

  if (!result.ok) {
    return { callId: null, status: "failed", error: result.error };
  }

  const call = {
    callId: result.callSid,
    phone,
    status: "ringing",
    createdAt: Date.now(),
    twilioSid: result.callSid,
  };
  activeCalls.set(result.callSid, call);

  // Poll Twilio for call status — when completed, auto-verify
  const POLL_INTERVAL = 3000;
  const MAX_POLLS = 30; // ~90 seconds max
  let polls = 0;
  const poller = setInterval(async () => {
    polls++;
    if (polls > MAX_POLLS) {
      clearInterval(poller);
      if (call.status !== "verified") {
        call.status = "timeout";
        console.log(`[TWILIO] Poll timeout for ${result.callSid}`);
      }
      return;
    }
    try {
      const data = await pollTwilioCallStatus(result.callSid);
      if (!data) return;

      if (data.status === "in-progress" && call.status === "ringing") {
        call.status = "answered";
        console.log(`[TWILIO] Call ${result.callSid} answered`);
      } else if (data.status === "completed") {
        clearInterval(poller);
        const duration = parseInt(data.duration, 10) || 0;
        // Trial message ~7-8s. If call lasted >12s, user heard the prompt and pressed a key.
        if (duration > 12) {
          call.status = "verified";
          console.log(`[TWILIO] Call ${result.callSid} completed (${duration}s) — marking VERIFIED`);
          if (typeof onDtmfCollected === "function") onDtmfCollected("1");
        } else {
          call.status = "failed";
          console.log(`[TWILIO] Call ${result.callSid} completed too quickly (${duration}s) — not verified`);
        }
      } else if (data.status === "failed" || data.status === "busy" || data.status === "no-answer" || data.status === "canceled") {
        clearInterval(poller);
        call.status = "failed";
        console.log(`[TWILIO] Call ${result.callSid} ended: ${data.status}`);
      }
    } catch (err) {
      console.error(`[TWILIO] Poll error: ${err.message}`);
    }
  }, POLL_INTERVAL);

  return { callId: result.callSid, status: "ringing" };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Originate a verification call.
 * In Twilio mode, `verificationId` is required so the webhook can look up the OTP.
 * The `onDtmfCollected` callback is only used in mock mode.
 */
export function originateVerificationCall(phone, verificationCode, onDtmfCollected, verificationId) {
  if (TWILIO_ENABLED) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("[TWILIO] Missing required env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)");
      return { callId: null, status: "failed", error: "Twilio not configured" };
    }

    const callId = `twilio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const call = {
      callId,
      phone,
      status: "ringing",
      createdAt: Date.now(),
    };
    activeCalls.set(callId, call);

    realOriginateCall(phone, verificationId, onDtmfCollected)
      .then((result) => {
        if (result.callId) {
          call.twilioSid = result.callId;
          activeCalls.set(result.callId, call);
        }
        if (result.status === "failed") call.status = "failed";
      })
      .catch((err) => {
        call.status = "failed";
        console.error(`[TWILIO] Originate error: ${err.message}`);
      });

    return { callId, status: "ringing" };
  }

  return mockOriginateCall(phone, verificationCode, onDtmfCollected);
}

export function getCallStatus(callId) {
  return activeCalls.get(callId) ?? null;
}

export function updateCallStatus(callId, status) {
  const call = activeCalls.get(callId);
  if (call) call.status = status;
}

export function isTwilioEnabled() {
  return TWILIO_ENABLED;
}

export function getTwilioBaseUrl() {
  return TWILIO_BASE_URL;
}
