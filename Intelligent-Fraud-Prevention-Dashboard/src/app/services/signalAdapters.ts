import type { Booking, RiskFactor } from "../types";

const FACTOR_TO_SIGNAL: Record<string, string> = {
  "Shared Device Detection": "sharedDeviceGraphRisk",
  "IP Reputation": "ipReputationRisk",
  "Unusual Booking Time": "geoVelocityRisk",
  "Transaction Size Anomaly": "deviceRisk",
  "Price Benchmark Deviation": "bookingVelocityRisk",
  "New Destination": "geoVelocityRisk",
  "Price Elevation": "bookingVelocityRisk",
  "Activity Increase": "bookingVelocityRisk",
};

export function signalsFromBooking(booking: Booking): Record<string, number> {
  const base: Record<string, number> = {
    deviceRisk: 0,
    ipReputationRisk: 0,
    geoVelocityRisk: 0,
    sharedPaymentInstrumentRisk: 0,
    historicalChargebackRateRisk: 0,
    cancellationSpikeRisk: 0,
    bookingVelocityRisk: 0,
    disputeTextAnomalyRisk: 0,
    creditUtilizationRisk: 0,
    outstandingExposureRisk: 0,
    agencyAgeRisk: 0,
    ringConnectivityRisk: 0,
    sharedDeviceGraphRisk: 0,
  };

  for (const factor of booking.riskFactors ?? []) {
    const key = FACTOR_TO_SIGNAL[factor.name];
    if (!key) continue;
    // Map contribution points to 0..1 risk-ish (synthetic)
    const risk = contributionToRisk(factor);
    base[key] = clamp01(Math.max(base[key] ?? 0, risk));
  }

  // Add a mild credit component based on booking amount (synthetic)
  base.outstandingExposureRisk = clamp01(booking.amount / 700000);
  base.creditUtilizationRisk = clamp01(booking.amount / 900000);

  // Network: if "Shared Device Detection" exists, boost ring connectivity
  if (booking.riskFactors?.some((f) => f.name === "Shared Device Detection")) {
    base.ringConnectivityRisk = clamp01(Math.max(base.ringConnectivityRisk, 0.8));
  }

  // Agency age proxy: treat lower risk for older/approved patterns
  base.agencyAgeRisk = 0.35;
  if (booking.riskLevel === "low") base.agencyAgeRisk = 0.1;
  else if (booking.riskLevel === "high") base.agencyAgeRisk = 0.6;

  return base;
}

function contributionToRisk(f: RiskFactor) {
  const c = Number(f.contribution);
  if (!Number.isFinite(c)) return 0;
  // Positive contributions increase risk; negative reduce. For risk model, treat negatives as 0.
  return c <= 0 ? 0 : clamp01(c / 50);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
