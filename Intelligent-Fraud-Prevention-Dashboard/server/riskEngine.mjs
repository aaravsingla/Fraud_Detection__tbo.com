export function scoreBooking(input) {
  const signals = input?.signals ?? {};

  const fraud = clamp01(
    0.35 * norm(signals.deviceRisk) +
      0.25 * norm(signals.ipReputationRisk) +
      0.25 * norm(signals.geoVelocityRisk) +
      0.15 * norm(signals.sharedPaymentInstrumentRisk)
  );

  const chargeback = clamp01(
    0.45 * norm(signals.historicalChargebackRateRisk) +
      0.25 * norm(signals.cancellationSpikeRisk) +
      0.2 * norm(signals.bookingVelocityRisk) +
      0.1 * norm(signals.disputeTextAnomalyRisk)
  );

  const credit = clamp01(
    0.55 * norm(signals.creditUtilizationRisk) +
      0.3 * norm(signals.outstandingExposureRisk) +
      0.15 * norm(signals.agencyAgeRisk)
  );

  const network = clamp01(
    0.6 * norm(signals.ringConnectivityRisk) +
      0.4 * norm(signals.sharedDeviceGraphRisk)
  );

  const fused = clamp01(0.34 * fraud + 0.26 * chargeback + 0.25 * credit + 0.15 * network);

  const confidence = clamp01(
    0.85 - 0.35 * missingPenalty(signals) - 0.25 * disagreementPenalty([fraud, chargeback, credit, network])
  );

  let decision = "APPROVE";
  if (fused >= 0.82) decision = "REJECT";
  else if (fused >= 0.55 || confidence <= 0.55) decision = "REVIEW";

  const factors = topFactors({
    deviceRisk: 0.35 * norm(signals.deviceRisk),
    ipReputationRisk: 0.25 * norm(signals.ipReputationRisk),
    geoVelocityRisk: 0.25 * norm(signals.geoVelocityRisk),
    sharedPaymentInstrumentRisk: 0.15 * norm(signals.sharedPaymentInstrumentRisk),
    historicalChargebackRateRisk: 0.45 * norm(signals.historicalChargebackRateRisk),
    cancellationSpikeRisk: 0.25 * norm(signals.cancellationSpikeRisk),
    bookingVelocityRisk: 0.2 * norm(signals.bookingVelocityRisk),
    creditUtilizationRisk: 0.55 * norm(signals.creditUtilizationRisk),
    outstandingExposureRisk: 0.3 * norm(signals.outstandingExposureRisk),
    ringConnectivityRisk: 0.6 * norm(signals.ringConnectivityRisk),
  });

  return {
    decision,
    riskScore: Math.round(fused * 100),
    confidence: round2(confidence),
    subscores: {
      fraud: round2(fraud),
      chargeback: round2(chargeback),
      credit: round2(credit),
      network: round2(network),
    },
    explainability: {
      topFactors: factors,
      notes: buildNotes({ fused, confidence, network }),
      signalCoverage: {
        present: countPresent(signals),
        total: countTotal(signals),
      },
    },
  };
}

export function recommendCreditAction(input) {
  const trust = clamp01(norm(input?.trustScore));
  const risk = clamp01(norm(input?.riskScore));

  let action = "HOLD";
  if (trust >= 0.78 && risk <= 0.28) action = "EXPAND";
  if (risk >= 0.55 && risk < 0.75) action = "CONTRACT";
  if (trust <= 0.42 || risk >= 0.75) action = "PAUSE";

  const current = safeInt(input?.currentCreditLimit);
  let multiplier = 1;
  if (action === "EXPAND") multiplier = 1.15;
  else if (action === "CONTRACT") multiplier = 0.75;
  else if (action === "PAUSE") multiplier = 0;

  return {
    action,
    currentCreditLimit: current,
    recommendedCreditLimit: Math.max(0, Math.round(current * multiplier)),
    rationale: [`trust=${round2(trust)}`, `risk=${round2(risk)}`, `policy=${action}`],
  };
}

function norm(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? clamp01(n / 100) : clamp01(n);
}

function safeInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

function countTotal(signals) {
  return Object.keys(signals).length;
}

function countPresent(signals) {
  return Object.values(signals).filter((v) => v !== null && v !== undefined).length;
}

function missingPenalty(signals) {
  const total = Math.max(10, countTotal(signals));
  const present = countPresent(signals);
  return clamp01((total - present) / total);
}

function disagreementPenalty(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return clamp01(variance * 2.5);
}

function topFactors(map) {
  return Object.entries(map)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, contribution]) => ({
      key,
      contribution: round2(contribution * 100),
      direction: "increases_risk",
    }));
}

function buildNotes({ fused, confidence, network }) {
  const notes = [];
  if (confidence <= 0.55) notes.push("Low confidence: route to human review (uncertainty handling).");
  if (network >= 0.7) notes.push("Network signals suggest possible ring behavior.");
  if (fused >= 0.82) notes.push("Risk above rejection threshold (policy guardrail).");
  return notes;
}
