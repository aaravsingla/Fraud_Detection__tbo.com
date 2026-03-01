import { useEffect, useState, useCallback } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Brain, Eye, Clock, DollarSign, XCircle, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { motion, AnimatePresence } from "motion/react";
import { computeBehavioralEntropy, analyzeBookingGaps, type BehavioralEntropyResult, type BookingGapResult } from "../services/riskApi";

const ENTROPY_SCENARIOS = {
  "AG-001": {
    name: "Wanderlust Travels",
    bookingTimeVariance: 0.08,
    ticketValueCV: 0.03,
    cancellationRegularity: 0.91,
    gapDistribution: [95, 102, 98, 115, 94, 108, 120, 99, 105, 112],
    lastMinuteCancellationRate: 0.62,
    label: "Behavioral Mimicry Detected",
  },
  "AG-002": {
    name: "Global Ventures Ltd",
    bookingTimeVariance: 0.78,
    ticketValueCV: 0.45,
    cancellationRegularity: 0.22,
    gapDistribution: [14, 28, 7, 45, 3, 60, 21, 35, 12, 8],
    lastMinuteCancellationRate: 0.08,
    label: "Natural Human Behavior",
  },
  "AG-003": {
    name: "SkyHigh Agencies",
    bookingTimeVariance: 0.41,
    ticketValueCV: 0.28,
    cancellationRegularity: 0.55,
    gapDistribution: [85, 92, 78, 95, 88, 73, 96, 84, 91, 80],
    lastMinuteCancellationRate: 0.38,
    label: "Partial Scripted Pattern",
  },
  "AG-004": {
    name: "Paradise Tours",
    bookingTimeVariance: 0.82,
    ticketValueCV: 0.52,
    cancellationRegularity: 0.18,
    gapDistribution: [7, 14, 21, 3, 45, 18, 9, 32, 6, 28],
    lastMinuteCancellationRate: 0.05,
    label: "Authentic Activity",
  },
};

export function BehavioralEntropyPage() {
  const [selectedAgency, setSelectedAgency] = useState("AG-001");
  const [entropy, setEntropy] = useState<BehavioralEntropyResult | null>(null);
  const [gaps, setGaps] = useState<BookingGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const scenario = ENTROPY_SCENARIOS[selectedAgency as keyof typeof ENTROPY_SCENARIOS];

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const [e, g] = await Promise.all([
        computeBehavioralEntropy({
          bookingTimeVariance: scenario.bookingTimeVariance,
          ticketValueCV: scenario.ticketValueCV,
          cancellationRegularity: scenario.cancellationRegularity,
        }),
        analyzeBookingGaps({
          gapDistribution: scenario.gapDistribution,
          lastMinuteCancellationRate: scenario.lastMinuteCancellationRate,
        }),
      ]);
      setEntropy(e);
      setGaps(g);
    } catch {
      // Synthetic fallback
      const entropyScore = Math.round(
        (0.4 * scenario.bookingTimeVariance +
         0.35 * Math.min(1, scenario.ticketValueCV / 0.5) +
         0.25 * (1 - scenario.cancellationRegularity)) * 100
      );
      setEntropy({
        entropyScore,
        mimicryDetected: entropyScore < 30,
        riskScore: 100 - entropyScore,
        components: {
          bookingTimeVariance: Math.round(scenario.bookingTimeVariance * 100),
          ticketValueDiversity: Math.round(Math.min(1, scenario.ticketValueCV / 0.5) * 100),
          cancellationNaturalness: Math.round((1 - scenario.cancellationRegularity) * 100),
        },
        notes: entropyScore < 30 ? ["Artificially uniform behavior detected."] : [],
      });
      const longGaps = scenario.gapDistribution.filter(g => g > 90).length;
      setGaps({
        avgGap: Math.round(scenario.gapDistribution.reduce((a, b) => a + b, 0) / scenario.gapDistribution.length),
        longGapRatio: Math.round((longGaps / scenario.gapDistribution.length) * 100),
        lastMinuteCancellationRate: Math.round(scenario.lastMinuteCancellationRate * 100),
        manipulationDetected: longGaps / scenario.gapDistribution.length > 0.6 && scenario.lastMinuteCancellationRate > 0.3,
        riskScore: Math.round((0.5 * longGaps / scenario.gapDistribution.length + 0.3 * scenario.lastMinuteCancellationRate) * 100),
        notes: [],
      });
    } finally {
      setLoading(false);
    }
  }, [selectedAgency]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  const radarData = entropy ? [
    { subject: "Time Variance", value: entropy.components.bookingTimeVariance, fullMark: 100 },
    { subject: "Value Diversity", value: entropy.components.ticketValueDiversity, fullMark: 100 },
    { subject: "Cancellation\nNaturalness", value: entropy.components.cancellationNaturalness, fullMark: 100 },
    { subject: "Booking\nGap Spread", value: 100 - (gaps?.longGapRatio ?? 0), fullMark: 100 },
    { subject: "Settlement\nPattern", value: 100 - (gaps?.lastMinuteCancellationRate ?? 0), fullMark: 100 },
  ] : [];

  const riskColor = !entropy ? "#999"
    : entropy.riskScore >= 70 ? "#C62828"
    : entropy.riskScore >= 40 ? "#FF6600"
    : "#2E7D32";

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366] flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Behavioral Entropy Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Detects scripted/automated behavior by measuring natural variation in activity patterns
          </p>
        </div>
        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ENTROPY_SCENARIOS).map(([id, s]) => (
              <SelectItem key={id} value={id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status banner */}
      <AnimatePresence mode="wait">
        {entropy && (
          <motion.div
            key={selectedAgency}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg border-l-4 flex items-center gap-3 ${
              entropy.mimicryDetected
                ? "bg-red-50 border-[#C62828]"
                : "bg-green-50 border-[#2E7D32]"
            }`}
          >
            {entropy.mimicryDetected ? (
              <XCircle className="w-5 h-5 text-[#C62828] flex-shrink-0" />
            ) : (
              <Eye className="w-5 h-5 text-[#2E7D32] flex-shrink-0" />
            )}
            <div>
              <div className={`font-semibold ${entropy.mimicryDetected ? "text-[#C62828]" : "text-[#2E7D32]"}`}>
                {scenario.label}
              </div>
              <div className="text-xs text-gray-600">
                Entropy score: {entropy.entropyScore}% — {entropy.mimicryDetected
                  ? "Behavior appears scripted or automated. Human agents show natural variation."
                  : "Natural human variation detected across all behavioral dimensions."}
              </div>
            </div>
            <div className="ml-auto">
              <Badge style={{ background: riskColor }} className="text-white text-xs">
                Risk: {entropy.riskScore}%
              </Badge>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-6">
        {/* Radar chart */}
        <div className="col-span-1 bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2 text-sm">Entropy Radar</h2>
          <p className="text-xs text-gray-500 mb-4">Higher = more natural/human-like</p>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-300 text-sm">Analyzing…</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`]} />
                <Radar
                  name="Entropy"
                  dataKey="value"
                  stroke={entropy?.mimicryDetected ? "#C62828" : "#2E7D32"}
                  fill={entropy?.mimicryDetected ? "#C62828" : "#2E7D32"}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Component breakdown */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Entropy Component Breakdown</h2>
            <div className="space-y-4">
              <EntropyComponent
                icon={<Clock className="w-4 h-4" />}
                label="Booking Time Variance"
                description="Measures randomness in when bookings are placed. Scripted bots book at uniform times."
                value={entropy?.components.bookingTimeVariance ?? 0}
                inverse={false}
                loading={loading}
              />
              <EntropyComponent
                icon={<DollarSign className="w-4 h-4" />}
                label="Ticket Value Diversity"
                description="Natural agencies show varied ticket prices. Automated fraud often uses near-identical values."
                value={entropy?.components.ticketValueDiversity ?? 0}
                inverse={false}
                loading={loading}
              />
              <EntropyComponent
                icon={<XCircle className="w-4 h-4" />}
                label="Cancellation Naturalness"
                description="Real agencies cancel irregularly. Scripted behavior shows too-regular cancellation patterns."
                value={entropy?.components.cancellationNaturalness ?? 0}
                inverse={false}
                loading={loading}
              />
            </div>
          </div>

          {/* Booking gap analysis */}
          {gaps && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Booking-to-Travel Gap Analysis</h2>
                {gaps.manipulationDetected && (
                  <Badge className="bg-[#C62828] text-white text-xs">Settlement Delay Detected</Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <MetricBox label="Avg Booking Gap" value={`${gaps.avgGap} days`} color={gaps.avgGap > 90 ? "#C62828" : "#003366"} />
                <MetricBox label="Far-Future (>90d)" value={`${gaps.longGapRatio}%`} color={gaps.longGapRatio > 60 ? "#C62828" : "#FF6600"} />
                <MetricBox label="Late Cancellations" value={`${gaps.lastMinuteCancellationRate}%`} color={gaps.lastMinuteCancellationRate > 30 ? "#C62828" : "#2E7D32"} />
              </div>
              {gaps.notes.map((note, i) => (
                <div key={i} className="mt-3 p-2 bg-red-50 rounded border border-red-100 text-xs text-gray-700 flex gap-2">
                  <XCircle className="w-3.5 h-3.5 text-[#C62828] mt-0.5 flex-shrink-0" />
                  {note}
                </div>
              ))}
              {!gaps.notes.length && (
                <p className="mt-3 text-xs text-gray-400">Gap distribution within normal range.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 bg-white border rounded-lg">
        <button className="flex items-center justify-between w-full p-4" onClick={() => setShowDetails(!showDetails)}>
          <h2 className="font-semibold">How Behavioral Entropy Works</h2>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showDetails && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 grid grid-cols-3 gap-4 text-xs text-gray-600">
                <div className="p-3 bg-blue-50 rounded">
                  <div className="font-semibold text-[#003366] mb-1">Shannon Entropy Principle</div>
                  Genuine human activity contains natural randomness. Automated fraud scripts produce statistically improbable uniformity across multiple behavioral dimensions simultaneously.
                </div>
                <div className="p-3 bg-orange-50 rounded">
                  <div className="font-semibold text-[#FF6600] mb-1">Multi-Dimensional Scoring</div>
                  No single signal is sufficient. The system combines time entropy, value distribution, and cancellation regularity — all three must be uniform to trigger a mimicry flag.
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <div className="font-semibold text-[#2E7D32] mb-1">Why This Beats Rules</div>
                  Rule-based systems can be gamed by adding noise to one dimension. Entropy analysis requires naturalness across ALL dimensions, making it much harder to defeat.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EntropyComponent({ icon, label, description, value, loading }: {
  icon: React.ReactNode; label: string; description: string; value: number; inverse: boolean; loading: boolean;
}) {
  const color = value >= 60 ? "#2E7D32" : value >= 30 ? "#FF6600" : "#C62828";
  return (
    <div className="flex gap-3">
      <div className="p-2 rounded-lg bg-gray-50 flex-shrink-0" style={{ color }}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-sm font-mono font-bold" style={{ color }}>
            {loading ? "…" : `${value}%`}
          </span>
        </div>
        <Progress
          value={loading ? 0 : value}
          className="h-2 mb-1"
          // @ts-ignore
          style={{ "--progress-color": color }}
        />
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-lg border bg-gray-50">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}
