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
} from "recharts";
import {
  GitBranch,
  Play,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  Cpu,
  Sliders,
  Clock,
  Zap,
  ChevronRight,
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
    weeklyBookings: [4, 5, 4, 6, 5, 7, 8, 9, 12, 18, 28, 47, 89],
    unsettledExposure: 920000,
    creditLimit: 1200000,
    settlementVelocity: 180000,
    riskProfile: "bust-out",
    description: "Accelerating bookings, low trust — high bust-out probability",
  },
  "AG-002": {
    name: "Global Ventures Ltd",
    trustScore: 82,
    weeklyBookings: [22, 25, 24, 26, 23, 25, 27, 24, 26, 25, 28, 26, 27],
    unsettledExposure: 320000,
    creditLimit: 1000000,
    settlementVelocity: 420000,
    riskProfile: "healthy",
    description: "Stable bookings, healthy settlements — low risk",
  },
  "AG-003": {
    name: "SkyHigh Agencies",
    trustScore: 61,
    weeklyBookings: [8, 9, 8, 10, 11, 12, 14, 16, 20, 26, 30, 38, 52],
    unsettledExposure: 580000,
    creditLimit: 800000,
    settlementVelocity: 260000,
    riskProfile: "watch",
    description: "Gradual acceleration — needs monitoring",
  },
  "AG-004": {
    name: "Paradise Tours",
    trustScore: 74,
    weeklyBookings: [15, 18, 14, 17, 19, 16, 18, 17, 20, 18, 21, 19, 20],
    unsettledExposure: 210000,
    creditLimit: 600000,
    settlementVelocity: 310000,
    riskProfile: "healthy",
    description: "Seasonal variation — normal behaviour",
  },
};

// ── Simulation engine ────────────────────────────────────────────────────────────
function runSimulation(
  agency: (typeof AGENCIES)["AG-001"],
  weeks: number,
  interventionCreditCut: number, // 0-1, fraction to reduce credit limit
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
  // Fix last historical
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

    // Baseline (no intervention)
    const noiseA = 0.95 + Math.random() * 0.1;
    currentBookings = Math.round(currentBookings * baseAccel * noiseA);
    currentExposure = Math.max(0, currentExposure + currentBookings * 1800 - agency.settlementVelocity);
    const trustDelta =
      agency.riskProfile === "bust-out" ? -3.5 : agency.riskProfile === "watch" ? -1.2 : 0.5;
    currentTrust = Math.max(5, Math.min(100, currentTrust + trustDelta + (Math.random() - 0.5)));

    // Twin (with intervention)
    if (isIntervention) {
      twinCreditLimit = twinCreditLimit * (1 - interventionCreditCut);
    }
    const cappedBookings = Math.min(
      twinBookings * baseAccel,
      twinCreditLimit / 1800 // hard cap by credit
    );
    const noiseB = 0.95 + Math.random() * 0.1;
    twinBookings = Math.round(cappedBookings * noiseB);
    twinExposure = Math.max(0, twinExposure + twinBookings * 1800 - agency.settlementVelocity);
    const twinTrustDelta = isIntervention
      ? -0.5
      : interventionWeek !== null && w > interventionWeek
      ? 0.8
      : trustDelta;
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

// ── Risk outcome label ───────────────────────────────────────────────────────────
function getOutcome(trust: number, exposure: number, creditLimit: number) {
  const utilization = exposure / (creditLimit / 1000);
  if (trust < 25 && utilization > 0.8) return { label: "BUST-OUT LIKELY", color: "bg-red-600", icon: AlertTriangle };
  if (trust < 40 || utilization > 0.7) return { label: "HIGH RISK", color: "bg-orange-500", icon: AlertTriangle };
  if (trust < 60) return { label: "WATCH", color: "bg-yellow-500", icon: Clock };
  return { label: "STABLE", color: "bg-emerald-500", icon: ShieldCheck };
}

// ── Custom tooltip ───────────────────────────────────────────────────────────────
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

// ── Main component ───────────────────────────────────────────────────────────────
export function DigitalTwinPage() {
  const [selectedAgency, setSelectedAgency] = useState("AG-001");
  const [simWeeks, setSimWeeks] = useState(6);
  const [creditCut, setCreditCut] = useState(0.3); // 30% reduction
  const [interventionWeek, setInterventionWeek] = useState<number | null>(2);
  const [simResult, setSimResult] = useState<ReturnType<typeof runSimulation> | null>(null);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const agency = AGENCIES[selectedAgency as keyof typeof AGENCIES];

  const runSim = useCallback(() => {
    setRunning(true);
    setAnimStep(0);
    const result = runSimulation(agency, simWeeks, creditCut, interventionWeek);
    setSimResult(result);
    setHasRun(true);

    // Animate points appearing one by one
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
    setHasRun(false);
    setAnimStep(0);
    setRunning(false);
  };

  // Compute visible projected points (animated)
  const visibleProjected = simResult ? simResult.projectedPoints.slice(0, animStep) : [];
  const chartData = simResult
    ? [...simResult.historicalPoints, ...visibleProjected]
    : [];

  // Final outcomes (after full run)
  const finalBaseline = simResult?.projectedPoints[simResult.projectedPoints.length - 1];
  const finalTwin = simResult?.projectedPoints[simResult.projectedPoints.length - 1];
  const baselineOutcome = finalBaseline
    ? getOutcome(finalBaseline.trust, finalBaseline.exposure, agency.creditLimit / 1000)
    : null;
  const twinOutcome = finalTwin
    ? getOutcome(finalTwin.twinTrust!, finalTwin.twinExposure!, agency.creditLimit / 1000)
    : null;

  const isFullyRendered = animStep >= simWeeks;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-6 h-6 text-[#003366]" />
            <h1 className="text-2xl font-bold text-[#003366]">Agency Digital Twin</h1>
            <Badge className="bg-purple-100 text-purple-700 border border-purple-200">PREDICTIVE</Badge>
          </div>
          <p className="text-gray-500 text-sm">
            Run a forward simulation of any agency's trajectory. Compare unchecked growth vs. your intervention.
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
            {running ? "Simulating…" : hasRun ? "Re-run Twin" : "Run Digital Twin"}
          </Button>
        </div>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Agency picker */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-1">
              <GitBranch className="w-4 h-4" /> Select Agency
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
            <p className="text-xs text-gray-400">{agency.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Trust:</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${agency.trustScore}%`,
                    background: agency.trustScore > 70 ? "#10b981" : agency.trustScore > 45 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
              <span className="text-xs font-semibold">{agency.trustScore}</span>
            </div>
          </CardContent>
        </Card>

        {/* Simulation params */}
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
              <Slider
                min={4} max={12} step={1}
                value={[simWeeks]}
                onValueChange={([v]) => { setSimWeeks(v); reset(); }}
                className="w-full"
              />
              <p className="text-xs text-gray-400">How far ahead to simulate</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Credit limit cut</span>
                <span className="font-semibold text-orange-600">-{Math.round(creditCut * 100)}%</span>
              </div>
              <Slider
                min={0} max={1} step={0.05}
                value={[creditCut]}
                onValueChange={([v]) => { setCreditCut(v); reset(); }}
                className="w-full"
              />
              <p className="text-xs text-gray-400">Reduce credit limit on intervention</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Intervene at week</span>
                <span className="font-semibold text-purple-600">
                  {interventionWeek === null ? "Never" : `W+${interventionWeek}`}
                </span>
              </div>
              <Slider
                min={0} max={simWeeks} step={1}
                value={[interventionWeek ?? 0]}
                onValueChange={([v]) => { setInterventionWeek(v === 0 ? null : v); reset(); }}
                className="w-full"
              />
              <p className="text-xs text-gray-400">0 = no intervention applied</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pre-run state */}
      {!hasRun && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-xl text-center"
        >
          <Cpu className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">Configure parameters above and click</p>
          <p className="text-[#003366] font-semibold text-lg mt-1">Run Digital Twin →</p>
          <p className="text-xs text-gray-400 mt-2 max-w-sm">
            The twin will project two futures: one where no action is taken, and one where your intervention is applied.
          </p>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {hasRun && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Outcome cards */}
            {isFullyRendered && finalBaseline && finalTwin && baselineOutcome && twinOutcome && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Baseline outcome */}
                <Card className="border-red-100 bg-red-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      Baseline Outcome
                      <Badge className="bg-gray-100 text-gray-500 text-xs">No Intervention</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${baselineOutcome.color}`}>
                        {baselineOutcome.label}
                      </span>
                      <span className="text-xs text-gray-400">in {simWeeks} weeks</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-400">Trust Score</p>
                        <p className="text-lg font-bold text-red-500">{Math.round(finalBaseline.trust)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Exposure</p>
                        <p className="text-lg font-bold text-red-500">₹{(finalBaseline.exposure! * 1000 / 100000).toFixed(1)}L</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bookings/wk</p>
                        <p className="text-lg font-bold text-red-500">{finalBaseline.actual}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Twin outcome */}
                <Card className="border-emerald-100 bg-emerald-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Twin Outcome
                      <Badge className="bg-purple-100 text-purple-600 text-xs">With Intervention</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${twinOutcome.color}`}>
                        {twinOutcome.label}
                      </span>
                      <span className="text-xs text-gray-400">credit cut -{Math.round(creditCut * 100)}% @ W+{interventionWeek}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-400">Trust Score</p>
                        <p className="text-lg font-bold text-emerald-600">{Math.round(finalTwin.twinTrust!)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Exposure</p>
                        <p className="text-lg font-bold text-emerald-600">₹{(finalTwin.twinExposure! * 1000 / 100000).toFixed(1)}L</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Bookings/wk</p>
                        <p className="text-lg font-bold text-emerald-600">{finalTwin.twin}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Booking volume chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Booking Volume — Actual vs. Twin Projection
                  {interventionWeek && (
                    <Badge className="bg-purple-100 text-purple-600 text-xs ml-2">
                      ↓ Intervention @ W+{interventionWeek}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
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
                    {/* Divider between history and projection */}
                    <ReferenceLine x="W+1" stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "NOW", fontSize: 10, fill: "#94a3b8" }} />
                    {interventionWeek && (
                      <ReferenceLine
                        x={`W+${interventionWeek}`}
                        stroke="#7c3aed"
                        strokeDasharray="4 2"
                        label={{ value: "INTERVENE", fontSize: 9, fill: "#7c3aed" }}
                      />
                    )}
                    <Area type="monotone" dataKey="actual" name="Baseline" stroke="#ef4444" fill="url(#gradActual)" dot={false} strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey="twin" name="With Intervention" stroke="#8b5cf6" fill="url(#gradTwin)" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trust & Exposure side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trust score evolution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#003366]">Trust Score Trajectory</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <ReferenceLine y={40} stroke="#fca5a5" strokeDasharray="3 3" label={{ value: "Danger", fontSize: 9, fill: "#ef4444" }} />
                      {interventionWeek && (
                        <ReferenceLine x={`W+${interventionWeek}`} stroke="#7c3aed" strokeDasharray="4 2" />
                      )}
                      <Line type="monotone" dataKey="trust" name="Baseline Trust" stroke="#ef4444" dot={false} strokeWidth={2} connectNulls />
                      <Line type="monotone" dataKey="twinTrust" name="Twin Trust" stroke="#8b5cf6" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Exposure evolution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#003366]">Unsettled Exposure (₹K)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradTwinExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      {interventionWeek && (
                        <ReferenceLine x={`W+${interventionWeek}`} stroke="#7c3aed" strokeDasharray="4 2" />
                      )}
                      <Area type="monotone" dataKey="exposure" name="Baseline Exp" stroke="#f97316" fill="url(#gradExp)" dot={false} strokeWidth={2} connectNulls />
                      <Area type="monotone" dataKey="twinExposure" name="Twin Exp" stroke="#8b5cf6" fill="url(#gradTwinExp)" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Insight strip */}
            {isFullyRendered && finalBaseline && finalTwin && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#003366] text-white rounded-xl p-4 flex items-center gap-4"
              >
                <Cpu className="w-8 h-8 text-blue-300 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold mb-0.5">Digital Twin Insight</p>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    {interventionWeek
                      ? `Intervening at W+${interventionWeek} with a ${Math.round(creditCut * 100)}% credit cut reduces projected exposure by
                        ₹${Math.round(((finalBaseline.exposure! - finalTwin.twinExposure!) * 1000) / 100000)}L and
                        recovers trust by ${Math.round(finalTwin.twinTrust! - finalBaseline.trust)} points
                        over ${simWeeks} weeks. Early action is ${finalTwin.twinExposure! < finalBaseline.exposure! ? "effective" : "marginal"} for this agency.`
                      : `No intervention applied. Baseline trajectory shows ${baselineOutcome?.label} outcome within ${simWeeks} weeks.
                        Add an intervention week and credit cut to model how TBO can prevent this outcome.`}
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
