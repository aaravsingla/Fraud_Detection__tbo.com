import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, AlertTriangle, Activity, Zap, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { motion, AnimatePresence } from "motion/react";
import { detectVelocityCliff, type VelocityCliffResult } from "../services/riskApi";

// ── Mock agency scenarios ──────────────────────────────────────────────────────
const AGENCY_SCENARIOS = {
  "AG-001": {
    name: "Wanderlust Travels",
    weeklyBookings: [4, 5, 4, 6, 5, 7, 8, 9, 12, 18, 28, 47, 89],
    description: "Suspected bust-out — exponential acceleration",
  },
  "AG-002": {
    name: "Global Ventures Ltd",
    weeklyBookings: [22, 25, 24, 26, 23, 25, 27, 24, 26, 25, 28, 26, 27],
    description: "Stable, healthy booking pattern",
  },
  "AG-003": {
    name: "SkyHigh Agencies",
    weeklyBookings: [8, 9, 8, 10, 11, 12, 14, 16, 20, 26, 30, 38, 52],
    description: "Gradual acceleration — monitoring required",
  },
  "AG-004": {
    name: "Paradise Tours",
    weeklyBookings: [15, 18, 14, 17, 19, 16, 18, 17, 20, 18, 21, 19, 20],
    description: "Seasonal variation — normal",
  },
};

const WEEK_LABELS = ["W-12", "W-11", "W-10", "W-9", "W-8", "W-7", "W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "Now"];

export function VelocityCliffPage() {
  const [selectedAgency, setSelectedAgency] = useState("AG-001");
  const [result, setResult] = useState<VelocityCliffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRatios, setShowRatios] = useState(false);

  const scenario = AGENCY_SCENARIOS[selectedAgency as keyof typeof AGENCY_SCENARIOS];

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await detectVelocityCliff({ weeklyBookings: scenario.weeklyBookings });
      setResult(res);
    } catch {
      // fallback with synthetic calculation
      const w = scenario.weeklyBookings;
      const ratios = w.slice(1).map((v, i) => Math.round((v / (w[i] || 1)) * 100) / 100);
      setResult({
        cliffDetected: ratios[ratios.length - 1] >= 2.5,
        accelerationRatio: ratios[ratios.length - 1],
        maxAcceleration: Math.max(...ratios),
        weekOverWeekRatios: ratios,
        riskScore: Math.min(100, ratios[ratios.length - 1] * 20),
        notes: ratios[ratios.length - 1] >= 2.5 ? ["Velocity cliff detected — potential bust-out precursor."] : [],
      });
    } finally {
      setLoading(false);
    }
  }, [selectedAgency, scenario.weeklyBookings]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  // Chart data
  const bookingChartData = scenario.weeklyBookings.map((v, i) => ({
    week: WEEK_LABELS[i],
    bookings: v,
    isRecent: i >= 10,
  }));

  const ratioChartData = (result?.weekOverWeekRatios ?? []).map((r, i) => ({
    week: WEEK_LABELS[i + 1],
    ratio: r,
    isCritical: r >= 2.5,
    isWarning: r >= 1.5 && r < 2.5,
  }));

  const riskColor = !result ? "#999"
    : result.riskScore >= 70 ? "#C62828"
    : result.riskScore >= 40 ? "#FF6600"
    : "#2E7D32";

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366] flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Velocity Cliff Detection
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Exponential acceleration analysis — detects bust-out precursors 1–2 weeks early
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgency} onValueChange={setSelectedAgency}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AGENCY_SCENARIOS).map(([id, s]) => (
                <SelectItem key={id} value={id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading}>
            {loading ? "Analyzing…" : "Re-analyze"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Cliff Detected"
          value={result ? (result.cliffDetected ? "YES" : "NO") : "—"}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={result?.cliffDetected ? "#C62828" : "#2E7D32"}
          loading={loading}
        />
        <KpiCard
          label="Latest WoW Ratio"
          value={result ? `${result.accelerationRatio}×` : "—"}
          icon={<TrendingUp className="w-4 h-4" />}
          color={result ? (result.accelerationRatio >= 2.5 ? "#C62828" : result.accelerationRatio >= 1.5 ? "#FF6600" : "#2E7D32") : "#999"}
          loading={loading}
        />
        <KpiCard
          label="Peak Acceleration"
          value={result ? `${result.maxAcceleration}×` : "—"}
          icon={<Zap className="w-4 h-4" />}
          color={result ? (result.maxAcceleration >= 3 ? "#C62828" : "#FF6600") : "#999"}
          loading={loading}
        />
        <KpiCard
          label="Velocity Risk Score"
          value={result ? `${result.riskScore}%` : "—"}
          icon={<Activity className="w-4 h-4" />}
          color={riskColor}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Main booking volume chart */}
        <div className="col-span-2 bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Weekly Booking Volume</h2>
              <p className="text-xs text-gray-500 mt-0.5">{scenario.name} — {scenario.description}</p>
            </div>
            {result?.cliffDetected && (
              <Badge className="bg-[#C62828] text-white text-xs">
                ⚡ Cliff Detected
              </Badge>
            )}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={bookingChartData}>
              <defs>
                <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={riskColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #E0E0E0", fontSize: 12 }}
                formatter={(v: number) => [`${v} bookings`, "Volume"]}
              />
              <ReferenceLine x="W-3" stroke="#FF6600" strokeDasharray="4 2" label={{ value: "Acceleration", position: "top", fontSize: 10, fill: "#FF6600" }} />
              <Area type="monotone" dataKey="bookings" stroke={riskColor} strokeWidth={2.5} fill="url(#bookingGrad)" dot={{ fill: riskColor, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk summary card */}
        <div className="space-y-4">
          <div
            className="rounded-lg p-5 text-white"
            style={{ background: `linear-gradient(135deg, ${riskColor}, ${riskColor}cc)` }}
          >
            <div className="text-xs font-medium opacity-80 mb-1">Velocity Risk Score</div>
            <div className="text-5xl font-bold font-mono mb-2">
              {loading ? "…" : result?.riskScore ?? 0}
              <span className="text-2xl font-normal">%</span>
            </div>
            <div className="text-sm opacity-90">
              {result?.cliffDetected ? "Bust-out precursor pattern active" : "Normal velocity pattern"}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Analysis Notes</h3>
            {result?.notes?.length ? (
              <div className="space-y-2">
                {result.notes.map((note, i) => (
                  <div key={i} className="flex gap-2 p-2 bg-red-50 rounded border border-red-100">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C62828] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700 leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No anomalies detected in current velocity pattern.</p>
            )}
          </div>

          {/* Threshold guide */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Detection Thresholds</h3>
            <div className="space-y-1.5 text-xs">
              <ThresholdRow color="#C62828" label="Critical cliff" range="≥ 3× WoW" />
              <ThresholdRow color="#FF6600" label="Warning zone" range="2.5–3× WoW" />
              <ThresholdRow color="#F57C00" label="Elevated" range="1.5–2.5× WoW" />
              <ThresholdRow color="#2E7D32" label="Normal" range="< 1.5× WoW" />
            </div>
          </div>
        </div>
      </div>

      {/* WoW Ratios chart */}
      <div className="bg-white border rounded-lg p-4">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setShowRatios(!showRatios)}
        >
          <h2 className="font-semibold">Week-over-Week Acceleration Ratios</h2>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showRatios ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showRatios && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ratioChartData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, "dataMax + 0.5"]} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #E0E0E0", fontSize: 12 }}
                      formatter={(v: number) => [`${v}×`, "WoW Ratio"]}
                    />
                    <ReferenceLine y={2.5} stroke="#C62828" strokeDasharray="4 2" label={{ value: "Cliff threshold (2.5×)", position: "right", fontSize: 10, fill: "#C62828" }} />
                    <ReferenceLine y={1.5} stroke="#FF6600" strokeDasharray="4 2" label={{ value: "Warning (1.5×)", position: "right", fontSize: 10, fill: "#FF6600" }} />
                    <Bar
                      dataKey="ratio"
                      fill="#003366"
                      radius={[4, 4, 0, 0]}
                      // Color individual bars by severity
                      label={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Each bar shows the booking volume ratio vs. prior week. Values ≥ 2.5× trigger cliff detection.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, loading }: {
  label: string; value: string; icon: React.ReactNode; color: string; loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded" style={{ background: `${color}20`, color }}>
            {icon}
          </div>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <div className="text-2xl font-bold font-mono" style={{ color }}>
          {loading ? <span className="text-gray-300 text-lg">Analyzing…</span> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function ThresholdRow({ color, label, range }: { color: string; label: string; range: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-gray-600 flex-1">{label}</span>
      <span className="font-mono text-gray-400">{range}</span>
    </div>
  );
}
