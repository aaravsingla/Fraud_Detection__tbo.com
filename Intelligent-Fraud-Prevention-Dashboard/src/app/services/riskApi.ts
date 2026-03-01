import { getJson, postJson } from "./apiClient";

export type RiskDecision = {
  decision: "APPROVE" | "REVIEW" | "REJECT";
  riskScore: number;
  confidence: number;
  subscores: {
    fraud: number;
    chargeback: number;
    credit: number;
    network: number;
  };
  explainability: {
    topFactors: Array<{ key: string; contribution: number; direction: "increases_risk" }>;
    notes: string[];
    signalCoverage?: { present: number; total: number };
  };
};

export type CreditRecommendation = {
  action: "EXPAND" | "HOLD" | "CONTRACT" | "PAUSE";
  currentCreditLimit: number;
  recommendedCreditLimit: number;
  rationale: string[];
};

export type OverrideResponse = {
  ok: boolean;
  override: {
    id: string;
    createdAt: string;
    caseId: string | null;
    bookingId: string | null;
    label: string | null;
    rationale: string;
    meta: Record<string, unknown>;
  };
};

// ── NEW TYPES ─────────────────────────────────────────────────────────────────

export type VelocityCliffResult = {
  cliffDetected: boolean;
  accelerationRatio: number;
  maxAcceleration: number;
  weekOverWeekRatios: number[];
  riskScore: number;
  notes: string[];
};

export type ExitRiskResult = {
  settlementVelocityRatio: number;
  exitRiskScore: number;
  recommendedAction: "MONITOR" | "ENHANCED_MONITORING" | "CONTRACT_CREDIT" | "FREEZE_CREDIT";
  exposureTrend30d: number;
  notes: string[];
};

export type DualStateResult = {
  creditHealth: number;
  identityIntegrity: number;
  quadrant: "TRUSTED" | "IDENTITY_RISK" | "FINANCIAL_RISK" | "DUAL_RISK";
  action: "APPROVE" | "VERIFY_IDENTITY" | "REDUCE_CREDIT" | "PAUSE_EXPOSURE";
  severity: "low" | "medium" | "critical";
  creditSignals: Record<string, number>;
  identitySignals: Record<string, number>;
  reasoning: string;
};

export type BehavioralEntropyResult = {
  entropyScore: number;
  mimicryDetected: boolean;
  riskScore: number;
  components: {
    bookingTimeVariance: number;
    ticketValueDiversity: number;
    cancellationNaturalness: number;
  };
  notes: string[];
};

export type BookingGapResult = {
  avgGap: number;
  longGapRatio: number;
  lastMinuteCancellationRate: number;
  manipulationDetected: boolean;
  riskScore: number;
  notes: string[];
};

export type AgencyRiskProfile = {
  agencyId: string | null;
  compositeAdvancedRisk: number;
  velocity: VelocityCliffResult;
  exitRisk: ExitRiskResult;
  dualState: DualStateResult;
  entropy: BehavioralEntropyResult;
  gapAnalysis: BookingGapResult;
};

// ── EXISTING API CALLS ────────────────────────────────────────────────────────

export function scoreBookingRisk(input: {
  bookingId?: string;
  signals: Record<string, unknown>;
}) {
  return postJson<RiskDecision>("/api/risk/score", input);
}

export function recommendCredit(input: {
  currentCreditLimit: number;
  trustScore: number;
  riskScore: number;
}) {
  return postJson<CreditRecommendation>("/api/credit/recommend", input);
}

export function submitOverride(input: {
  caseId?: string;
  bookingId?: string;
  label: "approve" | "reject";
  rationale: string;
  meta?: Record<string, unknown>;
}) {
  return postJson<OverrideResponse>("/api/review/override", input);
}

export function listOverrides() {
  return getJson<{ ok: boolean; overrides: unknown[] }>("/api/review/overrides");
}

// ── NEW API CALLS ─────────────────────────────────────────────────────────────

export function detectVelocityCliff(input: { weeklyBookings: number[] }) {
  return postJson<VelocityCliffResult>("/api/velocity/cliff", input);
}

export function computeExitRisk(input: {
  unsettledExposure: number;
  avgMonthlySettlement: number;
  exposureTrend30d: number;
}) {
  return postJson<ExitRiskResult>("/api/exposure/exit-risk", input);
}

export function computeDualState(input: {
  creditHealth: number;
  identityIntegrity: number;
  settlementRate?: number;
  utilizationDeviation?: number;
  exposureGrowthRate?: number;
  loginConsistency?: number;
  deviceContinuity?: number;
  behaviorEntropy?: number;
}) {
  return postJson<DualStateResult>("/api/risk/dual-state", input);
}

export function computeBehavioralEntropy(input: {
  bookingTimeVariance: number;
  ticketValueCV: number;
  cancellationRegularity: number;
}) {
  return postJson<BehavioralEntropyResult>("/api/behavior/entropy", input);
}

export function analyzeBookingGaps(input: {
  gapDistribution: number[];
  lastMinuteCancellationRate: number;
}) {
  return postJson<BookingGapResult>("/api/booking/gap-analysis", input);
}

export function fetchAgencyRiskProfile(input: {
  agencyId: string;
  velocity: { weeklyBookings: number[] };
  exposure: { unsettledExposure: number; avgMonthlySettlement: number; exposureTrend30d: number };
  dualState: { creditHealth: number; identityIntegrity: number };
  behavior: { bookingTimeVariance: number; ticketValueCV: number; cancellationRegularity: number };
  gaps: { gapDistribution: number[]; lastMinuteCancellationRate: number };
}) {
  return postJson<AgencyRiskProfile>("/api/agency/risk-profile", input);
}
