// Core type definitions for the fraud prevention system

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type BookingStatus = "pending" | "approved" | "rejected" | "reviewing" | "escalated" | "awaiting_verification";
export type AgentStatus = "idle" | "analyzing" | "complete";
export type AlertSeverity = "info" | "warning" | "critical";

// ── Escalation types ────────────────────────────────────────────────────────
export type EscalationReason = "agent_disagreement" | "low_confidence" | "manual" | "identity_risk";
export type EscalationStatus = "pending" | "assigned" | "resolved";

export interface Escalation {
  id: string;
  bookingId: string;
  reason: EscalationReason;
  agentScores: { agentId: string; agentName: string; score: number }[];
  maxSpread: number;
  assignedTo?: string;
  status: EscalationStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

// ── Step-up verification types ──────────────────────────────────────────────
export type VerificationMethod = "email_otp" | "ivr_call";
export type VerificationStatus = "pending" | "sent" | "verified" | "failed" | "expired";

export interface StepUpVerification {
  id: string;
  bookingId: string;
  method: VerificationMethod;
  target: string;
  status: VerificationStatus;
  requestedBy: string;
  requestedAt: Date;
  verifiedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export interface Booking {
  id: string;
  agencyName: string;
  amount: number;
  destination: string;
  timestamp: Date;
  riskScore: number;
  riskLevel: RiskLevel;
  status: BookingStatus;
  agentAssessments: AgentAssessment[];
  riskFactors: RiskFactor[];
  deviceId?: string;
  ipAddress?: string;
  escalation?: Escalation;
  verification?: StepUpVerification;
}

export interface AgentAssessment {
  agentId: string;
  agentName: string;
  agentType: "financial" | "behavioral" | "network" | "benchmark";
  riskScore: number;
  confidence: number;
  reasoning: string;
  status: AgentStatus;
  factors: string[];
}

export interface RiskFactor {
  name: string;
  contribution: number;
  value: string;
  description: string;
}

export interface NetworkNode {
  id: string;
  name: string;
  trustLevel: number;
  transactionVolume: number;
  type: "agency" | "device" | "ip";
  connections: string[];
  isFraudulent: boolean;
}

export interface TrustScoreDataPoint {
  date: Date;
  score: number;
  event?: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: Date;
  relatedBookingId?: string;
  actionRequired: boolean;
  escalationId?: string;
  verificationType?: VerificationMethod;
}

export interface KPI {
  label: string;
  value: string | number;
  trend?: number;
  icon: string;
}
