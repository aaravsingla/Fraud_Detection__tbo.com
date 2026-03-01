import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import {
  Layers,
  Play,
  RotateCcw,
  Brain,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Sparkles,
  Target,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { motion, AnimatePresence } from "motion/react";

// ── Types ────────────────────────────────────────────────────────────────────────
type PolicyAction = {
  action: string;
  probability: number;
  expected_reward: number;
  risk_impact: string;
  color: string;
};

type ScenarioResult = {
  agencyId: string;
  agencyName: string;
  description: string;
  riskProfile: "critical" | "moderate" | "low";
  // Actor outputs
  actorActions: PolicyAction[];
  selectedAction: string;
  // Critic outputs
  criticValueEstimate: number;
  advantageScore: number;
  tdError: number;
  // Training curve
  rewardHistory: { episode: number; reward: number; baseline: number }[];
  // State features (radar)
  stateFeatures: { feature: string; value: number; fullMark: number }[];
  // Critic reasoning steps
  criticReasoning: string[];
  // Final verdict
  verdict: string;
  verdictColor: string;
};

// ── Mock scenario data ───────────────────────────────────────────────────────────
const SCENARIOS: Record<string, ScenarioResult> = {
  "AG-001": {
    agencyId: "AG-001",
    agencyName: "Wanderlust Travels",
    description: "Bust-out candidate — trust collapsing, velocity spiking",
    riskProfile: "critical",
    actorActions: [
      { action: "FREEZE_CREDIT", probability: 0.71, expected_reward: 0.84, risk_impact: "Halts exposure growth immediately", color: "#ef4444" },
      { action: "REDUCE_LIMIT_50%", probability: 0.19, expected_reward: 0.52, risk_impact: "Partial containment, slower response", color: "#f97316" },
      { action: "FLAG_FOR_REVIEW", probability: 0.07, expected_reward: 0.28, risk_impact: "Minimal impact, exposure continues", color: "#eab308" },
      { action: "MONITOR_ONLY", probability: 0.03, expected_reward: -0.14, risk_impact: "No containment — high loss risk", color: "#94a3b8" },
    ],
    selectedAction: "FREEZE_CREDIT",
    criticValueEstimate: -0.62,
    advantageScore: 1.46,
    tdError: 0.38,
    rewardHistory: [
      { episode: 1, reward: -0.8, baseline: -0.6 },
      { episode: 5, reward: -0.45, baseline: -0.5 },
      { episode: 10, reward: -0.1, baseline: -0.3 },
      { episode: 20, reward: 0.3, baseline: 0.1 },
      { episode: 40, reward: 0.55, baseline: 0.4 },
      { episode: 60, reward: 0.72, baseline: 0.6 },
      { episode: 80, reward: 0.81, baseline: 0.75 },
      { episode: 100, reward: 0.84, baseline: 0.82 },
    ],
    stateFeatures: [
      { feature: "Trust Score", value: 22, fullMark: 100 },
      { feature: "Velocity", value: 89, fullMark: 100 },
      { feature: "Exposure", value: 92, fullMark: 100 },
      { feature: "Settlement", value: 18, fullMark: 100 },
      { feature: "Network Risk", value: 74, fullMark: 100 },
      { feature: "Identity", value: 31, fullMark: 100 },
    ],
    criticReasoning: [
      "State value V(s) = −0.62 — environment is highly adversarial",
      "Advantage A(FREEZE_CREDIT) = +1.46 — far exceeds baseline policy",
      "TD-error δ = 0.38 — large, policy still learning this edge case",
      "Policy gradient pushes weight toward FREEZE_CREDIT (π = 71%)",
    ],
    verdict: "FREEZE CREDIT IMMEDIATELY",
    verdictColor: "bg-red-600",
  },

  "AG-002": {
    agencyId: "AG-002",
    agencyName: "Global Ventures Ltd",
    description: "Stable agency — consistent settlements, healthy trust",
    riskProfile: "low",
    actorActions: [
      { action: "INCREASE_LIMIT_10%", probability: 0.54, expected_reward: 0.78, risk_impact: "Reward loyalty, grow relationship", color: "#10b981" },
      { action: "MAINTAIN_STATUS", probability: 0.38, expected_reward: 0.61, risk_impact: "No change, stable oversight", color: "#3b82f6" },
      { action: "FLAG_FOR_REVIEW", probability: 0.05, expected_reward: 0.12, risk_impact: "Unnecessary friction", color: "#eab308" },
      { action: "REDUCE_LIMIT_20%", probability: 0.03, expected_reward: -0.42, risk_impact: "Damages trust, loses revenue", color: "#94a3b8" },
    ],
    selectedAction: "INCREASE_LIMIT_10%",
    criticValueEstimate: 0.74,
    advantageScore: 0.17,
    tdError: 0.08,
    rewardHistory: [
      { episode: 1, reward: 0.3, baseline: 0.2 },
      { episode: 5, reward: 0.48, baseline: 0.4 },
      { episode: 10, reward: 0.55, baseline: 0.5 },
      { episode: 20, reward: 0.63, baseline: 0.6 },
      { episode: 40, reward: 0.7, baseline: 0.68 },
      { episode: 60, reward: 0.74, baseline: 0.72 },
      { episode: 80, reward: 0.77, baseline: 0.76 },
      { episode: 100, reward: 0.78, baseline: 0.77 },
    ],
    stateFeatures: [
      { feature: "Trust Score", value: 82, fullMark: 100 },
      { feature: "Velocity", value: 27, fullMark: 100 },
      { feature: "Exposure", value: 31, fullMark: 100 },
      { feature: "Settlement", value: 88, fullMark: 100 },
      { feature: "Network Risk", value: 12, fullMark: 100 },
      { feature: "Identity", value: 91, fullMark: 100 },
    ],
    criticReasoning: [
      "State value V(s) = +0.74 — environment strongly favourable",
      "Advantage A(INCREASE_LIMIT_10%) = +0.17 — marginal gain over baseline",
      "TD-error δ = 0.08 — policy well-converged, low uncertainty",
      "Actor confident: limit increase maximises long-term expected return",
    ],
    verdict: "REWARD — INCREASE CREDIT LIMIT",
    verdictColor: "bg-emerald-600",
  },

  "AG-003": {
    agencyId: "AG-003",
    agencyName: "SkyHigh Agencies",
    description: "Watch state — gradual acceleration, mixed signals",
    riskProfile: "moderate",
    actorActions: [
      { action: "ENHANCED_MONITORING", probability: 0.45, expected_reward: 0.41, risk_impact: "Observe without disruption", color: "#8b5cf6" },
      { action: "REDUCE_LIMIT_20%", probability: 0.33, expected_reward: 0.38, risk_impact: "Preemptive containment", color: "#f97316" },
      { action: "MAINTAIN_STATUS", probability: 0.14, expected_reward: 0.22, risk_impact: "Risk of late reaction", color: "#3b82f6" },
      { action: "REQUEST_DOCS", probability: 0.08, expected_reward: 0.19, risk_impact: "Slows bookings, agency friction", color: "#eab308" },
    ],
    selectedAction: "ENHANCED_MONITORING",
    criticValueEstimate: 0.18,
    advantageScore: 0.23,
    tdError: 0.21,
    rewardHistory: [
      { episode: 1, reward: -0.2, baseline: -0.1 },
      { episode: 5, reward: 0.05, baseline: 0.0 },
      { episode: 10, reward: 0.15, baseline: 0.1 },
      { episode: 20, reward: 0.22, baseline: 0.18 },
      { episode: 40, reward: 0.3, baseline: 0.28 },
      { episode: 60, reward: 0.35, baseline: 0.33 },
      { episode: 80, reward: 0.39, baseline: 0.38 },
      { episode: 100, reward: 0.41, baseline: 0.40 },
    ],
    stateFeatures: [
      { feature: "Trust Score", value: 61, fullMark: 100 },
      { feature: "Velocity", value: 52, fullMark: 100 },
      { feature: "Exposure", value: 58, fullMark: 100 },
      { feature: "Settlement", value: 49, fullMark: 100 },
      { feature: "Network Risk", value: 44, fullMark: 100 },
      { feature: "Identity", value: 63, fullMark: 100 },
    ],
    criticReasoning: [
      "State value V(s) = +0.18 — ambiguous environment, mixed signals",
      "Advantage A(ENHANCED_MONITORING) = +0.23 — modest but clear winner",
      "TD-error δ = 0.21 — moderate uncertainty, more episodes needed",
      "Policy undecided between monitoring and reduction — human review advised",
    ],
    verdict: "WATCH — ENHANCED MONITORING",
    verdictColor: "bg-purple-600",
  },
};

// ── Subcomponents ────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function ActorPanel({ scenario }: { scenario: ScenarioResult }) {
  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
          <Brain className="w-4 h-4 text-blue-500" />
          Actor — Policy Network
          <Badge className="bg-blue-50 text-blue-600 border border-blue-100 text-xs ml-auto">π(a|s)</Badge>
        </CardTitle>
        <p className="text-xs text-gray-400">Outputs action probabilities from current state</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {scenario.actorActions.map((a, i) => (
          <motion.div
            key={a.action}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-lg p-3 border ${a.action === scenario.selectedAction ? "border-[#003366] bg-[#003366]/5" : "border-gray-100 bg-gray-50/50"}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {a.action === scenario.selectedAction
                  ? <CheckCircle className="w-3.5 h-3.5 text-[#003366]" />
                  : <XCircle className="w-3.5 h-3.5 text-gray-300" />}
                <span className={`text-xs font-semibold ${a.action === scenario.selectedAction ? "text-[#003366]" : "text-gray-500"}`}>
                  {a.action}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">π = {(a.probability * 100).toFixed(0)}%</span>
                {a.action === scenario.selectedAction && (
                  <Badge className="bg-[#003366] text-white text-xs px-1.5">SELECTED</Badge>
                )}
              </div>
            </div>
            <Progress value={a.probability * 100} className="h-1.5 mb-1" style={{ "--progress-color": a.color } as any} />
            <p className="text-xs text-gray-400">{a.risk_impact}</p>
            <p className="text-xs text-gray-500 mt-0.5">Expected reward: <span className="font-semibold" style={{ color: a.color }}>{a.expected_reward > 0 ? "+" : ""}{a.expected_reward.toFixed(2)}</span></p>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

function CriticPanel({ scenario }: { scenario: ScenarioResult }) {
  const vColor = scenario.criticValueEstimate > 0.4 ? "#10b981" : scenario.criticValueEstimate > 0 ? "#f59e0b" : "#ef4444";
  return (
    <Card className="border-purple-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-500" />
          Critic — Value Network
          <Badge className="bg-purple-50 text-purple-600 border border-purple-100 text-xs ml-auto">V(s)</Badge>
        </CardTitle>
        <p className="text-xs text-gray-400">Evaluates how good the current state is</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-400 mb-1">State Value V(s)</p>
            <p className="text-xl font-bold" style={{ color: vColor }}>
              {scenario.criticValueEstimate > 0 ? "+" : ""}{scenario.criticValueEstimate.toFixed(2)}
            </p>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-400 mb-1">Advantage A</p>
            <p className="text-xl font-bold text-blue-600">
              +{scenario.advantageScore.toFixed(2)}
            </p>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-400 mb-1">TD-Error δ</p>
            <p className="text-xl font-bold text-orange-500">
              {scenario.tdError.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Reasoning steps */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Critic Reasoning</p>
          <div className="space-y-2">
            {scenario.criticReasoning.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex items-start gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold">
                  {i + 1}
                </span>
                <p className="text-xs text-gray-600 leading-relaxed">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Reward history chart */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Policy Reward Convergence</p>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={scenario.rewardHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="episode" tick={{ fontSize: 10 }} label={{ value: "Episode", position: "insideBottom", offset: -2, fontSize: 10 }} />
              <YAxis domain={[-1, 1]} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Line type="monotone" dataKey="reward" name="Policy Reward" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#cbd5e1" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function StatePanel({ scenario }: { scenario: ScenarioResult }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
          <Gauge className="w-4 h-4 text-gray-500" />
          State Space — Input to Both Networks
        </CardTitle>
        <p className="text-xs text-gray-400">Normalised feature vector fed into actor & critic</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={scenario.stateFeatures}>
            <PolarGrid stroke="#f0f0f0" />
            <PolarAngleAxis dataKey="feature" tick={{ fontSize: 10 }} />
            <Radar name="State" dataKey="value" stroke="#003366" fill="#003366" fillOpacity={0.15} strokeWidth={2} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="space-y-2 my-auto">
          {scenario.stateFeatures.map((f) => (
            <div key={f.feature}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-500">{f.feature}</span>
                <span className="font-semibold text-[#003366]">{f.value}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${f.value}%`,
                    background: f.value > 70 ? (["Velocity", "Exposure", "Network Risk"].includes(f.feature) ? "#ef4444" : "#10b981") :
                                f.value > 40 ? "#f59e0b" :
                                (["Trust Score", "Settlement", "Identity"].includes(f.feature) ? "#ef4444" : "#10b981"),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────────
export function ActorCriticPage() {
  const [selectedAgency, setSelectedAgency] = useState("AG-001");
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);

  const scenario = SCENARIOS[selectedAgency];

  const loadSteps = [
    "Encoding state vector…",
    "Forward pass — Critic network…",
    "Estimating V(s)…",
    "Forward pass — Actor network…",
    "Sampling policy π(a|s)…",
    "Computing advantage A = Q - V…",
    "Policy selected ✓",
  ];

  const runInference = () => {
    setHasRun(false);
    setLoading(true);
    setLoadStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setLoadStep(step);
      if (step >= loadSteps.length) {
        clearInterval(interval);
        setLoading(false);
        setHasRun(true);
      }
    }, 320);
  };

  const reset = () => {
    setHasRun(false);
    setLoading(false);
    setLoadStep(0);
  };

  const riskBadge = {
    critical: "bg-red-100 text-red-700 border-red-200",
    moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  }[scenario.riskProfile];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-6 h-6 text-[#003366]" />
            <h1 className="text-2xl font-bold text-[#003366]">Actor-Critic Policy Engine</h1>
            <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-200">REINFORCEMENT LEARNING</Badge>
          </div>
          <p className="text-gray-500 text-sm">
            Two-network RL system — Actor recommends actions, Critic evaluates state value to guide policy updates.
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
            onClick={runInference}
            disabled={loading}
            className="bg-[#003366] hover:bg-[#004080] text-white gap-1"
          >
            <Play className="w-4 h-4" />
            {loading ? "Running Inference…" : hasRun ? "Re-run Inference" : "Run A-C Inference"}
          </Button>
        </div>
      </div>

      {/* Architecture explainer */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center gap-2 text-xs text-center">
          <div className="bg-white border border-blue-200 rounded-lg px-3 py-2">
            <p className="font-semibold text-[#003366]">Environment</p>
            <p className="text-gray-400">Agency state s</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className="bg-blue-500 text-white rounded-lg px-3 py-2">
            <p className="font-semibold">Actor π(a|s)</p>
            <p className="text-blue-200">Action probs</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className="bg-purple-500 text-white rounded-lg px-3 py-2">
            <p className="font-semibold">Critic V(s)</p>
            <p className="text-purple-200">State value</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className="bg-white border border-purple-200 rounded-lg px-3 py-2">
            <p className="font-semibold text-[#003366]">Advantage A</p>
            <p className="text-gray-400">Q(s,a) − V(s)</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <div className="bg-[#003366] text-white rounded-lg px-3 py-2">
            <p className="font-semibold">Decision</p>
            <p className="text-blue-200">Policy action</p>
          </div>
        </div>
      </div>

      {/* Agency selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-medium">Agency:</span>
              <Select value={selectedAgency} onValueChange={(v) => { setSelectedAgency(v); reset(); }}>
                <SelectTrigger className="w-52 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SCENARIOS).map((s) => (
                    <SelectItem key={s.agencyId} value={s.agencyId}>{s.agencyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge className={`border text-xs ${riskBadge}`}>
              {scenario.riskProfile.toUpperCase()} RISK
            </Badge>
            <p className="text-xs text-gray-400">{scenario.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Loading animation */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <p className="text-sm font-semibold text-indigo-700">A-C Inference Running</p>
            </div>
            <div className="space-y-2">
              {loadSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: i < loadStep ? 1 : 0.3 }}
                  className="flex items-center gap-2"
                >
                  {i < loadStep
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                  <span className={`text-xs ${i < loadStep ? "text-gray-700" : "text-gray-400"}`}>{step}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-run placeholder */}
      {!hasRun && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-center"
        >
          <Layers className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">Select an agency and click</p>
          <p className="text-[#003366] font-semibold text-lg mt-1">Run A-C Inference →</p>
          <p className="text-xs text-gray-400 mt-2 max-w-sm">
            The actor outputs an action distribution. The critic evaluates current state value. Together they compute the optimal policy.
          </p>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {hasRun && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* State space */}
            <StatePanel scenario={scenario} />

            {/* Actor + Critic side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ActorPanel scenario={scenario} />
              <CriticPanel scenario={scenario} />
            </div>

            {/* Final verdict strip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className={`${scenario.verdictColor} text-white rounded-xl p-5 flex items-center justify-between`}
            >
              <div className="flex items-center gap-4">
                <TrendingUp className="w-8 h-8 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-70 mb-0.5">Actor-Critic Final Decision</p>
                  <p className="text-xl font-bold tracking-wide">{scenario.verdict}</p>
                  <p className="text-sm opacity-75 mt-0.5">
                    Policy confidence {(scenario.actorActions[0].probability * 100).toFixed(0)}% · Advantage +{scenario.advantageScore.toFixed(2)} · TD-error δ = {scenario.tdError.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-60 mb-1">Expected reward</p>
                <p className="text-3xl font-black">{scenario.actorActions[0].expected_reward.toFixed(2)}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
