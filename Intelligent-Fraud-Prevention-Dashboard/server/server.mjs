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

    return send(res, 404, { error: "Not Found" });
  } catch (e) {
    return send(res, 400, { error: "Bad Request", message: String(e?.message ?? e) });
  }
});

server.listen(PORT, () => {
  console.log(`Risk API listening on http://localhost:${PORT}`);
});
