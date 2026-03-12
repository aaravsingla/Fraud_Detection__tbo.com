/**
 * Asterisk ARI (Asterisk REST Interface) Client
 *
 * Dual-mode: Mock (default) for prototype, Real ARI for production.
 * Set ASTERISK_ENABLED=true to use real Asterisk.
 *
 * Mock mode simulates the full call lifecycle:
 *   ringing → answered → dtmf_collected → verified
 *
 * Real mode:
 *   - Originates calls via ARI REST API (POST /channels)
 *   - Connects to ARI WebSocket for real-time events
 *   - Handles StasisStart, ChannelDtmfReceived, StasisEnd events
 *   - Collects DTMF digits and triggers verification callback
 */

import { WebSocket } from "ws"; // ws is a transitive dep of many packages; fallback to native if needed

const ASTERISK_ENABLED = process.env.ASTERISK_ENABLED === "true";
const ASTERISK_HOST = process.env.ASTERISK_HOST ?? "localhost";
const ASTERISK_PORT = Number(process.env.ASTERISK_PORT ?? 8088);
const ASTERISK_USER = process.env.ASTERISK_USER ?? "ariuser";
const ASTERISK_PASSWORD = process.env.ASTERISK_PASSWORD ?? "aripass";
const ARI_APP_NAME = process.env.ARI_APP_NAME ?? "fraud-verification";

const activeCalls = new Map();

// ─── ARI WebSocket Connection ───────────────────────────────────────────────

let ariWs = null;
let ariWsReconnectTimer = null;
const ARI_WS_RECONNECT_INTERVAL = 5000;

// Per-channel DTMF accumulators: channelId → { digits: "", callId: "", onDtmfCollected: fn }
const dtmfCollectors = new Map();

function getAriWsUrl() {
  return `ws://${ASTERISK_HOST}:${ASTERISK_PORT}/ari/events?api_key=${ASTERISK_USER}:${ASTERISK_PASSWORD}&app=${ARI_APP_NAME}&subscribeAll=true`;
}

function connectAriWebSocket() {
  if (!ASTERISK_ENABLED) return;
  if (ariWs && ariWs.readyState === WebSocket.OPEN) return;

  const url = getAriWsUrl();
  console.log(`[ARI-WS] Connecting to ${url.replace(/api_key=[^&]+/, "api_key=***")}`);

  try {
    ariWs = new WebSocket(url);
  } catch (err) {
    console.error(`[ARI-WS] Failed to create WebSocket: ${err.message}`);
    scheduleReconnect();
    return;
  }

  ariWs.on("open", () => {
    console.log("[ARI-WS] Connected to Asterisk ARI event stream");
    if (ariWsReconnectTimer) {
      clearTimeout(ariWsReconnectTimer);
      ariWsReconnectTimer = null;
    }
  });

  ariWs.on("message", (raw) => {
    try {
      const event = JSON.parse(String(raw));
      handleAriEvent(event);
    } catch {
      console.warn("[ARI-WS] Failed to parse event:", String(raw).slice(0, 200));
    }
  });

  ariWs.on("close", (code, reason) => {
    console.warn(`[ARI-WS] Disconnected (code=${code}, reason=${reason})`);
    ariWs = null;
    scheduleReconnect();
  });

  ariWs.on("error", (err) => {
    console.error(`[ARI-WS] Error: ${err.message}`);
    // 'close' event will follow, triggering reconnect
  });
}

function scheduleReconnect() {
  if (ariWsReconnectTimer) return;
  console.log(`[ARI-WS] Reconnecting in ${ARI_WS_RECONNECT_INTERVAL / 1000}s...`);
  ariWsReconnectTimer = setTimeout(() => {
    ariWsReconnectTimer = null;
    connectAriWebSocket();
  }, ARI_WS_RECONNECT_INTERVAL);
}

// ─── ARI Event Handler ─────────────────────────────────────────────────────

function handleAriEvent(event) {
  const type = event.type;
  const channelId = event.channel?.id;

  switch (type) {
    case "StasisStart": {
      console.log(`[ARI-WS] StasisStart: channel=${channelId} args=${JSON.stringify(event.args)}`);
      // Answer the channel
      answerChannel(channelId);
      // Play the verification prompt after a short delay
      setTimeout(() => playPrompt(channelId), 1000);
      break;
    }

    case "ChannelDtmfReceived": {
      const digit = event.digit;
      console.log(`[ARI-WS] DTMF received: channel=${channelId} digit=${digit}`);

      const collector = dtmfCollectors.get(channelId);
      if (!collector) break;

      if (digit === "#") {
        // '#' terminates input — trigger verification
        const collectedCode = collector.digits;
        console.log(`[ARI-WS] DTMF collection complete: channel=${channelId} code=${collectedCode}`);
        finalizeDtmf(channelId, collectedCode);
      } else {
        collector.digits += digit;
        // Auto-trigger after 6 digits (OTP length)
        if (collector.digits.length >= 6) {
          const collectedCode = collector.digits.slice(0, 6);
          console.log(`[ARI-WS] DTMF 6 digits collected: channel=${channelId} code=${collectedCode}`);
          finalizeDtmf(channelId, collectedCode);
        }
      }
      break;
    }

    case "ChannelHangupRequest":
    case "StasisEnd": {
      console.log(`[ARI-WS] ${type}: channel=${channelId}`);
      const collector = dtmfCollectors.get(channelId);
      if (collector) {
        const call = activeCalls.get(collector.callId);
        if (call && call.status !== "verified") {
          call.status = "hangup";
        }
        dtmfCollectors.delete(channelId);
      }
      break;
    }

    case "ChannelStateChange": {
      const state = event.channel?.state;
      console.log(`[ARI-WS] ChannelStateChange: channel=${channelId} state=${state}`);
      break;
    }

    default:
      // Log unknown events at debug level
      if (type) console.log(`[ARI-WS] Event: ${type}`);
  }
}

function finalizeDtmf(channelId, code) {
  const collector = dtmfCollectors.get(channelId);
  if (!collector) return;

  const call = activeCalls.get(collector.callId);
  if (call) {
    call.status = "dtmf_collected";
  }

  // Invoke the verification callback
  if (typeof collector.onDtmfCollected === "function") {
    collector.onDtmfCollected(code);
  }

  // If verification succeeded, update call status
  if (call) {
    call.status = "verified";
  }

  // Play success prompt then hang up
  playPrompt(channelId, "custom/verification-success").then(() => {
    setTimeout(() => hangupChannel(channelId), 2000);
  });

  dtmfCollectors.delete(channelId);
}

// ─── ARI REST Helpers ───────────────────────────────────────────────────────

function ariAuthHeader() {
  return `Basic ${Buffer.from(`${ASTERISK_USER}:${ASTERISK_PASSWORD}`).toString("base64")}`;
}

function ariBaseUrl() {
  return `http://${ASTERISK_HOST}:${ASTERISK_PORT}/ari`;
}

async function ariRequest(method, path, body) {
  const url = `${ariBaseUrl()}${path}`;
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: ariAuthHeader(),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    if (!res.ok) {
      console.error(`[ARI] ${method} ${path} → ${res.status}: ${text}`);
      return { ok: false, status: res.status, error: text };
    }
    return { ok: true, data: text ? JSON.parse(text) : null };
  } catch (err) {
    console.error(`[ARI] ${method} ${path} failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function answerChannel(channelId) {
  return ariRequest("POST", `/channels/${encodeURIComponent(channelId)}/answer`);
}

async function playPrompt(channelId, media = "custom/fraud-verify-prompt") {
  return ariRequest("POST", `/channels/${encodeURIComponent(channelId)}/play`, {
    media: `sound:${media}`,
  });
}

async function hangupChannel(channelId) {
  return ariRequest("DELETE", `/channels/${encodeURIComponent(channelId)}`);
}

// ─── Mock ARI Client ────────────────────────────────────────────────────────

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

  console.log(`[ARI-MOCK] Originating call to ${phone} (callId: ${callId})`);

  // Simulate call lifecycle
  setTimeout(() => {
    if (!activeCalls.has(callId)) return;
    call.status = "answered";
    console.log(`[ARI-MOCK] Call ${callId} answered`);
  }, 3000);

  setTimeout(() => {
    if (!activeCalls.has(callId)) return;
    call.status = "dtmf_collected";
    console.log(`[ARI-MOCK] Call ${callId} DTMF collected — auto-verifying`);

    // Simulate correct DTMF input
    if (typeof onDtmfCollected === "function") {
      onDtmfCollected(verificationCode);
    }
    call.status = "verified";
  }, 8000);

  // Auto-cleanup after 60s
  setTimeout(() => {
    if (activeCalls.has(callId) && call.status !== "verified") {
      call.status = "timeout";
      console.log(`[ARI-MOCK] Call ${callId} timed out`);
    }
  }, 60000);

  return { callId, status: "ringing" };
}

// ─── Real ARI Originate ─────────────────────────────────────────────────────

async function realOriginateCall(phone, verificationCode, onDtmfCollected) {
  // Ensure WebSocket is connected for event handling
  connectAriWebSocket();

  const callId = `ari-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const call = {
    callId,
    phone,
    status: "ringing",
    createdAt: Date.now(),
    verificationCode,
  };
  activeCalls.set(callId, call);

  const result = await ariRequest("POST", "/channels", {
    endpoint: `PJSIP/${phone}@twilio-trunk`,
    app: ARI_APP_NAME,
    appArgs: verificationCode,
    callerId: phone,
    timeout: 30,
  });

  if (!result.ok) {
    call.status = "failed";
    console.error(`[ARI] Failed to originate call to ${phone}: ${result.error}`);
    return { callId, status: "failed", error: result.error };
  }

  const channelId = result.data?.id;
  call.ariChannelId = channelId;
  console.log(`[ARI] Call originated: callId=${callId} channel=${channelId} to ${phone}`);

  // Register DTMF collector for this channel
  if (channelId) {
    dtmfCollectors.set(channelId, {
      digits: "",
      callId,
      onDtmfCollected,
    });
  }

  return { callId, status: "ringing", ariChannelId: channelId };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function originateVerificationCall(phone, verificationCode, onDtmfCollected) {
  if (ASTERISK_ENABLED) {
    // Initiate async origination; caller gets callId immediately for polling
    const callId = `ari-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const call = {
      callId,
      phone,
      status: "ringing",
      createdAt: Date.now(),
      verificationCode,
    };
    activeCalls.set(callId, call);

    // Fire the real originate—updates the call record and wires up DTMF  
    realOriginateCall(phone, verificationCode, onDtmfCollected)
      .then((result) => {
        // Sync the real channel ID and status back into the call we returned
        if (result.ariChannelId) call.ariChannelId = result.ariChannelId;
        if (result.status === "failed") call.status = "failed";
      })
      .catch((err) => {
        call.status = "failed";
        console.error(`[ARI] Originate error: ${err.message}`);
      });

    return { callId, status: "ringing" };
  }
  return mockOriginateCall(phone, verificationCode, onDtmfCollected);
}

export function getCallStatus(callId) {
  return activeCalls.get(callId) ?? null;
}

export function cancelCall(callId) {
  const call = activeCalls.get(callId);
  if (call) {
    call.status = "cancelled";
    // If real ARI, hang up the channel
    if (call.ariChannelId) {
      hangupChannel(call.ariChannelId).catch(() => {});
    }
    activeCalls.delete(callId);
    console.log(`[ARI] Call ${callId} cancelled`);
  }
  return call ?? null;
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

/** Call once at server startup if ASTERISK_ENABLED to pre-connect WebSocket */
export function initAriConnection() {
  if (ASTERISK_ENABLED) {
    console.log("[ARI] Asterisk integration ENABLED — connecting ARI WebSocket...");
    connectAriWebSocket();
  } else {
    console.log("[ARI] Asterisk integration DISABLED — using mock ARI client");
  }
}

export function closeAriConnection() {
  if (ariWsReconnectTimer) {
    clearTimeout(ariWsReconnectTimer);
    ariWsReconnectTimer = null;
  }
  if (ariWs) {
    ariWs.close();
    ariWs = null;
  }
}
