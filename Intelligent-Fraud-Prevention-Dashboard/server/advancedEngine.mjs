/**
 * Advanced Risk Signals Engine
 * Implements: Velocity Cliff Detection, Exit Risk, Dual-State Matrix,
 * Behavioral Entropy, Booking-to-Travel Gap, Refund Destination Analysis
 */

// ─── Velocity Cliff Detection ─────────────────────────────────────────────────
export function detectVelocityCliff(input) {
  const weeks = input?.weeklyBookings ?? [];
  if (weeks.length < 3) {
    return {
      cliffDetected: false,
      accelerationRatio: 0,
      weekOverWeekRatios: [],
      riskScore: 0,
      notes: ["Insufficient data for velocity analysis."],
    };
  }

  const ratios = [];
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1] || 1;
    ratios.push(round2(weeks[i] / prev));
  }

  const maxRatio = Math.max(...ratios);
  const latestRatio = ratios[ratios.length - 1];
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

  // Cliff = exponential acceleration, not just high volume
  const cliffDetected = latestRatio >= 2.5 || maxRatio >= 3.0;
  const riskScore = clamp01(
    0.5 * normalize(latestRatio, 0, 5) +
    0.3 * normalize(maxRatio, 0, 5) +
    0.2 * normalize(avgRatio, 0, 3)
  );

  const notes = [];
  if (cliffDetected) notes.push(`Velocity acceleration ${latestRatio}x WoW — bust-out precursor pattern detected.`);
  if (maxRatio >= 3.0) notes.push(`Peak acceleration ${maxRatio}x exceeds critical threshold.`);

  return {
    cliffDetected,
    accelerationRatio: round2(latestRatio),
    maxAcceleration: round2(maxRatio),
    weekOverWeekRatios: ratios,
    riskScore: round2(riskScore * 100),
    notes,
  };
}

// ─── Exit Risk / Exposure Window ──────────────────────────────────────────────
export function computeExitRisk(input) {
  const unsettledExposure = safeNum(input?.unsettledExposure);
  const avgMonthlySettlement = safeNum(input?.avgMonthlySettlement) || 1;
  const trend30d = safeNum(input?.exposureTrend30d); // % change

  const settlementVelocityRatio = unsettledExposure / avgMonthlySettlement;
  const exitRiskScore = clamp01(
    0.55 * normalize(settlementVelocityRatio, 0, 4) +
    0.3 * normalize(Math.max(0, trend30d), 0, 300) +
    0.15 * (settlementVelocityRatio > 3 ? 1 : 0)
  );

  let action = "MONITOR";
  if (exitRiskScore >= 0.75) action = "FREEZE_CREDIT";
  else if (exitRiskScore >= 0.5) action = "CONTRACT_CREDIT";
  else if (exitRiskScore >= 0.3) action = "ENHANCED_MONITORING";

  const notes = [];
  if (settlementVelocityRatio > 2) notes.push(`Unsettled exposure is ${round2(settlementVelocityRatio)}x monthly settlement — unstable.`);
  if (trend30d > 100) notes.push(`Exposure grew ${round2(trend30d)}% in 30 days.`);

  return {
    settlementVelocityRatio: round2(settlementVelocityRatio),
    exitRiskScore: round2(exitRiskScore * 100),
    recommendedAction: action,
    exposureTrend30d: round2(trend30d),
    notes,
  };
}

// ─── Dual-State Risk Matrix ───────────────────────────────────────────────────
export function computeDualStateMatrix(input) {
  const creditHealth = clamp01(safeNum(input?.creditHealth) / 100);
  const identityIntegrity = clamp01(safeNum(input?.identityIntegrity) / 100);

  // Quadrant logic
  let quadrant, action, severity;
  if (creditHealth >= 0.6 && identityIntegrity >= 0.6) {
    quadrant = "TRUSTED";
    action = "APPROVE";
    severity = "low";
  } else if (creditHealth >= 0.6 && identityIntegrity < 0.6) {
    quadrant = "IDENTITY_RISK";
    action = "VERIFY_IDENTITY";
    severity = "medium";
  } else if (creditHealth < 0.6 && identityIntegrity >= 0.6) {
    quadrant = "FINANCIAL_RISK";
    action = "REDUCE_CREDIT";
    severity = "medium";
  } else {
    quadrant = "DUAL_RISK";
    action = "PAUSE_EXPOSURE";
    severity = "critical";
  }

  // Sub-scores for each dimension
  const creditSignals = {
    settlementHistory: clamp01(safeNum(input?.settlementRate) / 100),
    utilizationRhythm: 1 - clamp01(safeNum(input?.utilizationDeviation) / 100),
    exposureStability: clamp01(1 - safeNum(input?.exposureGrowthRate) / 200),
  };

  const identitySignals = {
    loginConsistency: clamp01(safeNum(input?.loginConsistency) / 100),
    deviceContinuity: clamp01(safeNum(input?.deviceContinuity) / 100),
    behaviorEntropy: clamp01(safeNum(input?.behaviorEntropy) / 100),
  };

  return {
    creditHealth: round2(creditHealth * 100),
    identityIntegrity: round2(identityIntegrity * 100),
    quadrant,
    action,
    severity,
    creditSignals,
    identitySignals,
    reasoning: buildDualStateReasoning(quadrant, creditHealth, identityIntegrity),
  };
}

// ─── Behavioral Entropy Analysis ─────────────────────────────────────────────
export function computeBehavioralEntropy(input) {
  const bookingTimeVariance = safeNum(input?.bookingTimeVariance); // 0–1, higher = more natural
  const ticketValueCV = safeNum(input?.ticketValueCV); // coefficient of variation
  const cancellationRegularity = safeNum(input?.cancellationRegularity); // 0–1, higher = more scripted

  // Low entropy = scripted/automated behavior = fraud signal
  const entropyScore = clamp01(
    0.4 * bookingTimeVariance +
    0.35 * Math.min(1, ticketValueCV / 0.5) +
    0.25 * (1 - cancellationRegularity)
  );

  const mimicryDetected = entropyScore < 0.3;
  const riskScore = clamp01(1 - entropyScore);

  const notes = [];
  if (bookingTimeVariance < 0.2) notes.push("Booking times are suspiciously uniform — possible scripted behavior.");
  if (ticketValueCV < 0.1) notes.push("Ticket values show near-zero variation — automated booking pattern.");
  if (cancellationRegularity > 0.8) notes.push("Cancellation pattern is artificially regular.");

  return {
    entropyScore: round2(entropyScore * 100),
    mimicryDetected,
    riskScore: round2(riskScore * 100),
    components: {
      bookingTimeVariance: round2(bookingTimeVariance * 100),
      ticketValueDiversity: round2(Math.min(1, ticketValueCV / 0.5) * 100),
      cancellationNaturalness: round2((1 - cancellationRegularity) * 100),
    },
    notes,
  };
}

// ─── Booking-to-Travel Gap Analysis ──────────────────────────────────────────
export function analyzeBookingGaps(input) {
  const gaps = input?.gapDistribution ?? []; // array of days
  const cancellationRate = clamp01(safeNum(input?.lastMinuteCancellationRate));

  if (gaps.length === 0) {
    return { avgGap: 0, longGapRatio: 0, manipulationDetected: false, riskScore: 0, notes: [] };
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const longGaps = gaps.filter((g) => g > 90).length;
  const longGapRatio = longGaps / gaps.length;

  // Pattern: consistently far-future bookings + high last-minute cancellations = manipulation
  const manipulationDetected = longGapRatio > 0.6 && cancellationRate > 0.3;
  const riskScore = clamp01(
    0.5 * normalize(longGapRatio, 0, 1) +
    0.3 * cancellationRate +
    0.2 * (manipulationDetected ? 1 : 0)
  );

  const notes = [];
  if (manipulationDetected) notes.push(`${Math.round(longGapRatio * 100)}% of bookings are 90+ days out with ${Math.round(cancellationRate * 100)}% late cancellation — settlement delay pattern.`);

  return {
    avgGap: round2(avgGap),
    longGapRatio: round2(longGapRatio * 100),
    lastMinuteCancellationRate: round2(cancellationRate * 100),
    manipulationDetected,
    riskScore: round2(riskScore * 100),
    notes,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function round2(x) { return Math.round(x * 100) / 100; }
function safeNum(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function normalize(v, min, max) { return clamp01((v - min) / (max - min)); }

function buildDualStateReasoning(quadrant, credit, identity) {
  const c = Math.round(credit * 100);
  const i = Math.round(identity * 100);
  switch (quadrant) {
    case "TRUSTED": return `Credit health (${c}) and identity integrity (${i}) both strong. Full credit available.`;
    case "IDENTITY_RISK": return `Credit health (${c}) is solid but identity integrity (${i}) is compromised. Step-up verification required before approving.`;
    case "FINANCIAL_RISK": return `Identity integrity (${i}) confirmed but credit health (${c}) is weak. Reduce exposure limit to manage default risk.`;
    case "DUAL_RISK": return `Both credit health (${c}) and identity integrity (${i}) are below threshold. Pause all exposure until resolution.`;
    default: return "";
  }
}
