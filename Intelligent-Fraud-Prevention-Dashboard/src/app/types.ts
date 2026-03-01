// Core type definitions for the fraud prevention system

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type BookingStatus = "pending" | "approved" | "rejected" | "reviewing";
export type AgentStatus = "idle" | "analyzing" | "complete";
export type AlertSeverity = "info" | "warning" | "critical";

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
}

export interface KPI {
  label: string;
  value: string | number;
  trend?: number;
  icon: string;
}
