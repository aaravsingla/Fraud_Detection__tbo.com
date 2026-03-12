import http from "node:http";
import { scoreBooking, recommendCreditAction } from "./riskEngine.mjs";
import { recordOverride, listOverrides } from "./reviewStore.mjs";
import {
  detectVelocityCliff,
  computeExitRisk,
  computeDualStateMatrix,
  computeBehavioralEntropy,
  analyzeBookingGaps,
} from "./advancedEngine.mjs";
import {
  createEscalation,
  listEscalations,
  resolveEscalation,
  assignEscalation,
} from "./escalationEngine.mjs";
import {
  requestEmailOTP,
  requestIVRCall,
  verifyCode,
  getVerificationStatus,
} from "./verificationEngine.mjs";
import {
  buildGatherTwiml,
  buildSuccessTwiml,
  buildFailureTwiml,
} from "./twilio-ivr.mjs";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5179;

function send(res, status, body) {
  const json = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": body === undefined ? "text/plain" : "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(json);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
  });
}

function readFormBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const params = new URLSearchParams(data);
        const obj = {};
        for (const [k, v] of params) obj[k] = v;
        resolve(obj);
      } catch (e) { reject(e); }
    });
  });
}

function sendTwiml(res, twiml) {
  res.writeHead(200, {
    "content-type": "application/xml",
    "cache-control": "no-cache",
  });
  res.end(twiml);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);

  try {
    // ── Existing endpoints ──────────────────────────────────────────────────
    if (req.url === "/api/health" && req.method === "GET") {
      return send(res, 200, { ok: true });
    }

    if (req.url === "/api/risk/score" && req.method === "POST") {
      const input = await readJson(req);
      return send(res, 200, scoreBooking(input));
    }

    if (req.url === "/api/credit/recommend" && req.method === "POST") {
      const input = await readJson(req);
      return send(res, 200, recommendCreditAction(input));
    }

    if (req.url === "/api/review/override" && req.method === "POST") {
      const input = await readJson(req);
      const saved = recordOverride({
        caseId: input?.caseId ?? null,
        bookingId: input?.bookingId ?? null,
        label: input?.label ?? null,
        rationale: input?.rationale ?? "",
        meta: input?.meta ?? {},
      });
      return send(res, 200, { ok: true, override: saved });
    }

    if (req.url?.startsWith("/api/review/overrides") && req.method === "GET") {
      return send(res, 200, { ok: true, overrides: listOverrides({ limit: 50 }) });
    }

    // ── NEW: Velocity Cliff Detection ───────────────────────────────────────
    if (req.url === "/api/velocity/cliff" && req.method === "POST") {
      const input = await readJson(req);
      return send(res, 200, detectVelocityCliff(input));
    }

    // ── NEW: Exit Risk / Exposure Window ────────────────────────────────────
    if (req.url === "/api/exposure/exit-risk" && req.method === "POST") {
      const input = await readJson(req);
      return send(res, 200, computeExitRisk(input));
    }

    // ── NEW: Dual-State Risk Matrix ─────────────────────────────────────────
    if (req.url === "/api/risk/dual-state" && req.method === "POST") {
      const input = await readJson(req);
      return send(res, 200, computeDualStateMatrix(input));
    }

    // ── NEW: Behavioral Entropy Analysis ────────────────────────────────────
    if (req.url === "/api/behavior/entropy" && req.method === "POST") {
      const input = await readJson(req);
      return send(res, 200, computeBehavioralEntropy(input));
    }

    // ── NEW: Booking-to-Travel Gap Analysis ─────────────────────────────────
    if (req.url === "/api/booking/gap-analysis" && req.method === "POST") {
      const input = await readJson(req);
      return send(res, 200, analyzeBookingGaps(input));
    }

    // ── NEW: Comprehensive agency risk profile (aggregates all signals) ──────
    if (req.url === "/api/agency/risk-profile" && req.method === "POST") {
      const input = await readJson(req);
      const [velocity, exitRisk, dualState, entropy, gapAnalysis] = await Promise.all([
        Promise.resolve(detectVelocityCliff(input?.velocity ?? {})),
        Promise.resolve(computeExitRisk(input?.exposure ?? {})),
        Promise.resolve(computeDualStateMatrix(input?.dualState ?? {})),
        Promise.resolve(computeBehavioralEntropy(input?.behavior ?? {})),
        Promise.resolve(analyzeBookingGaps(input?.gaps ?? {})),
      ]);

      // Composite advanced risk score
      const compositeRisk = Math.round(
        0.25 * velocity.riskScore +
        0.25 * exitRisk.exitRiskScore +
        0.2 * entropy.riskScore +
        0.2 * gapAnalysis.riskScore +
        0.1 * (dualState.severity === "critical" ? 100 : dualState.severity === "medium" ? 50 : 10)
      );

      return send(res, 200, {
        agencyId: input?.agencyId ?? null,
        compositeAdvancedRisk: compositeRisk,
        velocity,
        exitRisk,
        dualState,
        entropy,
        gapAnalysis,
      });
    }

    // ── Escalation Endpoints ──────────────────────────────────────────────────
    if (req.url === "/api/escalation/create" && req.method === "POST") {
      const input = await readJson(req);
      const esc = createEscalation({
        bookingId: input?.bookingId ?? null,
        reason: input?.reason ?? "manual",
        agentScores: input?.agentScores ?? [],
      });
      return send(res, 200, { ok: true, escalation: esc });
    }

    if (req.url?.startsWith("/api/escalation/list") && req.method === "GET") {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const status = url.searchParams.get("status") || undefined;
      const limit = Number(url.searchParams.get("limit")) || 50;
      return send(res, 200, { ok: true, escalations: listEscalations({ status, limit }) });
    }

    if (req.url === "/api/escalation/resolve" && req.method === "POST") {
      const input = await readJson(req);
      const esc = resolveEscalation({
        escalationId: input?.escalationId,
        resolution: input?.resolution,
        resolvedBy: input?.resolvedBy,
      });
      if (!esc) return send(res, 404, { error: "Escalation not found" });
      return send(res, 200, { ok: true, escalation: esc });
    }

    if (req.url === "/api/escalation/assign" && req.method === "POST") {
      const input = await readJson(req);
      const esc = assignEscalation({
        escalationId: input?.escalationId,
        assignedTo: input?.assignedTo,
      });
      if (!esc) return send(res, 404, { error: "Escalation not found" });
      return send(res, 200, { ok: true, escalation: esc });
    }

    // ── Verification Endpoints ────────────────────────────────────────────────
    if (req.url === "/api/verification/request-otp" && req.method === "POST") {
      const input = await readJson(req);
      const result = await requestEmailOTP({
        bookingId: input?.bookingId,
        email: input?.email,
      });
      if (result.error) return send(res, 400, result);
      return send(res, 200, result);
    }

    if (req.url === "/api/verification/request-ivr" && req.method === "POST") {
      const input = await readJson(req);
      const result = requestIVRCall({
        bookingId: input?.bookingId,
        phone: input?.phone,
      });
      if (result.error) return send(res, 400, result);
      return send(res, 200, result);
    }

    if (req.url === "/api/verification/verify" && req.method === "POST") {
      const input = await readJson(req);
      const result = verifyCode({
        verificationId: input?.verificationId,
        code: input?.code,
      });
      return send(res, 200, result);
    }

    if (req.url?.startsWith("/api/verification/status/") && req.method === "GET") {
      const id = req.url.split("/api/verification/status/")[1]?.split("?")[0];
      const result = getVerificationStatus(id);
      if (!result) return send(res, 404, { error: "Verification not found" });
      return send(res, 200, result);
    }

    // ── Twilio Webhook Endpoints ────────────────────────────────────────────
    // GET|POST /api/twilio/voice?vid=<verificationId> — returns TwiML to play prompt + gather DTMF
    if (req.url?.startsWith("/api/twilio/voice") && (req.method === "GET" || req.method === "POST")) {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const vid = url.searchParams.get("vid");
      if (!vid) return send(res, 400, { error: "Missing vid parameter" });
      return sendTwiml(res, buildGatherTwiml(vid));
    }

    // POST /api/twilio/gather?vid=<verificationId> — receives gathered DTMF digits from Twilio
    if (req.url?.startsWith("/api/twilio/gather") && req.method === "POST") {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const vid = url.searchParams.get("vid");
      if (!vid) return send(res, 400, { error: "Missing vid parameter" });

      const body = await readFormBody(req);
      const digits = body.Digits ?? "";

      console.log(`[TWILIO-WEBHOOK] Gather received: vid=${vid} digits=${digits}`);

      if (digits === "1") {
        // User confirmed they requested this call — mark verified
        const result = verifyCode({ verificationId: vid, code: "__PRESS1__" });
        return sendTwiml(res, buildSuccessTwiml());
      } else {
        // User denied — mark failed
        return sendTwiml(res, buildFailureTwiml(vid, 0));
      }
    }

    return send(res, 404, { error: "Not Found" });
  } catch (e) {
    return send(res, 400, { error: "Bad Request", message: String(e?.message ?? e) });
  }
});

server.listen(PORT, () => {
  console.log(`Risk API listening on http://localhost:${PORT}`);
});
