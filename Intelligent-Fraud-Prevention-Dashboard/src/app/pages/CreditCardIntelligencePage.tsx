import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Agency {
  id: string;
  name: string;
  creditLimit: number;
  utilization: number;
  unsettledExposure: number;
  avgSettlement30d: number;
  settlementVelocity: number;
  exposureStabilityDt: number;
  partialSettlementRatio: number;
  settlementDelayDrift: number;
  bookingToSettlementGap: number;
  cardTestingScore: number;
  binCountryMismatch: number;
  passengerCardholderMatch: number;
  cvvFailureRate: number;
  avsScore: number;
  txAmountDeviation: number;
  cardsPerAccount: number;
  cardsPerDevice: number;
  txPerMinute: number;
  rapidPaymentAttempts: number;
  creditCyclingFlag: boolean;
  partialPaymentGamingFlag: boolean;
  creditLimitProbingFlag: boolean;
  dormancyRisk: number;
  creditHealthScore: number;
  paymentFraudScore: number;
  velocityRiskScore: number;
  action: "APPROVE" | "VERIFY" | "REDUCE" | "FREEZE";
  trend: number[];
  exposureTrend: number[];
  settlementHistory: { week: string; settled: number; due: number }[];
  cardActivity: { day: string; attempts: number; failures: number; flagged: number }[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const AGENCIES: Agency[] = [
  {
    id: "AG-001", name: "Wanderlust Travels",
    creditLimit: 500000, utilization: 0.91, unsettledExposure: 455000, avgSettlement30d: 120000,
    settlementVelocity: 0.28, exposureStabilityDt: 4.2, partialSettlementRatio: 0.52,
    settlementDelayDrift: 18, bookingToSettlementGap: 142,
    cardTestingScore: 0.82, binCountryMismatch: 0.71, passengerCardholderMatch: 0.34,
    cvvFailureRate: 0.19, avsScore: 0.41, txAmountDeviation: 3.8,
    cardsPerAccount: 12, cardsPerDevice: 8, txPerMinute: 4.2, rapidPaymentAttempts: 9,
    creditCyclingFlag: true, partialPaymentGamingFlag: true, creditLimitProbingFlag: true,
    dormancyRisk: 0, creditHealthScore: 18, paymentFraudScore: 84, velocityRiskScore: 79,
    action: "FREEZE",
    trend: [60, 68, 74, 80, 85, 89, 91],
    exposureTrend: [180000, 220000, 290000, 340000, 390000, 425000, 455000],
    settlementHistory: [
      { week: "W-6", settled: 110000, due: 120000 },
      { week: "W-5", settled: 95000, due: 130000 },
      { week: "W-4", settled: 60000, due: 140000 },
      { week: "W-3", settled: 55000, due: 150000 },
      { week: "W-2", settled: 50000, due: 160000 },
      { week: "W-1", settled: 40000, due: 170000 },
    ],
    cardActivity: [
      { day: "Mon", attempts: 24, failures: 5, flagged: 3 },
      { day: "Tue", attempts: 31, failures: 9, flagged: 7 },
      { day: "Wed", attempts: 18, failures: 4, flagged: 2 },
      { day: "Thu", attempts: 42, failures: 14, flagged: 12 },
      { day: "Fri", attempts: 58, failures: 22, flagged: 19 },
      { day: "Sat", attempts: 11, failures: 2, flagged: 1 },
      { day: "Sun", attempts: 8, failures: 1, flagged: 0 },
    ],
  },
  {
    id: "AG-002", name: "Horizon Bookings",
    creditLimit: 300000, utilization: 0.67, unsettledExposure: 201000, avgSettlement30d: 95000,
    settlementVelocity: 0.62, exposureStabilityDt: 1.4, partialSettlementRatio: 0.78,
    settlementDelayDrift: 5, bookingToSettlementGap: 62,
    cardTestingScore: 0.18, binCountryMismatch: 0.22, passengerCardholderMatch: 0.87,
    cvvFailureRate: 0.03, avsScore: 0.88, txAmountDeviation: 0.9,
    cardsPerAccount: 2, cardsPerDevice: 1, txPerMinute: 0.6, rapidPaymentAttempts: 1,
    creditCyclingFlag: false, partialPaymentGamingFlag: false, creditLimitProbingFlag: false,
    dormancyRisk: 0, creditHealthScore: 74, paymentFraudScore: 12, velocityRiskScore: 8,
    action: "APPROVE",
    trend: [58, 60, 62, 63, 65, 66, 67],
    exposureTrend: [160000, 170000, 180000, 185000, 190000, 196000, 201000],
    settlementHistory: [
      { week: "W-6", settled: 92000, due: 95000 },
      { week: "W-5", settled: 94000, due: 95000 },
      { week: "W-4", settled: 91000, due: 93000 },
      { week: "W-3", settled: 96000, due: 97000 },
      { week: "W-2", settled: 93000, due: 95000 },
      { week: "W-1", settled: 95000, due: 96000 },
    ],
    cardActivity: [
      { day: "Mon", attempts: 8, failures: 0, flagged: 0 },
      { day: "Tue", attempts: 11, failures: 1, flagged: 0 },
      { day: "Wed", attempts: 9, failures: 0, flagged: 0 },
      { day: "Thu", attempts: 12, failures: 1, flagged: 0 },
      { day: "Fri", attempts: 10, failures: 0, flagged: 0 },
      { day: "Sat", attempts: 4, failures: 0, flagged: 0 },
      { day: "Sun", attempts: 3, failures: 0, flagged: 0 },
    ],
  },
  {
    id: "AG-003", name: "SwiftRoute Agency",
    creditLimit: 200000, utilization: 0.55, unsettledExposure: 110000, avgSettlement30d: 72000,
    settlementVelocity: 0.48, exposureStabilityDt: 2.1, partialSettlementRatio: 0.61,
    settlementDelayDrift: 9, bookingToSettlementGap: 88,
    cardTestingScore: 0.44, binCountryMismatch: 0.38, passengerCardholderMatch: 0.61,
    cvvFailureRate: 0.08, avsScore: 0.69, txAmountDeviation: 2.1,
    cardsPerAccount: 5, cardsPerDevice: 3, txPerMinute: 1.8, rapidPaymentAttempts: 4,
    creditCyclingFlag: false, partialPaymentGamingFlag: true, creditLimitProbingFlag: false,
    dormancyRisk: 0.2, creditHealthScore: 52, paymentFraudScore: 41, velocityRiskScore: 35,
    action: "VERIFY",
    trend: [40, 44, 47, 50, 52, 54, 55],
    exposureTrend: [80000, 88000, 94000, 100000, 104000, 107000, 110000],
    settlementHistory: [
      { week: "W-6", settled: 68000, due: 72000 },
      { week: "W-5", settled: 71000, due: 74000 },
      { week: "W-4", settled: 65000, due: 73000 },
      { week: "W-3", settled: 69000, due: 74000 },
      { week: "W-2", settled: 66000, due: 72000 },
      { week: "W-1", settled: 62000, due: 73000 },
    ],
    cardActivity: [
      { day: "Mon", attempts: 14, failures: 2, flagged: 1 },
      { day: "Tue", attempts: 18, failures: 3, flagged: 2 },
      { day: "Wed", attempts: 12, failures: 2, flagged: 1 },
      { day: "Thu", attempts: 22, failures: 5, flagged: 3 },
      { day: "Fri", attempts: 19, failures: 4, flagged: 3 },
      { day: "Sat", attempts: 7, failures: 1, flagged: 0 },
      { day: "Sun", attempts: 5, failures: 0, flagged: 0 },
    ],
  },
  {
    id: "AG-004", name: "TravelBridge Corp",
    creditLimit: 400000, utilization: 0.78, unsettledExposure: 312000, avgSettlement30d: 85000,
    settlementVelocity: 0.39, exposureStabilityDt: 3.1, partialSettlementRatio: 0.55,
    settlementDelayDrift: 13, bookingToSettlementGap: 115,
    cardTestingScore: 0.61, binCountryMismatch: 0.52, passengerCardholderMatch: 0.48,
    cvvFailureRate: 0.12, avsScore: 0.55, txAmountDeviation: 2.9,
    cardsPerAccount: 7, cardsPerDevice: 5, txPerMinute: 2.9, rapidPaymentAttempts: 6,
    creditCyclingFlag: true, partialPaymentGamingFlag: false, creditLimitProbingFlag: true,
    dormancyRisk: 0.1, creditHealthScore: 34, paymentFraudScore: 63, velocityRiskScore: 58,
    action: "REDUCE",
    trend: [52, 58, 63, 68, 72, 75, 78],
    exposureTrend: [200000, 225000, 250000, 270000, 285000, 300000, 312000],
    settlementHistory: [
      { week: "W-6", settled: 80000, due: 88000 },
      { week: "W-5", settled: 76000, due: 87000 },
      { week: "W-4", settled: 72000, due: 86000 },
      { week: "W-3", settled: 70000, due: 87000 },
      { week: "W-2", settled: 68000, due: 86000 },
      { week: "W-1", settled: 65000, due: 87000 },
    ],
    cardActivity: [
      { day: "Mon", attempts: 19, failures: 4, flagged: 3 },
      { day: "Tue", attempts: 24, failures: 7, flagged: 5 },
      { day: "Wed", attempts: 16, failures: 3, flagged: 2 },
      { day: "Thu", attempts: 28, failures: 8, flagged: 6 },
      { day: "Fri", attempts: 35, failures: 11, flagged: 9 },
      { day: "Sat", attempts: 9, failures: 2, flagged: 1 },
      { day: "Sun", attempts: 6, failures: 1, flagged: 0 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const actionColors: Record<string, string> = {
  APPROVE: "#2E7D32", VERIFY: "#F57C00", REDUCE: "#FF6600", FREEZE: "#C62828",
};
const actionBg: Record<string, string> = {
  APPROVE: "#f0fdf4", VERIFY: "#fff7ed", REDUCE: "#fff4ed", FREEZE: "#fef2f2",
};
const actionBorder: Record<string, string> = {
  APPROVE: "#bbf7d0", VERIFY: "#fed7aa", REDUCE: "#ffcfb3", FREEZE: "#fecaca",
};
const actionIcons: Record<string, string> = {
  APPROVE: "✓", VERIFY: "⚠", REDUCE: "↓", FREEZE: "⛔",
};

function riskColor(v: number) {
  if (v >= 70) return "#C62828";
  if (v >= 45) return "#FF6600";
  if (v >= 25) return "#F57C00";
  return "#2E7D32";
}

function scoreLabel(v: number) {
  if (v >= 70) return "CRITICAL";
  if (v >= 45) return "HIGH";
  if (v >= 25) return "MEDIUM";
  return "LOW";
}

function calcExitRisk(a: Agency) {
  return Math.min((a.unsettledExposure / a.avgSettlement30d).toFixed(2) as unknown as number, 9.99);
}

function calcRDS(a: Agency) {
  const mu = 0.55, sigma = 0.15;
  return ((a.utilization - mu) / sigma).toFixed(2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GaugeArc({ value, max = 100, color, size = 72 }: {
  value: number; max?: number; color: string; size?: number;
}) {
  const pct = Math.min(value / max, 1);
  const r = size / 2 - 6;
  const circ = Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
      <path
        d={`M 6 ${size / 2} A ${r} ${r} 0 0 1 ${size - 6} ${size / 2}`}
        fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round"
      />
      <path
        d={`M 6 ${size / 2} A ${r} ${r} 0 0 1 ${size - 6} ${size / 2}`}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
    </svg>
  );
}

function MetricChip({ label, value, flag }: { label: string; value: string | number; flag?: boolean }) {
  return (
    <div className={`rounded-lg p-2 border flex flex-col gap-0.5 ${flag ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
      <span className={`text-[9px] uppercase tracking-widest font-medium ${flag ? "text-red-500" : "text-gray-400"}`}>{label}</span>
      <span className={`text-sm font-semibold font-mono ${flag ? "text-red-600" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}

function SignalBar({ label, value, threshold = 0.5, invert = false }: {
  label: string; value: number; threshold?: number; invert?: boolean;
}) {
  const isFlag = invert ? value < threshold : value > threshold;
  const color = isFlag ? riskColor(value * 100) : "#2E7D32";
  const pct = Math.min(value * 100, 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-mono" style={{ color: isFlag ? color : "#6b7280" }}>
          {(value * 100).toFixed(0)}% {isFlag && "⚑"}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function FlagBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
      active ? "bg-red-50 border-red-200 text-red-600" : "bg-green-50 border-green-200 text-green-700"
    }`}>
      <span>{active ? "⚑" : "✓"}</span>{label}
    </span>
  );
}

function FormulaCard({ title, formula, description }: { title: string; formula: string; description: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-semibold text-[#003366] mb-2 tracking-wide">{title}</div>
      <div className="font-mono text-xs text-blue-700 bg-blue-50 border-l-2 border-blue-400 px-3 py-2 rounded mb-2 overflow-x-auto whitespace-nowrap">
        {formula}
      </div>
      <div className="text-xs text-gray-500 leading-relaxed">{description}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreditCardIntelligencePage() {
  const [selectedId, setSelectedId] = useState("AG-001");
  const [activeTab, setActiveTab] = useState<"overview" | "payment" | "velocity" | "formulas">("overview");
  const [animKey, setAnimKey] = useState(0);

  const agency = AGENCIES.find(a => a.id === selectedId)!;

  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [selectedId]);

  const exitRisk = calcExitRisk(agency);
  const rds = calcRDS(agency);

  const radarData = [
    { axis: "Credit Health", value: agency.creditHealthScore },
    { axis: "Payment Fraud", value: agency.paymentFraudScore },
    { axis: "Velocity Risk", value: agency.velocityRiskScore },
    { axis: "Utilization", value: agency.utilization * 100 },
    { axis: "Settlement", value: (1 - agency.settlementVelocity) * 100 },
    { axis: "Card Testing", value: agency.cardTestingScore * 100 },
  ];

  const utilizationTrend = agency.trend.map((v, i) => ({
    t: `W-${6 - i}`, utilization: v, threshold: 80
  }));

  const TABS = [
    { key: "overview", label: "⬡ Credit Overview" },
    { key: "payment", label: "💳 Payment Signals" },
    { key: "velocity", label: "⚡ Velocity & Cards" },
    { key: "formulas", label: "∑ Formulas" },
  ] as const;

  return (
    <div className="p-6 max-w-[1440px] mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #7c3aed)" }}>
              💳
            </div>
            <h1 className="text-2xl font-semibold text-[#003366]">
              Credit & Card Intelligence
            </h1>
          </div>
          <p className="text-xs text-gray-400 tracking-widest uppercase">
            Payment Fraud · Credit Exposure · Velocity Monitoring · Settlement Analysis
          </p>
        </div>
        <div className="flex gap-3">
          {[
            { label: "TOTAL EXPOSURE", value: "₹10.78L", sub: "across 4 agencies" },
            { label: "CRITICAL FLAGS", value: "3", sub: "agencies flagged" },
            { label: "AVG CARD RISK", value: "49.5", sub: "fraud score" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-right min-w-[130px]">
              <div className="text-[9px] text-gray-400 tracking-widest uppercase mb-1">{s.label}</div>
              <div className="font-mono text-lg font-bold text-[#003366]">{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Agency Selector Table ── */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden">
        <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50">
          <span className="text-[10px] text-gray-400 tracking-widest uppercase font-medium">Select Agency</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {["Agency", "Credit Limit", "Utilization", "Unsettled Exposure", "Exit Risk", "Card Fraud Score", "Velocity Risk", "Decision"].map(h => (
                  <th key={h} className="px-4 py-2 text-[10px] text-gray-400 font-medium tracking-widest text-left uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENCIES.map(a => {
                const er = calcExitRisk(a);
                const isSelected = a.id === selectedId;
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className="border-b border-gray-50 cursor-pointer transition-colors hover:bg-blue-50/40"
                    style={{
                      background: isSelected ? "#eff6ff" : "transparent",
                      borderLeft: `3px solid ${isSelected ? "#3b82f6" : "transparent"}`,
                    }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-sm font-semibold" style={{ color: isSelected ? "#1d4ed8" : "#1f2937" }}>{a.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{a.id}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">₹{(a.creditLimit / 100000).toFixed(1)}L</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${a.utilization * 100}%`, background: riskColor(a.utilization * 100) }} />
                        </div>
                        <span className="text-xs font-mono" style={{ color: riskColor(a.utilization * 100) }}>{(a.utilization * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: a.unsettledExposure > 300000 ? "#C62828" : "#6b7280" }}>
                      ₹{(a.unsettledExposure / 100000).toFixed(1)}L
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-sm font-semibold" style={{ color: (er as number) > 3 ? "#C62828" : (er as number) > 1.5 ? "#F57C00" : "#2E7D32" }}>
                        {er}×
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-sm font-semibold" style={{ color: riskColor(a.paymentFraudScore) }}>{a.paymentFraudScore}</span>
                      <span className="text-[9px] text-gray-400 ml-1">{scoreLabel(a.paymentFraudScore)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-sm font-semibold" style={{ color: riskColor(a.velocityRiskScore) }}>{a.velocityRiskScore}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ background: actionBg[a.action], color: actionColors[a.action], borderColor: actionBorder[a.action] }}>
                        {actionIcons[a.action]} {a.action}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Panel ── */}
      <div key={animKey}>
        {/* Agency Header */}
        <div className="flex items-center justify-between mb-5 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border"
              style={{ background: actionBg[agency.action], borderColor: actionBorder[agency.action] }}>
              {actionIcons[agency.action]}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#003366]">{agency.name}</h2>
              <div className="text-xs text-gray-400 mt-0.5">
                {agency.id} · Credit Limit: ₹{(agency.creditLimit / 100000).toFixed(1)}L · Exit Risk: {exitRisk}× · RDS: {rds}σ
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <FlagBadge active={agency.creditCyclingFlag} label="CREDIT CYCLING" />
            <FlagBadge active={agency.partialPaymentGamingFlag} label="PARTIAL PMT GAMING" />
            <FlagBadge active={agency.creditLimitProbingFlag} label="LIMIT PROBING" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 rounded-lg border text-xs font-semibold tracking-wide transition-colors cursor-pointer uppercase"
              style={{
                background: activeTab === t.key ? "#eff6ff" : "#ffffff",
                borderColor: activeTab === t.key ? "#93c5fd" : "#e5e7eb",
                color: activeTab === t.key ? "#1d4ed8" : "#6b7280",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-5">

            {/* Credit Health Score */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Credit Health Score</div>
              <div className="flex flex-col items-center">
                <GaugeArc value={agency.creditHealthScore} color={riskColor(100 - agency.creditHealthScore)} size={120} />
                <div className="font-mono text-4xl font-bold mt-[-6px]" style={{ color: riskColor(100 - agency.creditHealthScore) }}>
                  {agency.creditHealthScore}
                </div>
                <div className="text-xs text-gray-500 text-center mt-1">
                  {agency.creditHealthScore < 35 ? "CRITICAL — Credit contraction recommended" :
                    agency.creditHealthScore < 55 ? "ELEVATED — Enhanced monitoring" :
                      agency.creditHealthScore < 75 ? "MODERATE — Standard monitoring" : "HEALTHY — Normal operations"}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricChip label="Exit Risk" value={`${exitRisk}×`} flag={(exitRisk as number) > 3} />
                <MetricChip label="RDS (σ)" value={rds} flag={parseFloat(rds as string) > 1.5} />
                <MetricChip label="Settlement V" value={`${(agency.settlementVelocity * 100).toFixed(0)}%`} flag={agency.settlementVelocity < 0.4} />
                <MetricChip label="Delay Drift" value={`+${agency.settlementDelayDrift}d`} flag={agency.settlementDelayDrift > 10} />
              </div>
            </div>

            {/* Settlement History */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 col-span-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Settlement vs Due — 6-Week History</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={agency.settlementHistory} barGap={4}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`₹${(v / 1000).toFixed(0)}k`, ""]}
                  />
                  <Bar dataKey="due" fill="#e5e7eb" radius={[3, 3, 0, 0]} name="Amount Due" />
                  <Bar dataKey="settled" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Settled" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <MetricChip label="Partial Ratio" value={`${(agency.partialSettlementRatio * 100).toFixed(0)}%`} flag={agency.partialSettlementRatio < 0.6} />
                <MetricChip label="B→S Gap" value={`${agency.bookingToSettlementGap}d`} flag={agency.bookingToSettlementGap > 90} />
                <MetricChip label="Exposure dE/dt" value={`${agency.exposureStabilityDt}x/wk`} flag={agency.exposureStabilityDt > 2} />
                <MetricChip label="Utilization" value={`${(agency.utilization * 100).toFixed(0)}%`} flag={agency.utilization > 0.8} />
              </div>
            </div>

            {/* Exposure Trend */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 col-span-2">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Unsettled Exposure Trajectory</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={agency.exposureTrend.map((v, i) => ({ t: `W-${6 - i}`, exposure: v }))}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`₹${(v / 1000).toFixed(0)}k`, "Exposure"]} />
                  <ReferenceLine y={agency.creditLimit * 0.8} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "80% limit", fill: "#f59e0b", fontSize: 9 }} />
                  <Area dataKey="exposure" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} dot={{ fill: "#ef4444", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Radar */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Multi-Signal Risk Radar</div>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                  <Radar dataKey="value" stroke={actionColors[agency.action]} fill={actionColors[agency.action]} fillOpacity={0.15} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── TAB: Payment Signals ── */}
        {activeTab === "payment" && (
          <div className="grid grid-cols-2 gap-5">

            {/* Card Fraud Signals */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Payment Fraud Signals</div>
              <div className="flex flex-col gap-3.5">
                <SignalBar label="Card Testing Pattern Score" value={agency.cardTestingScore} threshold={0.4} />
                <SignalBar label="BIN Country vs IP Mismatch" value={agency.binCountryMismatch} threshold={0.3} />
                <SignalBar label="Passenger ↔ Cardholder Match" value={agency.passengerCardholderMatch} threshold={0.5} invert />
                <SignalBar label="CVV Failure Rate" value={agency.cvvFailureRate} threshold={0.05} />
                <SignalBar label="AVS (Billing Address) Score" value={agency.avsScore} threshold={0.5} invert />
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Tx Amount vs User History (σ)</span>
                    <span className="text-xs font-mono" style={{ color: agency.txAmountDeviation > 2 ? "#C62828" : "#6b7280" }}>
                      {agency.txAmountDeviation}σ {agency.txAmountDeviation > 2 && "⚑"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(agency.txAmountDeviation / 5 * 100, 100)}%`, background: agency.txAmountDeviation > 2 ? "#C62828" : "#2E7D32" }} />
                  </div>
                </div>
              </div>
              <div className="mt-5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Composite Payment Fraud Score</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold" style={{ color: riskColor(agency.paymentFraudScore) }}>{agency.paymentFraudScore}</span>
                  <span className="text-sm font-semibold" style={{ color: riskColor(agency.paymentFraudScore) }}>{scoreLabel(agency.paymentFraudScore)}</span>
                </div>
              </div>
            </div>

            {/* Card Activity */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">
                Card Activity — Attempts / Failures / Flagged (7-Day)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={agency.cardActivity} barGap={2}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="attempts" fill="#93c5fd" radius={[3, 3, 0, 0]} name="Attempts" />
                  <Bar dataKey="failures" fill="#fbbf24" radius={[3, 3, 0, 0]} name="Failures" />
                  <Bar dataKey="flagged" fill="#ef4444" radius={[3, 3, 0, 0]} name="Flagged" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex gap-4">
                {[{ color: "#93c5fd", label: "Attempts" }, { color: "#fbbf24", label: "Failures" }, { color: "#ef4444", label: "Flagged" }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                    <span className="text-xs text-gray-500">{l.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2.5">Fraud Patterns Detected</div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: "Stolen Credit Card Usage", active: agency.cardTestingScore > 0.5 },
                    { label: "Card Testing Attack", active: agency.cardTestingScore > 0.6 },
                    { label: "Payment Fraud / Unauthorized Tx", active: agency.binCountryMismatch > 0.5 },
                    { label: "Chargeback Risk", active: agency.cvvFailureRate > 0.08 },
                    { label: "BIN Country Spoofing", active: agency.binCountryMismatch > 0.6 },
                    { label: "Identity Mismatch (Passenger/Card)", active: agency.passengerCardholderMatch < 0.5 },
                  ].map(p => (
                    <div key={p.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${
                      p.active ? "bg-red-50 border-red-100 text-red-600" : "bg-gray-50 border-gray-100 text-gray-400"
                    }`}>
                      <span>{p.active ? "⚑" : "✓"}</span>
                      <span>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Velocity & Cards ── */}
        {activeTab === "velocity" && (
          <div className="grid grid-cols-2 gap-5">

            {/* Velocity Metrics */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Velocity & Temporal Signals</div>
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <MetricChip label="Tx per Minute" value={agency.txPerMinute.toFixed(1)} flag={agency.txPerMinute > 2} />
                <MetricChip label="Rapid Payment Attempts" value={agency.rapidPaymentAttempts} flag={agency.rapidPaymentAttempts > 5} />
                <MetricChip label="Cards / Account" value={agency.cardsPerAccount} flag={agency.cardsPerAccount > 4} />
                <MetricChip label="Cards / Device" value={agency.cardsPerDevice} flag={agency.cardsPerDevice > 3} />
              </div>

              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2.5">Velocity Cliff Detection</div>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Booking Velocity Ratio (Bwn/Bwn-1)", value: agency.velocityRiskScore / 33, threshold: 3.0, fmt: (v: number) => `${v.toFixed(1)}×` },
                  { label: "Rapid Payment Burst Index", value: agency.rapidPaymentAttempts / 3, threshold: 2.0, fmt: (v: number) => `${v.toFixed(1)}×` },
                  { label: "Transaction Frequency Score", value: agency.txPerMinute / 1.5, threshold: 2.0, fmt: (v: number) => `${v.toFixed(1)}×` },
                ].map(s => {
                  const isFlag = s.value > s.threshold;
                  return (
                    <div key={s.label} className={`flex justify-between items-center px-3 py-2.5 rounded-lg border ${
                      isFlag ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
                    }`}>
                      <span className="text-xs text-gray-500">{s.label}</span>
                      <span className="font-mono text-sm font-semibold" style={{ color: isFlag ? "#C62828" : "#2E7D32" }}>
                        {s.fmt(s.value)} {isFlag ? "⚑" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2.5">Fraud Patterns Flagged</div>
                {[
                  { label: "Automated Booking Attack", active: agency.txPerMinute > 3 },
                  { label: "Card Testing Bot Activity", active: agency.cardsPerDevice > 4 },
                  { label: "Bot-Driven Ticket Purchase", active: agency.txPerMinute > 2 && agency.velocityRiskScore > 50 },
                  { label: "Mass Card / Account Creation", active: agency.cardsPerAccount > 8 },
                  { label: "API Automation Fraud", active: agency.rapidPaymentAttempts > 7 },
                ].map(p => (
                  <div key={p.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs mb-1.5 ${
                    p.active ? "bg-red-50 border-red-100 text-red-600" : "bg-gray-50 border-gray-100 text-gray-400"
                  }`}>
                    <span>{p.active ? "⚑" : "✓"}</span>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Utilization Trend + Credit Limit Probing */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">Credit Utilization Rhythm (7-Week)</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={utilizationTrend}>
                  <defs>
                    <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [`${v}%`, "Utilization"]} />
                  <ReferenceLine y={80} stroke="#f97316" strokeDasharray="4 4" />
                  <Area dataKey="utilization" stroke="#f97316" fill="url(#utilGrad)" strokeWidth={2} dot={{ fill: "#f97316", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-4">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2.5">Credit Limit Probing Detection</div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3">
                  <div className="text-xs text-gray-500 mb-2 leading-relaxed">
                    Flagged if <span className="font-mono text-blue-600">3+ bookings within 5% of credit limit</span> in last 7 days, each followed by cancellation.
                  </div>
                  <div className="flex gap-2">
                    <FlagBadge active={agency.creditLimitProbingFlag} label="PROBING DETECTED" />
                    <FlagBadge active={agency.creditCyclingFlag} label="CYCLING ACTIVE" />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Settlement Partial-Payment Gaming</div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1.5 leading-relaxed">
                    Flag if settlement ratio ∈ <span className="font-mono text-blue-600">[0.50, 0.55]</span> across 3+ consecutive cycles
                  </div>
                  <div className="font-mono text-sm" style={{ color: agency.partialPaymentGamingFlag ? "#C62828" : "#2E7D32" }}>
                    Current Ratio: {(agency.partialSettlementRatio * 100).toFixed(0)}% — {agency.partialPaymentGamingFlag ? "⚑ GAMING PATTERN DETECTED" : "✓ NORMAL"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Formulas ── */}
        {activeTab === "formulas" && (
          <div className="grid grid-cols-2 gap-4">
            <FormulaCard
              title="EXIT RISK SCORE"
              formula="R_exit = E_unsettled / S̄_30d   →   R_exit > θ₁ ⇒ Credit Contraction"
              description="Measures how many 30-day settlement cycles worth of exposure remains outstanding. Values above 3× signal critical bust-out risk."
            />
            <FormulaCard
              title="VELOCITY CLIFF DETECTION"
              formula="B_wn / B_wn−1 > 3.0 ⇒ FLAG"
              description="Flags abnormal week-over-week booking spikes. Ratio above 3× indicates coordinated automation or burst-buying fraud."
            />
            <FormulaCard
              title="CREDIT UTILIZATION RHYTHM FINGERPRINT"
              formula="RDS = (U_current − μ_agency) / σ_agency   →   RDS > 1.5σ ⇒ FLAG"
              description="Z-score deviation from the agency's own historical utilization pattern. Sudden spikes above 1.5σ signal credit cycling behavior."
            />
            <FormulaCard
              title="CREDIT EXPANSION CONDITION"
              formula="C_new = C_base + α · S_validated   &&   dE/dt > β · dS/dt ⇒ Freeze Growth"
              description="Credit limit grows only when validated settlements justify it. Exposure growing faster than settlements triggers a freeze."
            />
            <FormulaCard
              title="BOOKING-TO-TRAVEL GAP"
              formula="Gap_i > μ_90d + 2σ ⇒ FLAG"
              description="Detects anomalous far-future bookings used in bust-out schemes where agencies book far ahead but never settle."
            />
            <FormulaCard
              title="CREDIT LIMIT PROBING"
              formula="3+ bookings within 5% of credit limit in 7 days, each followed by cancellation ⇒ FLAG"
              description="Pattern matching for agents systematically probing maximum available credit before executing a bust-out."
            />
            <FormulaCard
              title="SETTLEMENT PARTIAL-PAYMENT GAMING"
              formula="Settlement ratio ∈ [0.50, 0.55] across 3+ consecutive cycles ⇒ FLAG"
              description="Detects agencies that consistently settle exactly 50-55% to maintain apparent compliance while maximizing unpaid exposure."
            />
            <FormulaCard
              title="DORMANCY-REACTIVATION RISK MULTIPLIER"
              formula="Risk_mult = 1 + log(DormancyDays / 30)   applied on reactivation event"
              description="Dormant accounts that suddenly reactivate carry elevated risk. The log multiplier scales penalty with dormancy duration."
            />

            {/* Live computation */}
            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="text-[10px] text-blue-600 uppercase tracking-widest mb-4 font-semibold">
                Live Formula Output — {agency.name}
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Exit Risk (R_exit)", value: `${exitRisk}×`, flag: (exitRisk as number) > 3 },
                  { label: "RDS (Rhythm Z-score)", value: `${rds}σ`, flag: parseFloat(rds as string) > 1.5 },
                  { label: "Velocity Ratio", value: `${(agency.velocityRiskScore / 33).toFixed(1)}×`, flag: agency.velocityRiskScore / 33 > 3 },
                  { label: "Partial Settlement %", value: `${(agency.partialSettlementRatio * 100).toFixed(0)}%`, flag: agency.partialPaymentGamingFlag },
                  { label: "Booking-to-Settlement Gap", value: `${agency.bookingToSettlementGap}d`, flag: agency.bookingToSettlementGap > 90 },
                  { label: "Exposure Stability (dE/dt)", value: `${agency.exposureStabilityDt}×/wk`, flag: agency.exposureStabilityDt > 2 },
                  { label: "Settlement Delay Drift", value: `+${agency.settlementDelayDrift}d`, flag: agency.settlementDelayDrift > 10 },
                  { label: "Credit Health Score", value: agency.creditHealthScore, flag: agency.creditHealthScore < 40 },
                ].map(m => (
                  <div key={m.label} className={`p-3 rounded-lg border ${m.flag ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
                    <div className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">{m.label}</div>
                    <div className="font-mono text-base font-bold" style={{ color: m.flag ? "#C62828" : "#2E7D32" }}>
                      {m.value} {m.flag ? "⚑" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
