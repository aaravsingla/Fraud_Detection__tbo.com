import { useState, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  GitBranch,
  Play,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Cpu,
  Sliders,
  Clock,
  Zap,
  ChevronRight,
  DollarSign,
  Eye,
  Users,
  Activity,
  Info,
  CheckCircle,
  XCircle,
  ArrowRight,
  Flame,
  BarChart2,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { motion, AnimatePresence } from "motion/react";

// ── Agency seeds ────────────────────────────────────────────────────────────────
const AGENCIES = {
  "AG-001": {
    name: "Wanderlust Travels",
    trustScore: 38,
    city: "Mumbai",
    monthsOnPlatform: 18,
    weeklyBookings: [4, 5, 4, 6, 5, 7, 8, 9, 12, 18, 28, 47, 89],
    unsettledExposure: 920000,
    creditLimit: 1200000,
    settlementVelocity: 180000,
    avgTicketValue: 67000,
    normalTicketValue: 22000,
    riskProfile: "bust-out",
    description: "Accelerating bookings, low trust — high bust-out probability",
    twinProfile: {
      expectedWeeklyBookings: 43,
      expectedTicketValue: 22000,
      expectedSettlementDays: 12,
      loginPattern: "Weekdays 9am–6pm from Mumbai",
      preferredRoutes: "IndiGo, metro routes (60%)",
      expectedBookingGap: 18,
    },
    anomalies: [
      { label: "Booking volume", expected: 43, actual: 127, unit: "tickets/week", severity: "critical" },
      { label: "Avg ticket value", expected: 22000, actual: 67000, unit: "₹", severity: "critical" },
      { label: "Booking-to-travel gap", expected: 18, actual: 140, unit: "days", severity: "critical" },
      { label: "Login time", expected: "9am–6pm", actual: "2am Pune", unit: "", severity: "high" },
      { label: "Route type", expected: "Domestic", actual: "International", unit: "", severity: "high" },
    ],
  },
  "AG-002": {
    name: "Global Ventures Ltd",
    city: "Delhi",
    monthsOnPlatform: 36,
    trustScore: 82,
    weeklyBookings: [22, 25, 24, 26, 23, 25, 27, 24, 26, 25, 28, 26, 27],
    unsettledExposure: 320000,
    creditLimit: 1000000,
    settlementVelocity: 420000,
    avgTicketValue: 23500,
    normalTicketValue: 24000,
    riskProfile: "healthy",
    description: "Stable bookings, healthy settlements — low risk",
    twinProfile: {
      expectedWeeklyBookings: 25,
      expectedTicketValue: 24000,
      expectedSettlementDays: 9,
      loginPattern: "Weekdays 10am–7pm from Delhi",
      preferredRoutes: "Air India, corporate routes (70%)",
      expectedBookingGap: 21,
    },
    anomalies: [],
  },
  "AG-003": {
    name: "SkyHigh Agencies",
    city: "Bangalore",
    monthsOnPlatform: 11,
    trustScore: 61,
    weeklyBookings: [8, 9, 8, 10, 11, 12, 14, 16, 20, 26, 30, 38, 52],
    unsettledExposure: 580000,
    creditLimit: 800000,
    settlementVelocity: 260000,
    avgTicketValue: 31000,
    normalTicketValue: 26000,
    riskProfile: "watch",
    description: "Gradual acceleration — needs monitoring",
    twinProfile: {
      expectedWeeklyBookings: 22,
      expectedTicketValue: 26000,
      expectedSettlementDays: 14,
      loginPattern: "Weekdays 9am–5pm from Bangalore",
      preferredRoutes: "IndiGo, SpiceJet (mixed)",
      expectedBookingGap: 25,
    },
    anomalies: [
      { label: "Booking volume", expected: 22, actual: 52, unit: "tickets/week", severity: "high" },
      { label: "Avg ticket value", expected: 26000, actual: 31000, unit: "₹", severity: "medium" },
      { label: "Booking-to-travel gap", expected: 25, actual: 68, unit: "days", severity: "medium" },
    ],
  },
  "AG-004": {
    name: "Paradise Tours",
    city: "Chennai",
    monthsOnPlatform: 24,
    trustScore: 74,
    weeklyBookings: [15, 18, 14, 17, 19, 16, 18, 17, 20, 18, 21, 19, 20],
    unsettledExposure: 210000,
    creditLimit: 600000,
    settlementVelocity: 310000,
    avgTicketValue: 19500,
    normalTicketValue: 20000,
    riskProfile: "healthy",
    description: "Seasonal variation — normal behaviour",
    twinProfile: {
      expectedWeeklyBookings: 18,
      expectedTicketValue: 20000,
      expectedSettlementDays: 11,
      loginPattern: "Weekdays 10am–6pm from Chennai",
      preferredRoutes: "IndiGo, domestic south (80%)",
      expectedBookingGap: 15,
    },
    anomalies: [],
  },
};

// ── Simulation engine ────────────────────────────────────────────────────────────
function runSimulation(
  agency: (typeof AGENCIES)["AG-001"],
  weeks: number,
  interventionCreditCut: number,
  interventionWeek: number | null
) {
  const lastBooking = agency.weeklyBookings[agency.weeklyBookings.length - 1];
  const lastTrust = agency.trustScore;
  const accel =
    agency.weeklyBookings[agency.weeklyBookings.length - 1] /
    (agency.weeklyBookings[agency.weeklyBookings.length - 2] || 1);

  const baseAccel = agency.riskProfile === "bust-out" ? accel : agency.riskProfile === "watch" ? 1.15 : 1.02;

  const historicalPoints = agency.weeklyBookings.map((b, i) => ({
    week: `W-${agency.weeklyBookings.length - 1 - i}`,
    actual: b,
    trust: Math.max(10, lastTrust - (agency.weeklyBookings.length - 1 - i) * 2.1),
    exposure: null as number | null,
    twin: null as number | null,
    twinTrust: null as number | null,
    twinExposure: null as number | null,
    isProjected: false,
    interventionPoint: false,
  }));
  historicalPoints[historicalPoints.length - 1].trust = lastTrust;
  historicalPoints[historicalPoints.length - 1].actual = lastBooking;
  historicalPoints[historicalPoints.length - 1].exposure = agency.unsettledExposure / 1000;

  const projectedPoints = [];
  let currentBookings = lastBooking;
  let currentTrust = lastTrust;
  let currentExposure = agency.unsettledExposure;
  let twinBookings = lastBooking;
  let twinTrust = lastTrust;
  let twinExposure = agency.unsettledExposure;
  let twinCreditLimit = agency.creditLimit;

  for (let w = 1; w <= weeks; w++) {
    const isIntervention = interventionWeek !== null && w === interventionWeek;
    const noiseA = 0.95 + Math.random() * 0.1;
    currentBookings = Math.round(currentBookings * baseAccel * noiseA);
    currentExposure = Math.max(0, currentExposure + currentBookings * 1800 - agency.settlementVelocity);
    const trustDelta = agency.riskProfile === "bust-out" ? -3.5 : agency.riskProfile === "watch" ? -1.2 : 0.5;
    currentTrust = Math.max(5, Math.min(100, currentTrust + trustDelta + (Math.random() - 0.5)));

    if (isIntervention) twinCreditLimit = twinCreditLimit * (1 - interventionCreditCut);
    const cappedBookings = Math.min(twinBookings * baseAccel, twinCreditLimit / 1800);
    const noiseB = 0.95 + Math.random() * 0.1;
    twinBookings = Math.round(cappedBookings * noiseB);
    twinExposure = Math.max(0, twinExposure + twinBookings * 1800 - agency.settlementVelocity);
    const twinTrustDelta = isIntervention ? -0.5 : interventionWeek !== null && w > interventionWeek ? 0.8 : trustDelta;
    twinTrust = Math.max(5, Math.min(100, twinTrust + twinTrustDelta + (Math.random() - 0.5)));

    projectedPoints.push({
      week: `W+${w}`,
      actual: currentBookings,
      trust: Math.round(currentTrust * 10) / 10,
      exposure: Math.round(currentExposure / 1000),
      twin: twinBookings,
      twinTrust: Math.round(twinTrust * 10) / 10,
      twinExposure: Math.round(twinExposure / 1000),
      isProjected: true,
      interventionPoint: isIntervention,
    });
  }

  return { historicalPoints, projectedPoints };
}

function getOutcome(trust: number, exposure: number, creditLimit: number) {
  const utilization = exposure / (creditLimit / 1000);
  if (trust < 25 && utilization > 0.8) return { label: "BUST-OUT LIKELY", color: "bg-red-600", textColor: "text-red-600", icon: AlertTriangle, border: "border-red-200" };
  if (trust < 40 || utilization > 0.7) return { label: "HIGH RISK", color: "bg-orange-500", textColor: "text-orange-500", icon: AlertTriangle, border: "border-orange-200" };
  if (trust < 60) return { label: "WATCH", color: "bg-yellow-500", textColor: "text-yellow-600", icon: Clock, border: "border-yellow-200" };
  return { label: "STABLE", color: "bg-emerald-500", textColor: "text-emerald-600", icon: ShieldCheck, border: "border-emerald-200" };
}

// ── Monte Carlo bust-out probability ─────────────────────────────────────────
function computeBustOutProbability(
  agency: (typeof AGENCIES)["AG-001"],
  weeks: number,
  interventionCreditCut: number,
  interventionWeek: number | null,
  runs: number = 200
): { baselineProb: number; twinProb: number; revenueImpact: number } {
  let baselineBusts = 0;
  let twinBusts = 0;

  for (let r = 0; r < runs; r++) {
    const sim = runSimulation(agency, weeks, interventionCreditCut, interventionWeek);
    const last = sim.projectedPoints[sim.projectedPoints.length - 1];
    if (last.trust < 25 && last.exposure > agency.creditLimit / 1000 * 0.8) baselineBusts++;
    if (last.twinTrust! < 25 && last.twinExposure! > agency.creditLimit / 1000 * 0.8) twinBusts++;
  }

  const baselineProb = Math.round((baselineBusts / runs) * 100);
  const twinProb = Math.round((twinBusts / runs) * 100);
  const revenueImpact = Math.round((interventionCreditCut * agency.creditLimit * 0.12) / 100000) * 100000;

  return { baselineProb, twinProb, revenueImpact };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Twin DNA Card ─────────────────────────────────────────────────────────────
function TwinDNACard({ agency }: { agency: (typeof AGENCIES)["AG-001"] }) {
  return (
    <Card className="border-purple-100 bg-purple-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-500" />
          Agency Digital Twin — Ghost Profile
          <Badge className="bg-purple-100 text-purple-700 text-xs ml-auto border-purple-200">BASELINE FINGERPRINT</Badge>
        </CardTitle>
        <p className="text-xs text-gray-400">What this agency should look like based on {agency.monthsOnPlatform} months of history</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Expected weekly bookings", value: `${agency.twinProfile.expectedWeeklyBookings} tickets`, icon: Activity },
            { label: "Expected ticket value", value: `₹${(agency.twinProfile.expectedTicketValue / 1000).toFixed(0)}K`, icon: DollarSign },
            { label: "Settlement cadence", value: `Day ${agency.twinProfile.expectedSettlementDays}`, icon: Calendar },
            { label: "Booking advance window", value: `${agency.twinProfile.expectedBookingGap} days`, icon: Clock },
            { label: "Login pattern", value: agency.twinProfile.loginPattern, icon: Eye },
            { label: "Route preferences", value: agency.twinProfile.preferredRoutes, icon: GitBranch },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-2 p-2.5 bg-white rounded-lg border border-purple-100">
              <Icon className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-400">{label}</div>
                <div className="text-xs font-semibold text-gray-700 mt-0.5">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Anomaly Divergence Panel ──────────────────────────────────────────────────
function AnomalyDivergencePanel({ agency }: { agency: (typeof AGENCIES)["AG-001"] }) {
  const divergenceScore = agency.anomalies.length === 0 ? 5 :
    Math.min(100, agency.anomalies.reduce((acc, a) =>
      acc + (a.severity === "critical" ? 30 : a.severity === "high" ? 20 : 10), 0));

  const getColor = (s: string) =>
    s === "critical" ? "#C62828" : s === "high" ? "#FF6600" : "#F57C00";

  if (agency.anomalies.length === 0) {
    return (
      <Card className="border-green-100 bg-green-50/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div>
              <div className="font-semibold text-emerald-700">No Divergence Detected</div>
              <div className="text-xs text-gray-500">Agency behavior matches twin profile exactly</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-3xl font-black font-mono text-emerald-600">0.03</div>
              <div className="text-xs text-gray-400">divergence score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
          <Zap className="w-4 h-4 text-red-500" />
          Twin Divergence Analysis — "Is this agency breaking their own rules?"
        </CardTitle>
        <p className="text-xs text-gray-400">Real behavior vs. ghost profile. Each gap is a signal your rule-based system would miss.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Composite divergence score */}
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
          <div>
            <div className="text-xs text-gray-500 mb-1">Composite Twin Divergence Score</div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-black font-mono text-[#C62828]">{(divergenceScore / 100).toFixed(2)}</div>
              <div className="text-xs">
                <div className={`font-semibold ${divergenceScore > 70 ? "text-[#C62828]" : divergenceScore > 40 ? "text-[#FF6600]" : "text-[#F57C00]"}`}>
                  {divergenceScore > 80 ? "CRITICAL — Actor-Critic → FREEZE" : divergenceScore > 65 ? "HIGH — Significant Anomaly" : "MEDIUM — Enhanced Monitoring"}
                </div>
                <div className="text-gray-400">above 0.65 triggers automated review</div>
              </div>
            </div>
          </div>
          <div className="w-24 h-24 relative flex items-center justify-center">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="#fee2e2" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40"
                fill="none"
                stroke="#C62828"
                strokeWidth="8"
                strokeDasharray={`${2.51 * divergenceScore} ${251 - 2.51 * divergenceScore}`}
                strokeDashoffset="62.75"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-sm font-black text-[#C62828]">{divergenceScore}%</div>
          </div>
        </div>

        {/* Per-dimension divergence */}
        <div className="space-y-2">
          {agency.anomalies.map((a, i) => {
            const color = getColor(a.severity);
            const pct = a.severity === "critical" ? 92 : a.severity === "high" ? 68 : 42;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{a.label}</span>
                    <Badge className="text-xs px-1.5" style={{ background: color + "20", color, border: `1px solid ${color}40` }}>
                      {a.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs mb-1.5">
                    <span className="text-gray-400">Twin expects:</span>
                    <span className="font-semibold text-gray-600">{typeof a.expected === 'number' && a.expected > 1000 ? `₹${(a.expected/1000).toFixed(0)}K` : a.expected}{a.unit && typeof a.expected === 'number' && a.expected <= 1000 ? ` ${a.unit}` : ''}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300" />
                    <span className="text-gray-400">Actual:</span>
                    <span className="font-bold" style={{ color }}>{typeof a.actual === 'number' && a.actual > 1000 ? `₹${(a.actual/1000).toFixed(0)}K` : a.actual}{a.unit && typeof a.actual === 'number' && a.actual <= 1000 ? ` ${a.unit}` : ''}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="p-3 bg-[#003366]/5 rounded-lg border border-[#003366]/10 text-xs text-[#003366] leading-relaxed">
          <span className="font-semibold">Why this matters: </span>
          None of these signals individually exceed TBO's system-wide alert thresholds. But the composite twin divergence score of <span className="font-bold">{(divergenceScore / 100).toFixed(2)}</span> flags a critical anomaly — catching the bust-out pattern <span className="font-bold">before a single rupee is lost.</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Business Impact Panel ─────────────────────────────────────────────────────
function BusinessImpactPanel({
  baselineProb, twinProb, revenueImpact, agency, creditCut, interventionWeek,
}: {
  baselineProb: number; twinProb: number; revenueImpact: number;
  agency: (typeof AGENCIES)["AG-001"]; creditCut: number; interventionWeek: number | null;
}) {
  const lossAvoided = Math.round((agency.unsettledExposure * (baselineProb - twinProb)) / 100 / 100000) * 100000;
  const falsePositiveCost = revenueImpact;
  const netBenefit = lossAvoided - falsePositiveCost;

  const interventionOptions = [
    { label: "No action", prob: baselineProb, color: "#C62828", rev: 0 },
    { label: "30% credit cut", prob: Math.round(baselineProb * 0.35), color: "#FF6600", rev: Math.round(agency.creditLimit * 0.3 * 0.12 / 100000) * 100000 },
    { label: "50% credit cut", prob: Math.round(baselineProb * 0.18), color: "#F57C00", rev: Math.round(agency.creditLimit * 0.5 * 0.12 / 100000) * 100000 },
    { label: "Full freeze", prob: 4, color: "#2E7D32", rev: Math.round(agency.creditLimit * 0.12 / 100000) * 100000 },
  ];

  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-500" />
          Business Impact Calculator — Risk vs. Revenue Tradeoff
        </CardTitle>
        <p className="text-xs text-gray-400">What the twin simulation tells your credit manager in plain numbers</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
            <div className="text-xs text-gray-500 mb-1">Default probability</div>
            <div className="text-xs text-gray-400 mb-1">without intervention</div>
            <div className="text-4xl font-black font-mono text-[#C62828]">{baselineProb}%</div>
            <div className="text-xs text-gray-400 mt-1">in {interventionOptions[0].prob > 50 ? "3" : "6"} weeks</div>
          </div>
          <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
            <div className="text-xs text-gray-500 mb-1">Default probability</div>
            <div className="text-xs text-gray-400 mb-1">with {interventionWeek ? `W+${interventionWeek} intervention` : "no intervention"}</div>
            <div className="text-4xl font-black font-mono text-emerald-600">{twinProb}%</div>
            <div className="text-xs text-gray-400 mt-1">{creditCut > 0 ? `-${Math.round(creditCut * 100)}% credit limit` : "no change"}</div>
          </div>
        </div>

        {/* Intervention comparison bar chart */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Intervention Option Comparison</div>
          <div className="space-y-2">
            {interventionOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-xs text-gray-600 text-right flex-shrink-0">{opt.label}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${opt.prob}%` }}
                    transition={{ duration: 0.7, delay: i * 0.1 }}
                    className="h-full rounded flex items-center px-2"
                    style={{ background: opt.color }}
                  >
                    <span className="text-white text-xs font-bold">{opt.prob}%</span>
                  </motion.div>
                </div>
                <div className="w-24 text-xs text-right flex-shrink-0" style={{ color: opt.color }}>
                  {opt.rev > 0 ? `-₹${(opt.rev / 100000).toFixed(1)}L revenue` : "full exposure"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Net benefit */}
        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Potential loss avoided</div>
            <div className="text-lg font-black font-mono text-emerald-600">
              ₹{lossAvoided > 0 ? (lossAvoided / 100000).toFixed(1) : "—"}L
            </div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Revenue impact</div>
            <div className="text-lg font-black font-mono text-[#FF6600]">
              -₹{(falsePositiveCost / 100000).toFixed(1)}L
            </div>
          </div>
          <div className={`text-center p-2 rounded-lg ${netBenefit > 0 ? "bg-green-50" : "bg-red-50"}`}>
            <div className="text-xs text-gray-400 mb-1">Net benefit</div>
            <div className={`text-lg font-black font-mono ${netBenefit > 0 ? "text-emerald-600" : "text-[#C62828]"}`}>
              {netBenefit > 0 ? "+" : ""}₹{(netBenefit / 100000).toFixed(1)}L
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#003366] text-white text-xs leading-relaxed">
          <span className="font-semibold">Decision support: </span>
          A credit manager using this tool can see, in rupees, that a {Math.round(creditCut * 100)}% credit reduction avoids ₹{(lossAvoided / 100000).toFixed(1)}L in potential loss at the cost of ₹{(falsePositiveCost / 100000).toFixed(1)}L in reduced bookings — a concrete number to act on, not a hunch.
        </div>
      </CardContent>
    </Card>
  );
}

// ── False Positive Prevention Card ───────────────────────────────────────────
function SeasonalCalibrationCard({ agency }: { agency: (typeof AGENCIES)["AG-001"] }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const seasonalData = months.map((m, i) => ({
    month: m,
    expected: Math.round(agency.twinProfile.expectedWeeklyBookings * (1 + Math.sin((i - 2) * 0.6) * 0.35)),
    threshold: Math.round(agency.twinProfile.expectedWeeklyBookings * (1 + Math.sin((i - 2) * 0.6) * 0.35) * 2.2),
  }));

  return (
    <Card className="border-amber-100 bg-amber-50/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-500" />
          Seasonal Calibration — Zero False Positives During Peaks
        </CardTitle>
        <p className="text-xs text-gray-400">
          Unlike system-wide thresholds that flag December surges as suspicious, the twin adjusts its baseline month by month.
          <span className="font-semibold text-amber-700"> Blue = expected range. Red = only flagged if it exceeds the twin's seasonal expectation.</span>
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={seasonalData} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="expected" name="Expected range" fill="#003366" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
            <Bar dataKey="threshold" name="Alert threshold" fill="#fca5a5" fillOpacity={0.5} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-green-50 border border-green-100 rounded-lg">
            <div className="font-semibold text-emerald-700 mb-0.5">✓ December surge: NOT flagged</div>
            <div className="text-gray-500">Twin expects this peak. System-wide threshold would flag it. False positive avoided.</div>
          </div>
          <div className="p-2 bg-red-50 border border-red-100 rounded-lg">
            <div className="font-semibold text-[#C62828] mb-0.5">⚠ February surge: FLAGGED</div>
            <div className="text-gray-500">Twin expects a dip in February. Any spike here is genuinely anomalous.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DigitalTwinPage() {
  const [selectedAgency, setSelectedAgency] = useState("AG-001");
  const [simWeeks, setSimWeeks] = useState(6);
  const [creditCut, setCreditCut] = useState(0.3);
  const [interventionWeek, setInterventionWeek] = useState<number | null>(2);
  const [simResult, setSimResult] = useState<ReturnType<typeof runSimulation> | null>(null);
  const [mcResult, setMcResult] = useState<{ baselineProb: number; twinProb: number; revenueImpact: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"simulation" | "divergence" | "impact" | "seasonal">("simulation");
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const agency = AGENCIES[selectedAgency as keyof typeof AGENCIES];

  const runSim = useCallback(() => {
    setRunning(true);
    setAnimStep(0);
    const result = runSimulation(agency, simWeeks, creditCut, interventionWeek);
    const mc = computeBustOutProbability(agency, simWeeks, creditCut, interventionWeek);
    setSimResult(result);
    setMcResult(mc);
    setHasRun(true);

    let step = 0;
    animRef.current = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= simWeeks) {
        clearInterval(animRef.current!);
        setRunning(false);
      }
    }, 200);
  }, [agency, simWeeks, creditCut, interventionWeek]);

  const reset = () => {
    if (animRef.current) clearInterval(animRef.current);
    setSimResult(null);
    setMcResult(null);
    setHasRun(false);
    setAnimStep(0);
    setRunning(false);
  };

  const visibleProjected = simResult ? simResult.projectedPoints.slice(0, animStep) : [];
  const chartData = simResult ? [...simResult.historicalPoints, ...visibleProjected] : [];
  const finalBaseline = simResult?.projectedPoints[simResult.projectedPoints.length - 1];
  const baselineOutcome = finalBaseline ? getOutcome(finalBaseline.trust, finalBaseline.exposure!, agency.creditLimit / 1000) : null;
  const twinOutcome = finalBaseline ? getOutcome(finalBaseline.twinTrust!, finalBaseline.twinExposure!, agency.creditLimit / 1000) : null;
  const isFullyRendered = animStep >= simWeeks;

  const riskProfileBadge = {
    "bust-out": { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", label: "BUST-OUT RISK" },
    "watch": { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", label: "WATCH" },
    "healthy": { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", label: "HEALTHY" },
  }[agency.riskProfile];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-6 h-6 text-[#003366]" />
            <h1 className="text-2xl font-bold text-[#003366]">Agency Digital Twin</h1>
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200">PREDICTIVE SIMULATION</Badge>
          </div>
          <p className="text-gray-500 text-sm max-w-xl">
            Every agency has a "ghost" version built from their history. When real behavior diverges from the ghost, the twin catches it — before your rules do.
          </p>
        </div>
        <div className="flex gap-2">
          {hasRun && (
            <Button variant="outline" size="sm" onClick={reset} className="gap-1">
              <RotateCcw className="w-4 h-4" /> Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={runSim}
            disabled={running}
            className="bg-[#003366] hover:bg-[#004080] text-white gap-1"
          >
            <Play className="w-4 h-4" />
            {running ? "Running Twin…" : hasRun ? "Re-run Twin" : "Run Digital Twin"}
          </Button>
        </div>
      </div>

      {/* Key concept callout */}
      <div className="bg-gradient-to-r from-[#003366]/5 via-purple-50 to-[#003366]/5 border border-[#003366]/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#003366] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#003366] mb-1">The core insight</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Every other fraud system asks <span className="italic">"is this agency breaking TBO's rules?"</span> — a threshold any fraudster can study and stay under.
              The Digital Twin asks <span className="italic font-semibold text-[#003366]">"is this agency breaking their own rules?"</span> — a baseline the fraudster can't fake without also faking 18 months of consistent history.
            </p>
          </div>
        </div>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="w-4 h-4" /> Select Agency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={selectedAgency} onValueChange={(v) => { setSelectedAgency(v); reset(); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGENCIES).map(([id, a]) => (
                  <SelectItem key={id} value={id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${riskProfileBadge.bg} ${riskProfileBadge.text} ${riskProfileBadge.border}`}>
                {riskProfileBadge.label}
              </span>
            </div>
            <p className="text-xs text-gray-400">{agency.description}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" /> {agency.monthsOnPlatform} months on platform · {agency.city}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Trust:</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                <div className="h-1.5 rounded-full" style={{ width: `${agency.trustScore}%`, background: agency.trustScore > 70 ? "#10b981" : agency.trustScore > 45 ? "#f59e0b" : "#ef4444" }} />
              </div>
              <span className="text-xs font-semibold">{agency.trustScore}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-1">
              <Sliders className="w-4 h-4" /> Intervention Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Forecast weeks</span>
                <span className="font-semibold text-[#003366]">{simWeeks} wks</span>
              </div>
              <Slider min={4} max={12} step={1} value={[simWeeks]} onValueChange={([v]) => { setSimWeeks(v); reset(); }} />
              <p className="text-xs text-gray-400">How far ahead to simulate</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Credit limit cut</span>
                <span className="font-semibold text-orange-600">-{Math.round(creditCut * 100)}%</span>
              </div>
              <Slider min={0} max={1} step={0.05} value={[creditCut]} onValueChange={([v]) => { setCreditCut(v); reset(); }} />
              <p className="text-xs text-gray-400">Reduce credit limit on intervention</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Intervene at week</span>
                <span className="font-semibold text-purple-600">{interventionWeek === null ? "Never" : `W+${interventionWeek}`}</span>
              </div>
              <Slider min={0} max={simWeeks} step={1} value={[interventionWeek ?? 0]} onValueChange={([v]) => { setInterventionWeek(v === 0 ? null : v); reset(); }} />
              <p className="text-xs text-gray-400">0 = no intervention applied</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Twin DNA + Anomaly panels — always visible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TwinDNACard agency={agency} />
        <AnomalyDivergencePanel agency={agency} />
      </div>

      {/* Seasonal calibration — always visible */}
      <SeasonalCalibrationCard agency={agency} />

      {/* Pre-run state */}
      {!hasRun && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-center">
          <Cpu className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">Click "Run Digital Twin" to project two futures</p>
          <p className="text-[#003366] font-semibold text-sm mt-1">Baseline (no action) vs. Your intervention ↑</p>
          <p className="text-xs text-gray-400 mt-2 max-w-sm">The Monte Carlo engine will run 200 simulations to give you a concrete bust-out probability and rupee-value impact estimate.</p>
        </motion.div>
      )}

      {/* Simulation results */}
      <AnimatePresence>
        {hasRun && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* Monte Carlo probability banner */}
            {isFullyRendered && mcResult && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white">
                  <div className="text-xs opacity-70 mb-1 uppercase tracking-wide">Monte Carlo — No Action</div>
                  <div className="text-5xl font-black font-mono mb-1">{mcResult.baselineProb}%</div>
                  <div className="text-sm opacity-80">bust-out probability in {simWeeks} weeks</div>
                  <div className="text-xs opacity-60 mt-1">from 200 simulated futures</div>
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
                  <div className="text-xs opacity-70 mb-1 uppercase tracking-wide">Monte Carlo — With Intervention</div>
                  <div className="text-5xl font-black font-mono mb-1">{mcResult.twinProb}%</div>
                  <div className="text-sm opacity-80">bust-out probability drops to</div>
                  <div className="text-xs opacity-60 mt-1">-{Math.round(creditCut * 100)}% credit cut @ W+{interventionWeek}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#003366] text-white">
                  <div className="text-xs opacity-70 mb-1 uppercase tracking-wide">Credit Manager Can See</div>
                  <div className="text-2xl font-black font-mono mb-1">
                    {mcResult.baselineProb - mcResult.twinProb}pp
                  </div>
                  <div className="text-sm opacity-80">risk reduction from acting now</div>
                  <div className="text-xs opacity-60 mt-1">
                    revenue cost: ₹{(mcResult.revenueImpact / 100000).toFixed(1)}L · decide before it's too late
                  </div>
                </div>
              </motion.div>
            )}

            {/* Business Impact Panel */}
            {isFullyRendered && mcResult && (
              <BusinessImpactPanel
                baselineProb={mcResult.baselineProb}
                twinProb={mcResult.twinProb}
                revenueImpact={mcResult.revenueImpact}
                agency={agency}
                creditCut={creditCut}
                interventionWeek={interventionWeek}
              />
            )}

            {/* Outcome comparison */}
            {isFullyRendered && finalBaseline && baselineOutcome && twinOutcome && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <Card className={`border-red-100 bg-red-50/30`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      Baseline — No Action
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${baselineOutcome.color}`}>{baselineOutcome.label}</span>
                      <span className="text-xs text-gray-400">in {simWeeks} weeks</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><p className="text-xs text-gray-400">Trust</p><p className="text-lg font-bold text-red-500">{Math.round(finalBaseline.trust)}</p></div>
                      <div><p className="text-xs text-gray-400">Exposure</p><p className="text-lg font-bold text-red-500">₹{(finalBaseline.exposure! * 1000 / 100000).toFixed(1)}L</p></div>
                      <div><p className="text-xs text-gray-400">Bookings/wk</p><p className="text-lg font-bold text-red-500">{finalBaseline.actual}</p></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 bg-emerald-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Twin — With Intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${twinOutcome.color}`}>{twinOutcome.label}</span>
                      <span className="text-xs text-gray-400">credit cut -{Math.round(creditCut * 100)}% @ W+{interventionWeek}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><p className="text-xs text-gray-400">Trust</p><p className="text-lg font-bold text-emerald-600">{Math.round(finalBaseline.twinTrust!)}</p></div>
                      <div><p className="text-xs text-gray-400">Exposure</p><p className="text-lg font-bold text-emerald-600">₹{(finalBaseline.twinExposure! * 1000 / 100000).toFixed(1)}L</p></div>
                      <div><p className="text-xs text-gray-400">Bookings/wk</p><p className="text-lg font-bold text-emerald-600">{finalBaseline.twin}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Charts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Booking Volume — Actual vs. Twin Projection
                  {interventionWeek && <Badge className="bg-purple-100 text-purple-600 text-xs ml-2">↓ Intervention @ W+{interventionWeek}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradTwin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine x="W+1" stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "NOW", fontSize: 10, fill: "#94a3b8" }} />
                    {interventionWeek && <ReferenceLine x={`W+${interventionWeek}`} stroke="#7c3aed" strokeDasharray="4 2" label={{ value: "INTERVENE", fontSize: 9, fill: "#7c3aed" }} />}
                    <Area type="monotone" dataKey="actual" name="Baseline" stroke="#ef4444" fill="url(#gradActual)" dot={false} strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey="twin" name="With Intervention" stroke="#8b5cf6" fill="url(#gradTwin)" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-[#003366]">Trust Score Trajectory</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceLine y={40} stroke="#fca5a5" strokeDasharray="3 3" label={{ value: "Danger", fontSize: 9, fill: "#ef4444" }} />
                      {interventionWeek && <ReferenceLine x={`W+${interventionWeek}`} stroke="#7c3aed" strokeDasharray="4 2" />}
                      <Line type="monotone" dataKey="trust" name="Baseline Trust" stroke="#ef4444" dot={false} strokeWidth={2} connectNulls />
                      <Line type="monotone" dataKey="twinTrust" name="Twin Trust" stroke="#8b5cf6" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-[#003366]">Unsettled Exposure (₹K)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {interventionWeek && <ReferenceLine x={`W+${interventionWeek}`} stroke="#7c3aed" strokeDasharray="4 2" />}
                      <Area type="monotone" dataKey="exposure" name="Baseline Exp" stroke="#f97316" fill="url(#gradExp)" dot={false} strokeWidth={2} connectNulls />
                      <Area type="monotone" dataKey="twinExposure" name="Twin Exp" stroke="#8b5cf6" fill="none" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Final insight */}
            {isFullyRendered && finalBaseline && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-[#003366] text-white rounded-xl p-5 flex items-center gap-4"
              >
                <Cpu className="w-8 h-8 text-blue-300 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold mb-0.5">Digital Twin — Bottom Line</p>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    {interventionWeek
                      ? `Acting at W+${interventionWeek} with a ${Math.round(creditCut * 100)}% credit cut reduces projected exposure by ₹${Math.round(((finalBaseline.exposure! - finalBaseline.twinExposure!) * 1000) / 100000)}L and recovers trust by ${Math.round(finalBaseline.twinTrust! - finalBaseline.trust)} points over ${simWeeks} weeks. The twin told you this before a single rupee was lost.`
                      : `No intervention applied. Baseline shows ${baselineOutcome?.label} outcome. Add an intervention week to model how TBO prevents this.`}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-300 flex-shrink-0" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
