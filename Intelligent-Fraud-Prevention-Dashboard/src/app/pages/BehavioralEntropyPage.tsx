import { useEffect, useState, useCallback } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { Brain, Eye, Clock, DollarSign, XCircle, ChevronDown, BarChart2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { computeBehavioralEntropy, analyzeBookingGaps, type BehavioralEntropyResult, type BookingGapResult } from "../services/riskApi";

// ── HHI mock data ────────────────────────────────────────────────────────────────
const HHI_DATA = {
  "AG-001": {
    routes: [{ name: "DEL→DXB", share: 0.61 }, { name: "BOM→DXB", share: 0.22 }, { name: "DEL→SIN", share: 0.09 }, { name: "Others", share: 0.08 }],
    airlines: [{ name: "IndiGo", share: 0.71 }, { name: "Air Arabia", share: 0.18 }, { name: "SpiceJet", share: 0.07 }, { name: "Others", share: 0.04 }],
    ticketBands: [{ name: "₹8-9k", share: 0.68 }, { name: "₹9-10k", share: 0.21 }, { name: "₹10-12k", share: 0.07 }, { name: "₹12k+", share: 0.04 }],
  },
  "AG-002": {
    routes: [{ name: "BOM→LHR", share: 0.18 }, { name: "DEL→JFK", share: 0.16 }, { name: "BLR→SIN", share: 0.14 }, { name: "DEL→DXB", share: 0.12 }, { name: "Others", share: 0.40 }],
    airlines: [{ name: "Air India", share: 0.22 }, { name: "Emirates", share: 0.19 }, { name: "IndiGo", share: 0.18 }, { name: "Lufthansa", share: 0.15 }, { name: "Others", share: 0.26 }],
    ticketBands: [{ name: "₹5-10k", share: 0.21 }, { name: "₹10-20k", share: 0.24 }, { name: "₹20-40k", share: 0.28 }, { name: "₹40k+", share: 0.27 }],
  },
  "AG-003": {
    routes: [{ name: "DEL→DXB", share: 0.38 }, { name: "BOM→DXB", share: 0.29 }, { name: "DEL→AUH", share: 0.18 }, { name: "Others", share: 0.15 }],
    airlines: [{ name: "IndiGo", share: 0.44 }, { name: "Air Arabia", share: 0.31 }, { name: "GoAir", share: 0.15 }, { name: "Others", share: 0.10 }],
    ticketBands: [{ name: "₹7-9k", share: 0.45 }, { name: "₹9-11k", share: 0.33 }, { name: "₹11-14k", share: 0.14 }, { name: "₹14k+", share: 0.08 }],
  },
  "AG-004": {
    routes: [{ name: "BOM→BKK", share: 0.19 }, { name: "DEL→SIN", share: 0.17 }, { name: "BLR→KUL", share: 0.14 }, { name: "HYD→SIN", share: 0.13 }, { name: "Others", share: 0.37 }],
    airlines: [{ name: "AirAsia", share: 0.24 }, { name: "IndiGo", share: 0.21 }, { name: "Vistara", share: 0.19 }, { name: "Scoot", share: 0.16 }, { name: "Others", share: 0.20 }],
    ticketBands: [{ name: "₹6-10k", share: 0.26 }, { name: "₹10-15k", share: 0.28 }, { name: "₹15-25k", share: 0.24 }, { name: "₹25k+", share: 0.22 }],
  },
};

function calcHHI(shares: { share: number }[]) {
  return Math.round(shares.reduce((sum, s) => sum + (s.share * 100) ** 2, 0));
}

function hhiLabel(hhi: number) {
  if (hhi > 5000) return { label: "Highly Concentrated", color: "#ef4444", borderColor: "#fecaca" };
  if (hhi > 2500) return { label: "Moderately Concentrated", color: "#f97316", borderColor: "#fed7aa" };
  if (hhi > 1500) return { label: "Mildly Concentrated", color: "#eab308", borderColor: "#fef08a" };
  return { label: "Diversified", color: "#10b981", borderColor: "#a7f3d0" };
}

function HHIPanel({ agencyId }: { agencyId: string }) {
  const data = HHI_DATA[agencyId as keyof typeof HHI_DATA];
  const routeHHI = calcHHI(data.routes);
  const airlineHHI = calcHHI(data.airlines);
  const ticketHHI = calcHHI(data.ticketBands);
  const compositeHHI = Math.round((routeHHI + airlineHHI + ticketHHI) / 3);
  const { label, color } = hhiLabel(compositeHHI);

  const dims = [
    { title: "Route Concentration", hhi: routeHHI, data: data.routes },
    { title: "Airline Concentration", hhi: airlineHHI, data: data.airlines },
    { title: "Ticket Value Bands", hhi: ticketHHI, data: data.ticketBands },
  ];

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm text-[#003366] flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Herfindahl-Hirschman Index (HHI) — Booking Concentration
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Composite HHI:</span>
            <span className="text-lg font-black" style={{ color }}>{compositeHHI.toLocaleString()}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border font-semibold" style={{ color, borderColor: color + "55", background: color + "11" }}>
              {label}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Measures booking concentration across routes, airlines & ticket values. HHI &gt; 2,500 signals scripted patterns.
          Scale: 0 (perfectly diverse) → 10,000 (single dominant choice).
        </p>
      </CardHeader>
      <CardContent>
        {/* Gauge strip */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>0</span><span>1,500</span><span>2,500</span><span>5,000</span><span>10,000</span>
          </div>
          <div className="relative h-3 rounded-full overflow-visible" style={{ background: "linear-gradient(to right, #a7f3d0, #fef08a, #fed7aa, #fecaca, #ef4444)" }}>
            <motion.div
              initial={{ left: "0%" }}
              animate={{ left: `${Math.min(97, (compositeHHI / 10000) * 100)}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg z-10"
              style={{ background: color }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-300 mt-0.5">
            <span>Diverse</span><span>Mild</span><span>Moderate</span><span>High</span><span>Monopoly</span>
          </div>
        </div>

        {/* Three charts */}
        <div className="grid grid-cols-3 gap-4">
          {dims.map((dim) => {
            const { color: dc } = hhiLabel(dim.hhi);
            return (
              <div key={dim.title}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-semibold text-gray-600">{dim.title}</p>
                  <span className="text-xs font-black" style={{ color: dc }}>{dim.hhi.toLocaleString()}</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={dim.data} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                    <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(0)}%`, "Share"]} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="share" radius={[3, 3, 0, 0]}>
                      {dim.data.map((_, i) => (
                        <Cell key={i} fill={[dc, dc + "bb", dc + "77", "#e2e8f0"][Math.min(i, 3)]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-center mt-1" style={{ color: dc }}>{hhiLabel(dim.hhi).label}</p>
              </div>
            );
          })}
        </div>

        {compositeHHI > 2500 && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">
              <span className="font-semibold">Concentration alert: </span>
              HHI of {compositeHHI.toLocaleString()} — this agency books a suspiciously narrow set of routes and airlines.
              Legitimate travel agencies show natural diversification. This pattern is consistent with scripted bust-out behaviour
              where fraudsters book a single cheap route repeatedly to maximise ticket volume before default.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Entropy scenarios (unchanged) ────────────────────────────────────────────────
const ENTROPY_SCENARIOS = {
  "AG-001": { name: "Wanderlust Travels", bookingTimeVariance: 0.08, ticketValueCV: 0.03, cancellationRegularity: 0.91, gapDistribution: [95, 102, 98, 115, 94, 108, 120, 99, 105, 112], lastMinuteCancellationRate: 0.62, label: "Behavioral Mimicry Detected" },
  "AG-002": { name: "Global Ventures Ltd", bookingTimeVariance: 0.78, ticketValueCV: 0.45, cancellationRegularity: 0.22, gapDistribution: [14, 28, 7, 45, 3, 60, 21, 35, 12, 8], lastMinuteCancellationRate: 0.08, label: "Natural Human Behavior" },
  "AG-003": { name: "SkyHigh Agencies", bookingTimeVariance: 0.41, ticketValueCV: 0.28, cancellationRegularity: 0.55, gapDistribution: [85, 92, 78, 95, 88, 73, 96, 84, 91, 80], lastMinuteCancellationRate: 0.38, label: "Partial Scripted Pattern" },
  "AG-004": { name: "Paradise Tours", bookingTimeVariance: 0.82, ticketValueCV: 0.52, cancellationRegularity: 0.18, gapDistribution: [7, 14, 21, 3, 45, 18, 9, 32, 6, 28], lastMinuteCancellationRate: 0.05, label: "Authentic Activity" },
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
        computeBehavioralEntropy({ bookingTimeVariance: scenario.bookingTimeVariance, ticketValueCV: scenario.ticketValueCV, cancellationRegularity: scenario.cancellationRegularity }),
        analyzeBookingGaps({ gapDistribution: scenario.gapDistribution, lastMinuteCancellationRate: scenario.lastMinuteCancellationRate }),
      ]);
      setEntropy(e); setGaps(g);
    } catch {
      const entropyScore = Math.round((0.4 * scenario.bookingTimeVariance + 0.35 * Math.min(1, scenario.ticketValueCV / 0.5) + 0.25 * (1 - scenario.cancellationRegularity)) * 100);
      setEntropy({ entropyScore, mimicryDetected: entropyScore < 30, riskScore: 100 - entropyScore, components: { bookingTimeVariance: Math.round(scenario.bookingTimeVariance * 100), ticketValueDiversity: Math.round(Math.min(1, scenario.ticketValueCV / 0.5) * 100), cancellationNaturalness: Math.round((1 - scenario.cancellationRegularity) * 100) }, notes: entropyScore < 30 ? ["Artificially uniform behavior detected."] : [] });
      const longGaps = scenario.gapDistribution.filter((g) => g > 90).length;
      setGaps({ avgGap: Math.round(scenario.gapDistribution.reduce((a, b) => a + b, 0) / scenario.gapDistribution.length), longGapRatio: Math.round((longGaps / scenario.gapDistribution.length) * 100), lastMinuteCancellationRate: Math.round(scenario.lastMinuteCancellationRate * 100), manipulationDetected: longGaps / scenario.gapDistribution.length > 0.6 && scenario.lastMinuteCancellationRate > 0.3, riskScore: Math.round((0.5 * (longGaps / scenario.gapDistribution.length) + 0.3 * scenario.lastMinuteCancellationRate) * 100), notes: [] });
    } finally { setLoading(false); }
  }, [selectedAgency]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  const radarData = entropy ? [
    { subject: "Time Variance", value: entropy.components.bookingTimeVariance, fullMark: 100 },
    { subject: "Value Diversity", value: entropy.components.ticketValueDiversity, fullMark: 100 },
    { subject: "Cancellation\nNaturalness", value: entropy.components.cancellationNaturalness, fullMark: 100 },
    { subject: "Booking\nGap Spread", value: 100 - (gaps?.longGapRatio ?? 0), fullMark: 100 },
    { subject: "Settlement\nPattern", value: 100 - (gaps?.lastMinuteCancellationRate ?? 0), fullMark: 100 },
  ] : [];

  const riskColor = !entropy ? "#999" : entropy.riskScore >= 70 ? "#C62828" : entropy.riskScore >= 40 ? "#FF6600" : "#2E7D32";

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366] flex items-center gap-2">
            <Brain className="w-6 h-6" /> Behavioral Entropy Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">Detects scripted/automated behavior by measuring natural variation in activity patterns</p>
        </div>
        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ENTROPY_SCENARIOS).map(([id, s]) => (
              <SelectItem key={id} value={id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence mode="wait">
        {entropy && (
          <motion.div key={selectedAgency} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg border-l-4 flex items-center gap-3 ${entropy.mimicryDetected ? "bg-red-50 border-[#C62828]" : "bg-green-50 border-[#2E7D32]"}`}>
            {entropy.mimicryDetected ? <XCircle className="w-5 h-5 text-[#C62828] flex-shrink-0" /> : <Eye className="w-5 h-5 text-[#2E7D32] flex-shrink-0" />}
            <div>
              <div className={`font-semibold ${entropy.mimicryDetected ? "text-[#C62828]" : "text-[#2E7D32]"}`}>{scenario.label}</div>
              <div className="text-xs text-gray-600">Entropy score: {entropy.entropyScore}% — {entropy.mimicryDetected ? "Behavior appears scripted or automated." : "Natural human variation detected."}</div>
            </div>
            <div className="ml-auto"><Badge style={{ background: riskColor }} className="text-white text-xs">Risk: {entropy.riskScore}%</Badge></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2 text-sm">Entropy Radar</h2>
          <p className="text-xs text-gray-500 mb-4">Higher = more natural/human-like</p>
          {loading ? <div className="h-64 flex items-center justify-center text-gray-300 text-sm">Analyzing…</div> : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6B7280" }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`]} />
                <Radar name="Entropy" dataKey="value" stroke={entropy?.mimicryDetected ? "#C62828" : "#2E7D32"} fill={entropy?.mimicryDetected ? "#C62828" : "#2E7D32"} fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Entropy Component Breakdown</h2>
            <div className="space-y-4">
              <EntropyComponent icon={<Clock className="w-4 h-4" />} label="Booking Time Variance" description="Scripted bots book at uniform times. Natural agents show randomness." value={entropy?.components.bookingTimeVariance ?? 0} inverse={false} loading={loading} />
              <EntropyComponent icon={<DollarSign className="w-4 h-4" />} label="Ticket Value Diversity" description="Automated fraud often uses near-identical ticket values." value={entropy?.components.ticketValueDiversity ?? 0} inverse={false} loading={loading} />
              <EntropyComponent icon={<XCircle className="w-4 h-4" />} label="Cancellation Naturalness" description="Scripted behavior shows too-regular cancellation patterns." value={entropy?.components.cancellationNaturalness ?? 0} inverse={false} loading={loading} />
            </div>
          </div>
          {gaps && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Booking-to-Travel Gap Analysis</h2>
                {gaps.manipulationDetected && <Badge className="bg-[#C62828] text-white text-xs">Settlement Delay Detected</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <MetricBox label="Avg Booking Gap" value={`${gaps.avgGap} days`} color={gaps.avgGap > 90 ? "#C62828" : "#003366"} />
                <MetricBox label="Far-Future (>90d)" value={`${gaps.longGapRatio}%`} color={gaps.longGapRatio > 60 ? "#C62828" : "#FF6600"} />
                <MetricBox label="Late Cancellations" value={`${gaps.lastMinuteCancellationRate}%`} color={gaps.lastMinuteCancellationRate > 30 ? "#C62828" : "#2E7D32"} />
              </div>
              {!gaps.notes.length && <p className="mt-3 text-xs text-gray-400">Gap distribution within normal range.</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── HHI Section ── */}
      <HHIPanel agencyId={selectedAgency} />

      <div className="mt-6 bg-white border rounded-lg">
        <button className="flex items-center justify-between w-full p-4" onClick={() => setShowDetails(!showDetails)}>
          <h2 className="font-semibold">How Behavioral Entropy Works</h2>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showDetails && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 grid grid-cols-3 gap-4 text-xs text-gray-600">
                <div className="p-3 bg-blue-50 rounded"><div className="font-semibold text-[#003366] mb-1">Shannon Entropy Principle</div>Genuine human activity contains natural randomness. Automated fraud scripts produce statistically improbable uniformity.</div>
                <div className="p-3 bg-orange-50 rounded"><div className="font-semibold text-[#FF6600] mb-1">HHI Concentration Signal</div>HHI quantifies booking concentration. Fraudsters booking a single cheap route produce an HHI signature &gt;5,000.</div>
                <div className="p-3 bg-green-50 rounded"><div className="font-semibold text-[#2E7D32] mb-1">Why This Beats Rules</div>Entropy + HHI requires naturalness across ALL dimensions simultaneously — much harder to game than single-signal rules.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EntropyComponent({ icon, label, description, value, loading }: { icon: React.ReactNode; label: string; description: string; value: number; inverse: boolean; loading: boolean }) {
  const color = value >= 60 ? "#2E7D32" : value >= 30 ? "#FF6600" : "#C62828";
  return (
    <div className="flex gap-3">
      <div className="p-2 rounded-lg bg-gray-50 flex-shrink-0" style={{ color }}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-sm font-mono font-bold" style={{ color }}>{loading ? "…" : `${value}%`}</span>
        </div>
        <Progress value={loading ? 0 : value} className="h-2 mb-1" />
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
