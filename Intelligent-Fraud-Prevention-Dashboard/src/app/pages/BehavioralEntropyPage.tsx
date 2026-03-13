import { useEffect, useState, useCallback, useRef } from "react";
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
  LineChart,
  Line,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import {
  Brain,
  Eye,
  Clock,
  DollarSign,
  XCircle,
  ChevronDown,
  BarChart2,
  Fingerprint,
  Monitor,
  Globe,
  MapPin,
  User,
  MousePointer,
  Keyboard,
  ShoppingCart,
  Zap,
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  CreditCard,
  ArrowRightLeft,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { computeBehavioralEntropy, analyzeBookingGaps, type BehavioralEntropyResult, type BookingGapResult } from "../services/riskApi";

// ─── Agency Profiles ──────────────────────────────────────────────────────────
const AGENCY_PROFILES = {
  "AG-001": {
    name: "Wanderlust Travels",
    // existing entropy
    bookingTimeVariance: 0.08, ticketValueCV: 0.03, cancellationRegularity: 0.91,
    gapDistribution: [95, 102, 98, 115, 94, 108, 120, 99, 105, 112],
    lastMinuteCancellationRate: 0.62,
    label: "Behavioral Mimicry Detected",
    // identity signals
    identity: {
      deviceFingerprints: 7,        // distinct fingerprints
      deviceReuseScore: 91,         // how many accounts share same device (0–100 = more reuse = riskier)
      vpnDetected: true,
      proxyDetected: true,
      datacenterIP: true,
      timezoneConsistency: 18,      // % match between stated TZ and actual (low = risky)
      loginHourVariance: 0.06,      // low = scripted login times
      passengerCardholderMatch: 22, // % similarity between passenger name and cardholder (low = mismatch)
    },
    // behavioral interaction signals
    interaction: {
      avgKeystrokeWPM: 312,         // abnormally high = bot
      keystrokeVarianceCV: 0.04,    // low = bot (too uniform)
      mouseEntropyScore: 9,         // 0–100, low = bot (straight lines)
      mousePathLinearity: 0.97,     // close to 1 = bot (straight lines)
      checkoutTimeSeconds: 4.2,     // suspiciously fast
      checkoutTimeVariance: 0.03,   // very low variance = scripted
      burstBookingsLast24h: 31,     // transaction burst
      burstWindowMinutes: 12,       // all 31 bookings in 12 min
      refundDestinationMatch: 14,   // % match between booking and refund destination
      refundVelocityScore: 88,      // high = suspicious refund routing
    },
  },
  "AG-002": {
    name: "Global Ventures Ltd",
    bookingTimeVariance: 0.78, ticketValueCV: 0.45, cancellationRegularity: 0.22,
    gapDistribution: [14, 28, 7, 45, 3, 60, 21, 35, 12, 8],
    lastMinuteCancellationRate: 0.08,
    label: "Natural Human Behavior",
    identity: {
      deviceFingerprints: 2,
      deviceReuseScore: 8,
      vpnDetected: false,
      proxyDetected: false,
      datacenterIP: false,
      timezoneConsistency: 94,
      loginHourVariance: 0.71,
      passengerCardholderMatch: 91,
    },
    interaction: {
      avgKeystrokeWPM: 68,
      keystrokeVarianceCV: 0.38,
      mouseEntropyScore: 82,
      mousePathLinearity: 0.41,
      checkoutTimeSeconds: 127,
      checkoutTimeVariance: 0.54,
      burstBookingsLast24h: 3,
      burstWindowMinutes: 480,
      refundDestinationMatch: 88,
      refundVelocityScore: 12,
    },
  },
  "AG-003": {
    name: "SkyHigh Agencies",
    bookingTimeVariance: 0.41, ticketValueCV: 0.28, cancellationRegularity: 0.55,
    gapDistribution: [85, 92, 78, 95, 88, 73, 96, 84, 91, 80],
    lastMinuteCancellationRate: 0.38,
    label: "Partial Scripted Pattern",
    identity: {
      deviceFingerprints: 4,
      deviceReuseScore: 52,
      vpnDetected: true,
      proxyDetected: false,
      datacenterIP: false,
      timezoneConsistency: 58,
      loginHourVariance: 0.31,
      passengerCardholderMatch: 61,
    },
    interaction: {
      avgKeystrokeWPM: 145,
      keystrokeVarianceCV: 0.19,
      mouseEntropyScore: 44,
      mousePathLinearity: 0.68,
      checkoutTimeSeconds: 38,
      checkoutTimeVariance: 0.22,
      burstBookingsLast24h: 11,
      burstWindowMinutes: 65,
      refundDestinationMatch: 52,
      refundVelocityScore: 47,
    },
  },
  "AG-004": {
    name: "Paradise Tours",
    bookingTimeVariance: 0.82, ticketValueCV: 0.52, cancellationRegularity: 0.18,
    gapDistribution: [7, 14, 21, 3, 45, 18, 9, 32, 6, 28],
    lastMinuteCancellationRate: 0.05,
    label: "Authentic Activity",
    identity: {
      deviceFingerprints: 1,
      deviceReuseScore: 4,
      vpnDetected: false,
      proxyDetected: false,
      datacenterIP: false,
      timezoneConsistency: 97,
      loginHourVariance: 0.82,
      passengerCardholderMatch: 96,
    },
    interaction: {
      avgKeystrokeWPM: 54,
      keystrokeVarianceCV: 0.47,
      mouseEntropyScore: 91,
      mousePathLinearity: 0.29,
      checkoutTimeSeconds: 184,
      checkoutTimeVariance: 0.68,
      burstBookingsLast24h: 2,
      burstWindowMinutes: 620,
      refundDestinationMatch: 94,
      refundVelocityScore: 6,
    },
  },
};

// ─── HHI ─────────────────────────────────────────────────────────────────────
const HHI_DATA: Record<string, { routes: {name:string;share:number}[]; airlines: {name:string;share:number}[]; ticketBands: {name:string;share:number}[] }> = {
  "AG-001": { routes: [{name:"DEL→DXB",share:0.61},{name:"BOM→DXB",share:0.22},{name:"DEL→SIN",share:0.09},{name:"Others",share:0.08}], airlines: [{name:"IndiGo",share:0.71},{name:"Air Arabia",share:0.18},{name:"SpiceJet",share:0.07},{name:"Others",share:0.04}], ticketBands: [{name:"₹8-9k",share:0.68},{name:"₹9-10k",share:0.21},{name:"₹10-12k",share:0.07},{name:"₹12k+",share:0.04}] },
  "AG-002": { routes: [{name:"BOM→LHR",share:0.18},{name:"DEL→JFK",share:0.16},{name:"BLR→SIN",share:0.14},{name:"DEL→DXB",share:0.12},{name:"Others",share:0.40}], airlines: [{name:"Air India",share:0.22},{name:"Emirates",share:0.19},{name:"IndiGo",share:0.18},{name:"Lufthansa",share:0.15},{name:"Others",share:0.26}], ticketBands: [{name:"₹5-10k",share:0.21},{name:"₹10-20k",share:0.24},{name:"₹20-40k",share:0.28},{name:"₹40k+",share:0.27}] },
  "AG-003": { routes: [{name:"DEL→DXB",share:0.38},{name:"BOM→DXB",share:0.29},{name:"DEL→AUH",share:0.18},{name:"Others",share:0.15}], airlines: [{name:"IndiGo",share:0.44},{name:"Air Arabia",share:0.31},{name:"GoAir",share:0.15},{name:"Others",share:0.10}], ticketBands: [{name:"₹7-9k",share:0.45},{name:"₹9-11k",share:0.33},{name:"₹11-14k",share:0.14},{name:"₹14k+",share:0.08}] },
  "AG-004": { routes: [{name:"BOM→BKK",share:0.19},{name:"DEL→SIN",share:0.17},{name:"BLR→KUL",share:0.14},{name:"HYD→SIN",share:0.13},{name:"Others",share:0.37}], airlines: [{name:"AirAsia",share:0.24},{name:"IndiGo",share:0.21},{name:"Vistara",share:0.19},{name:"Scoot",share:0.16},{name:"Others",share:0.20}], ticketBands: [{name:"₹6-10k",share:0.26},{name:"₹10-15k",share:0.28},{name:"₹15-25k",share:0.24},{name:"₹25k+",share:0.22}] },
};

function calcHHI(shares: {share:number}[]) { return Math.round(shares.reduce((s, x) => s + (x.share*100)**2, 0)); }
function hhiLabel(hhi: number) {
  if (hhi > 5000) return { label: "Highly Concentrated", color: "#C62828" };
  if (hhi > 2500) return { label: "Moderately Concentrated", color: "#FF6600" };
  if (hhi > 1500) return { label: "Mildly Concentrated", color: "#F57C00" };
  return { label: "Diversified", color: "#2E7D32" };
}

// ─── Gauge ring ───────────────────────────────────────────────────────────────
function GaugeRing({ value, max = 100, color, size = 80, label, sublabel }: {
  value: number; max?: number; color: string; size?: number; label: string; sublabel?: string;
}) {
  const pct = Math.min(1, value / max);
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference * 0.75; // 3/4 arc
  const rotate = 135; // start at bottom-left

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(${rotate} ${size/2} ${size/2})`}
          />
          {/* Value arc */}
          <motion.circle
            cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(${rotate} ${size/2} ${size/2})`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dash} ${circumference}` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-base font-black font-mono leading-none" style={{ color }}>{label}</div>
        </div>
      </div>
      {sublabel && <div className="text-xs text-gray-500 text-center mt-1 leading-tight">{sublabel}</div>}
    </div>
  );
}

// ─── Signal row ───────────────────────────────────────────────────────────────
function SignalRow({ icon, label, value, riskValue, color, unit = "", description }: {
  icon: React.ReactNode; label: string; value: string; riskValue: number;
  color: string; unit?: string; description?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-b-0">
      <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: color + "18" }}>
        <div style={{ color }} className="w-4 h-4 flex items-center justify-center">{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
          <span className="text-xs font-mono font-bold ml-2 flex-shrink-0" style={{ color }}>{value}{unit}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: color }}
            initial={{ width: 0 }} animate={{ width: `${riskValue}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        {description && <div className="text-xs text-gray-400 mt-0.5 truncate">{description}</div>}
      </div>
    </div>
  );
}

// ─── Keystroke Dynamics Sparkline ────────────────────────────────────────────
function KeystrokeDynamicsChart({ wpm, cv, isBot }: { wpm: number; cv: number; isBot: boolean }) {
  // Generate simulated inter-key timing data
  const generateTimings = (wpmVal: number, cvVal: number) => {
    const base = 60000 / (wpmVal * 5); // ms per keystroke
    return Array.from({ length: 30 }, (_, i) => {
      const noise = isBot ? base * cvVal * (Math.random() - 0.5) * 0.5 : base * cvVal * (Math.random() - 0.5) * 4;
      return { i, ms: Math.max(10, Math.round(base + noise)) };
    });
  };
  const data = generateTimings(wpm, cv);
  const color = isBot ? "#C62828" : "#2E7D32";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Inter-key Timing (ms)</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {isBot ? "🤖 Bot-like uniformity" : "✓ Human variance"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={60}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: -40, bottom: 0 }}>
          <Area type="monotone" dataKey="ms" stroke={color} fill={color + "22"} strokeWidth={1.5} dot={false} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => [`${v}ms`]} labelFormatter={() => ""} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Mouse Path Visualization ────────────────────────────────────────────────
function MousePathViz({ entropy, linearity, isBot }: { entropy: number; linearity: number; isBot: boolean }) {
  const pathPoints: {x: number; y: number}[] = [];
  const W = 200, H = 80;
  const steps = 20;
  let x = 10, y = H / 2;

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    if (isBot) {
      x = 10 + t * (W - 20);
      y = H / 2 + (Math.random() - 0.5) * 4; // nearly straight
    } else {
      x = 10 + t * (W - 20) + (Math.random() - 0.5) * 15;
      y = H / 2 + Math.sin(t * Math.PI * 3) * 25 + (Math.random() - 0.5) * 10;
    }
    pathPoints.push({ x: Math.max(5, Math.min(W-5, x)), y: Math.max(5, Math.min(H-5, y)) });
  }

  const d = pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const color = isBot ? "#C62828" : "#2E7D32";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Mouse Movement Path</span>
        <span className="text-xs font-mono" style={{ color }}>Linearity: {Math.round(linearity * 100)}%</span>
      </div>
      <div className="bg-gray-50 rounded border overflow-hidden" style={{ height: 80 }}>
        <svg width="100%" height="80" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill={color} />
            </marker>
          </defs>
          {/* Grid dots */}
          {Array.from({length: 6}, (_, r) => Array.from({length: 10}, (_, c) => (
            <circle key={`${r}-${c}`} cx={c * 22 + 5} cy={r * 15 + 5} r={1} fill="#E5E7EB" />
          )))}
          <motion.path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"
            markerEnd="url(#arrowhead)" opacity={0.8}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
          {/* Start/end dots */}
          <circle cx={pathPoints[0]?.x ?? 10} cy={pathPoints[0]?.y ?? 40} r={4} fill="#003366" />
          <circle cx={pathPoints[pathPoints.length-1]?.x ?? 190} cy={pathPoints[pathPoints.length-1]?.y ?? 40} r={4} fill={color} />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>● Start</span><span>Entropy: {entropy}/100</span><span>End ●</span>
      </div>
    </div>
  );
}

// ─── Burst timeline chart ─────────────────────────────────────────────────────
function BurstTimeline({ bookings, windowMinutes, isBot }: { bookings: number; windowMinutes: number; isBot: boolean }) {
  const hours = 24;
  const data = Array.from({ length: hours }, (_, h) => {
    let volume = 0;
    if (isBot) {
      // Cluster all in a 2-hour window at 2AM
      if (h === 2) volume = Math.round(bookings * 0.7);
      if (h === 3) volume = Math.round(bookings * 0.3);
    } else {
      // Natural distribution 9AM–6PM
      if (h >= 9 && h <= 18) volume = Math.round(Math.random() * 2 + (h === 11 || h === 15 ? 1 : 0));
    }
    return { h: `${h}h`, v: volume, isSpike: volume > 5 };
  });
  const color = isBot ? "#C62828" : "#2E7D32";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Booking Burst — 24h Distribution</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {bookings} bookings / {windowMinutes}min window
        </span>
      </div>
      <ResponsiveContainer width="100%" height={70}>
        <BarChart data={data} margin={{ top: 2, right: 0, left: -40, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="h" tick={{ fontSize: 8 }} interval={3} />
          <YAxis tick={{ fontSize: 8 }} />
          <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => [v, "Bookings"]} />
          <Bar dataKey="v" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.isSpike ? "#C62828" : color + "88"} />
            ))}
          </Bar>
          {isBot && <ReferenceLine x="2h" stroke="#C62828" strokeDasharray="3 3" label={{ value: "🚨 Burst", fill: "#C62828", fontSize: 9, position: "top" }} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Login pattern heatmap ────────────────────────────────────────────────────
function LoginHeatmap({ variance, timezoneConsistency }: { variance: number; timezoneConsistency: number }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isBot = variance < 0.2;
  // Generate fake login heat
  const cells = days.map(day => {
    return Array.from({ length: 24 }, (_, h) => {
      let intensity = 0;
      if (isBot) {
        // Bot: always 2–4AM
        if (h >= 2 && h <= 4) intensity = 0.8 + Math.random() * 0.2;
      } else {
        if (h >= 9 && h <= 18 && day !== "Sun") {
          intensity = Math.random() * 0.7 + 0.1;
        }
      }
      return intensity;
    });
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Login Hour Distribution (Operator)</span>
        <span className="text-xs font-mono" style={{ color: timezoneConsistency < 50 ? "#C62828" : "#2E7D32" }}>
          TZ Consistency: {timezoneConsistency}%
        </span>
      </div>
      <div className="overflow-hidden rounded border bg-gray-50 p-2">
        <div className="flex gap-0.5">
          {/* Hour labels */}
          <div className="flex flex-col gap-px w-6 flex-shrink-0">
            <div className="text-gray-400" style={{ fontSize: 7, height: 8 }}></div>
            {days.map(d => <div key={d} className="text-gray-500 flex items-center" style={{ fontSize: 7, height: 8 }}>{d}</div>)}
          </div>
          {/* Cells */}
          <div className="flex-1">
            <div className="flex gap-px mb-px">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-gray-400" style={{ fontSize: 6 }}>
                  {h % 6 === 0 ? `${h}h` : ""}
                </div>
              ))}
            </div>
            {days.map((day, di) => (
              <div key={day} className="flex gap-px mb-px">
                {cells[di].map((intensity, h) => (
                  <div
                    key={h}
                    className="flex-1 rounded-sm"
                    style={{
                      height: 8,
                      background: intensity === 0 ? "#F3F4F6"
                        : isBot
                        ? `rgba(198,40,40,${intensity})`
                        : `rgba(46,125,50,${intensity})`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-gray-400" style={{ fontSize: 7 }}>Low</span>
          <div className="flex gap-px">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(v => (
              <div key={v} className="w-3 h-2 rounded-sm" style={{
                background: isBot ? `rgba(198,40,40,${v})` : `rgba(46,125,50,${v})`
              }} />
            ))}
          </div>
          <span className="text-gray-400" style={{ fontSize: 7 }}>High</span>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout time comparison ─────────────────────────────────────────────────
function CheckoutTimeViz({ seconds, variance, isBot }: { seconds: number; variance: number; isBot: boolean }) {
  // Benchmark: human average 90–180s
  const normalMin = 60, normalMax = 240;
  const pct = Math.min(100, (seconds / 300) * 100);
  const color = isBot ? "#C62828" : "#2E7D32";
  const data = Array.from({ length: 20 }, (_, i) => {
    const t = (i / 19) * 300;
    // Normal distribution density
    const mu = 135, sigma = 45;
    const density = Math.exp(-0.5 * ((t - mu) / sigma) ** 2) * 100;
    return { t: Math.round(t), density, isAgency: Math.abs(t - seconds) < 10 };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">Checkout Completion Time</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {seconds.toFixed(1)}s {isBot ? "(⚡ too fast)" : "(✓ normal)"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={65}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: -40, bottom: 0 }}>
          <defs>
            <linearGradient id="normalDist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#003366" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#003366" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="density" stroke="#003366" fill="url(#normalDist)" strokeWidth={1.5} dot={false} />
          <ReferenceLine x={seconds} stroke={color} strokeWidth={2}
            label={{ value: `${seconds.toFixed(0)}s`, fill: color, fontSize: 9, position: "top" }} />
          <ReferenceLine x={normalMin} stroke="#94A3B8" strokeDasharray="3 3" />
          <ReferenceLine x={normalMax} stroke="#94A3B8" strokeDasharray="3 3" />
          <XAxis dataKey="t" tick={{ fontSize: 8 }} tickFormatter={v => `${v}s`} />
          <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => [`${v.toFixed(0)}%`, "Normal density"]} labelFormatter={v => `${v}s`} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>0s</span><span className="text-gray-500">Normal range: {normalMin}–{normalMax}s</span><span>300s</span>
      </div>
    </div>
  );
}

// ─── Refund routing analysis ──────────────────────────────────────────────────
function RefundRoutingPanel({ match, velocity }: { match: number; velocity: number }) {
  const isRisky = match < 50 || velocity > 60;
  const color = isRisky ? "#C62828" : "#2E7D32";
  const data = [
    { label: "Same Dest. Match", value: match, benchmark: 80 },
    { label: "Routing Velocity", value: velocity, benchmark: 30 },
    { label: "Mismatch Score", value: 100 - match, benchmark: 20 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Refund Destination Routing</span>
        {isRisky && <Badge className="bg-red-100 text-[#C62828] border-0 text-xs">⚠ Suspicious Routing</Badge>}
      </div>
      <div className="space-y-2">
        {data.map(d => {
          const c = d.label === "Routing Velocity"
            ? (d.value > d.benchmark ? "#C62828" : "#2E7D32")
            : (d.value < d.benchmark && d.label !== "Mismatch Score" ? "#C62828" : (d.value > d.benchmark && d.label === "Mismatch Score" ? "#C62828" : "#2E7D32"));
          return (
            <div key={d.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-gray-600">{d.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Benchmark: {d.benchmark}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: c }}>{d.value}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                <motion.div className="h-full rounded-full" style={{ background: c }}
                  initial={{ width: 0 }} animate={{ width: `${d.value}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                {/* Benchmark marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400" style={{ left: `${d.benchmark}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Composite risk score badge ───────────────────────────────────────────────
function CompositeRiskBadge({ profile }: { profile: typeof AGENCY_PROFILES[string] }) {
  const id = profile.identity;
  const ia = profile.interaction;

  // Compute composite scores
  const identityRisk = Math.round(
    (id.deviceReuseScore * 0.25 +
    (id.vpnDetected ? 80 : 10) * 0.15 +
    (id.proxyDetected ? 85 : 10) * 0.10 +
    (id.datacenterIP ? 90 : 5) * 0.10 +
    (100 - id.timezoneConsistency) * 0.20 +
    ((1 - id.loginHourVariance) * 100) * 0.10 +
    (100 - id.passengerCardholderMatch) * 0.10) 
  );

  const behaviorRisk = Math.round(
    (Math.min(100, ia.avgKeystrokeWPM / 3.5) * 0.15 +
    ((1 - ia.keystrokeVarianceCV) * 100) * 0.10 +
    (100 - ia.mouseEntropyScore) * 0.10 +
    (ia.mousePathLinearity * 100) * 0.10 +
    (Math.max(0, 1 - ia.checkoutTimeSeconds / 120) * 100) * 0.15 +
    Math.min(100, ia.burstBookingsLast24h * 2.5) * 0.20 +
    ia.refundVelocityScore * 0.10 +
    (100 - ia.refundDestinationMatch) * 0.10)
  );

  const composite = Math.round(identityRisk * 0.45 + behaviorRisk * 0.55);
  const color = composite >= 70 ? "#C62828" : composite >= 45 ? "#FF6600" : "#2E7D32";
  const verdict = composite >= 70 ? "HIGH RISK" : composite >= 45 ? "MEDIUM RISK" : "LOW RISK";

  return (
    <div className="bg-white border rounded-xl p-4 flex items-center gap-4">
      <div className="flex gap-4">
        <GaugeRing value={identityRisk} color={identityRisk >= 70 ? "#C62828" : identityRisk >= 45 ? "#FF6600" : "#2E7D32"}
          size={72} label={`${identityRisk}`} sublabel="Identity Risk" />
        <GaugeRing value={behaviorRisk} color={behaviorRisk >= 70 ? "#C62828" : behaviorRisk >= 45 ? "#FF6600" : "#2E7D32"}
          size={72} label={`${behaviorRisk}`} sublabel="Behavior Risk" />
        <GaugeRing value={composite} color={color} size={88} label={`${composite}`} sublabel="Composite" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-black" style={{ color }}>{verdict}</span>
          <Badge style={{ background: color + "20", color, borderColor: color + "40" }} variant="outline" className="text-xs font-bold">
            Score: {composite}/100
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-500">
          <span>Identity weight: 45%</span>
          <span>Behavior weight: 55%</span>
          <span>Identity signals: 7 analyzed</span>
          <span>Behavior signals: 10 analyzed</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function BehavioralEntropyPage() {
  const [selectedAgency, setSelectedAgency] = useState("AG-001");
  const [entropy, setEntropy] = useState<BehavioralEntropyResult | null>(null);
  const [gaps, setGaps] = useState<BookingGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHHI, setShowHHI] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [activeTab, setActiveTab] = useState<"identity" | "behavioral" | "entropy">("identity");

  const scenario = AGENCY_PROFILES[selectedAgency as keyof typeof AGENCY_PROFILES];
  const id = scenario.identity;
  const ia = scenario.interaction;
  const isBot = scenario.bookingTimeVariance < 0.2;

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
      setEntropy({ entropyScore, mimicryDetected: entropyScore < 30, riskScore: 100 - entropyScore, components: { bookingTimeVariance: Math.round(scenario.bookingTimeVariance * 100), ticketValueDiversity: Math.round(Math.min(1, scenario.ticketValueCV / 0.5) * 100), cancellationNaturalness: Math.round((1 - scenario.cancellationRegularity) * 100) }, notes: [] });
      const longGaps = scenario.gapDistribution.filter(g => g > 90).length;
      setGaps({ avgGap: Math.round(scenario.gapDistribution.reduce((a, b) => a + b, 0) / scenario.gapDistribution.length), longGapRatio: Math.round((longGaps / scenario.gapDistribution.length) * 100), lastMinuteCancellationRate: Math.round(scenario.lastMinuteCancellationRate * 100), manipulationDetected: longGaps / scenario.gapDistribution.length > 0.6 && scenario.lastMinuteCancellationRate > 0.3, riskScore: Math.round((0.5 * (longGaps / scenario.gapDistribution.length) + 0.3 * scenario.lastMinuteCancellationRate) * 100), notes: [] });
    } finally { setLoading(false); }
  }, [selectedAgency]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  const radarData = entropy ? [
    { subject: "Time Variance", value: entropy.components.bookingTimeVariance },
    { subject: "Value Diversity", value: entropy.components.ticketValueDiversity },
    { subject: "Cancel Natural.", value: entropy.components.cancellationNaturalness },
    { subject: "Gap Spread", value: 100 - (gaps?.longGapRatio ?? 0) },
    { subject: "Settlement", value: 100 - (gaps?.lastMinuteCancellationRate ?? 0) },
    { subject: "Keystroke Var.", value: Math.round(ia.keystrokeVarianceCV * 100) },
    { subject: "Mouse Entropy", value: ia.mouseEntropyScore },
    { subject: "TZ Consistency", value: id.timezoneConsistency },
  ] : [];

  const riskColor = !entropy ? "#999" : entropy.riskScore >= 70 ? "#C62828" : entropy.riskScore >= 40 ? "#FF6600" : "#2E7D32";
  const hhi = HHI_DATA[selectedAgency as keyof typeof HHI_DATA];
  const compositeHHI = hhi ? Math.round((calcHHI(hhi.routes) + calcHHI(hhi.airlines) + calcHHI(hhi.ticketBands)) / 3) : 0;

  const tabs = [
    { id: "identity" as const, label: "Identity & Access", icon: <Fingerprint className="w-3.5 h-3.5" /> },
    { id: "behavioral" as const, label: "Behavioral Signals", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "entropy" as const, label: "Entropy & HHI", icon: <Brain className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366] flex items-center gap-2">
            <Brain className="w-6 h-6" /> Behavioral &amp; Identity Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            17 signals across identity access, interaction biometrics, and transactional patterns
          </p>
        </div>
        <Select value={selectedAgency} onValueChange={setSelectedAgency}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(AGENCY_PROFILES).map(([id, s]) => (
              <SelectItem key={id} value={id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verdict banner */}
      <AnimatePresence mode="wait">
        {entropy && (
          <motion.div key={selectedAgency} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border-l-4 flex items-center gap-3 ${entropy.mimicryDetected ? "bg-red-50 border-[#C62828]" : "bg-green-50 border-[#2E7D32]"}`}>
            {entropy.mimicryDetected
              ? <AlertTriangle className="w-5 h-5 text-[#C62828] flex-shrink-0" />
              : <CheckCircle className="w-5 h-5 text-[#2E7D32] flex-shrink-0" />}
            <div className="flex-1">
              <div className={`font-bold ${entropy.mimicryDetected ? "text-[#C62828]" : "text-[#2E7D32]"}`}>{scenario.label}</div>
              <div className="text-xs text-gray-600">
                Entropy: {entropy.entropyScore}% · Mouse entropy: {ia.mouseEntropyScore}/100 · Keystroke WPM: {ia.avgKeystrokeWPM} · Checkout: {ia.checkoutTimeSeconds}s
                {id.vpnDetected && " · VPN detected"}{id.proxyDetected && " · Proxy detected"}
              </div>
            </div>
            <Badge style={{ background: riskColor }} className="text-white text-xs">Risk: {entropy.riskScore}%</Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composite gauge */}
      <CompositeRiskBadge profile={scenario} />

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white text-[#003366] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── IDENTITY & ACCESS ── */}
        {activeTab === "identity" && (
          <motion.div key="identity" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="grid grid-cols-3 gap-5">
              {/* Device Fingerprinting */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                    <Fingerprint className="w-4 h-4" /> Device Fingerprinting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SignalRow
                    icon={<Monitor className="w-3.5 h-3.5" />}
                    label="Distinct Device Fingerprints"
                    value={id.deviceFingerprints.toString()}
                    riskValue={Math.min(100, id.deviceFingerprints * 13)}
                    color={id.deviceFingerprints > 4 ? "#C62828" : "#2E7D32"}
                    description={id.deviceFingerprints > 4 ? "Multiple fingerprints — spoofing suspected" : "Consistent device identity"}
                  />
                  <SignalRow
                    icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                    label="Device Reuse Across Accounts"
                    value={`${id.deviceReuseScore}%`}
                    riskValue={id.deviceReuseScore}
                    color={id.deviceReuseScore > 60 ? "#C62828" : "#2E7D32"}
                    description={id.deviceReuseScore > 60 ? "Device shared across flagged accounts" : "Device unique to this account"}
                  />
                  <div className={`mt-2 p-2 rounded text-xs ${id.deviceFingerprints > 4 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {id.deviceFingerprints > 4
                      ? `🚨 ${id.deviceFingerprints} distinct canvas/WebGL fingerprints detected — browser fingerprint rotation pattern consistent with automated tooling.`
                      : `✓ Single stable device fingerprint. No rotation or spoofing detected.`}
                  </div>
                </CardContent>
              </Card>

              {/* VPN / Proxy / Infrastructure */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                    <Globe className="w-4 h-4" /> Network Infrastructure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "VPN Detected", val: id.vpnDetected, desc: "Traffic routed through VPN service" },
                    { label: "Proxy Detected", val: id.proxyDetected, desc: "HTTP proxy layer identified" },
                    { label: "Datacenter IP", val: id.datacenterIP, desc: "Hosting/cloud provider IP (not residential)" },
                  ].map(s => (
                    <div key={s.label} className={`flex items-center justify-between p-2 rounded border ${s.val ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: s.val ? "#C62828" : "#2E7D32" }}>{s.label}</div>
                        <div className="text-xs text-gray-500">{s.desc}</div>
                      </div>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded ${s.val ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {s.val ? "YES" : "NO"}
                      </div>
                    </div>
                  ))}
                  {id.vpnDetected && id.proxyDetected && id.datacenterIP && (
                    <div className="text-xs p-2 bg-red-50 border border-red-200 rounded text-red-700">
                      ⚠️ Triple infrastructure masking: VPN + Proxy + Datacenter IP — high confidence concealment attempt.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Identity Consistency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                    <User className="w-4 h-4" /> Identity Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SignalRow
                    icon={<CreditCard className="w-3.5 h-3.5" />}
                    label="Passenger ↔ Cardholder Match"
                    value={`${id.passengerCardholderMatch}%`}
                    riskValue={100 - id.passengerCardholderMatch}
                    color={id.passengerCardholderMatch < 50 ? "#C62828" : "#2E7D32"}
                    description={id.passengerCardholderMatch < 50 ? "Name mismatch — possible third-party card" : "Names consistent"}
                  />
                  <div className={`p-2 rounded text-xs mt-2 ${id.passengerCardholderMatch < 50 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {id.passengerCardholderMatch < 50
                      ? `🚨 Only ${id.passengerCardholderMatch}% name similarity between passenger and billing cardholder. Strong indicator of unauthorized card usage.`
                      : `✓ Passenger and cardholder identities are consistent.`}
                  </div>
                </CardContent>
              </Card>

              {/* Timezone & Login Patterns — full width */}
              <div className="col-span-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                      <MapPin className="w-4 h-4" /> Operator Timezone &amp; Login Pattern Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <LoginHeatmap variance={id.loginHourVariance} timezoneConsistency={id.timezoneConsistency} />
                      <div className="space-y-3">
                        <SignalRow
                          icon={<Clock className="w-3.5 h-3.5" />}
                          label="Login Hour Variance"
                          value={`CV: ${id.loginHourVariance.toFixed(2)}`}
                          riskValue={Math.round((1 - id.loginHourVariance) * 100)}
                          color={id.loginHourVariance < 0.25 ? "#C62828" : "#2E7D32"}
                          description={id.loginHourVariance < 0.25 ? "Uniform login times — automated script suspected" : "Natural human login distribution"}
                        />
                        <SignalRow
                          icon={<Globe className="w-3.5 h-3.5" />}
                          label="Timezone Consistency"
                          value={`${id.timezoneConsistency}%`}
                          riskValue={100 - id.timezoneConsistency}
                          color={id.timezoneConsistency < 50 ? "#C62828" : "#2E7D32"}
                          description={id.timezoneConsistency < 50 ? "Stated timezone doesn't match actual IP location" : "Timezone consistent with stated location"}
                        />
                        <div className={`p-3 rounded text-xs ${id.loginHourVariance < 0.25 ? "bg-orange-50 border border-orange-200 text-orange-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
                          {id.loginHourVariance < 0.25
                            ? `Operator logins concentrated in 2–4 AM window with variance coefficient ${id.loginHourVariance.toFixed(2)} — consistent with automated script running on a schedule. Human operators exhibit CV > 0.4.`
                            : `Login patterns show healthy variation across business hours. No automation signature detected.`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── BEHAVIORAL SIGNALS ── */}
        {activeTab === "behavioral" && (
          <motion.div key="behavioral" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="grid grid-cols-2 gap-5">
              {/* Keystroke dynamics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                    <Keyboard className="w-4 h-4" /> Keystroke Dynamics Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <SignalRow
                      icon={<Zap className="w-3.5 h-3.5" />}
                      label="Typing Speed"
                      value={`${ia.avgKeystrokeWPM} WPM`}
                      riskValue={Math.min(100, ia.avgKeystrokeWPM / 3.5)}
                      color={ia.avgKeystrokeWPM > 200 ? "#C62828" : "#2E7D32"}
                      description={ia.avgKeystrokeWPM > 200 ? "Superhuman typing speed" : "Human range"}
                    />
                    <SignalRow
                      icon={<Activity className="w-3.5 h-3.5" />}
                      label="Keystroke Variance CV"
                      value={ia.keystrokeVarianceCV.toFixed(2)}
                      riskValue={Math.round((1 - ia.keystrokeVarianceCV) * 100)}
                      color={ia.keystrokeVarianceCV < 0.15 ? "#C62828" : "#2E7D32"}
                      description={ia.keystrokeVarianceCV < 0.15 ? "Near-zero variance — bot pattern" : "Natural rhythm"}
                    />
                  </div>
                  <KeystrokeDynamicsChart wpm={ia.avgKeystrokeWPM} cv={ia.keystrokeVarianceCV} isBot={isBot} />
                  {ia.avgKeystrokeWPM > 200 && (
                    <div className="text-xs p-2 bg-red-50 border border-red-100 rounded text-red-700">
                      🚨 {ia.avgKeystrokeWPM} WPM exceeds the 99th percentile human typist (150 WPM). Inter-key delay CV of {ia.keystrokeVarianceCV.toFixed(2)} is statistically impossible for human input.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mouse movement */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                    <MousePointer className="w-4 h-4" /> Mouse Movement Entropy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <SignalRow
                      icon={<Activity className="w-3.5 h-3.5" />}
                      label="Path Entropy Score"
                      value={`${ia.mouseEntropyScore}/100`}
                      riskValue={100 - ia.mouseEntropyScore}
                      color={ia.mouseEntropyScore < 20 ? "#C62828" : "#2E7D32"}
                      description={ia.mouseEntropyScore < 20 ? "Geometrically perfect path" : "Natural curved path"}
                    />
                    <SignalRow
                      icon={<TrendingUp className="w-3.5 h-3.5" />}
                      label="Path Linearity"
                      value={`${(ia.mousePathLinearity * 100).toFixed(0)}%`}
                      riskValue={Math.round(ia.mousePathLinearity * 100)}
                      color={ia.mousePathLinearity > 0.85 ? "#C62828" : "#2E7D32"}
                      description={ia.mousePathLinearity > 0.85 ? "Straight-line movement" : "Organic path"}
                    />
                  </div>
                  <MousePathViz entropy={ia.mouseEntropyScore} linearity={ia.mousePathLinearity} isBot={isBot} />
                </CardContent>
              </Card>

              {/* Checkout time */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                    <ShoppingCart className="w-4 h-4" /> Checkout Completion Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <SignalRow
                      icon={<Clock className="w-3.5 h-3.5" />}
                      label="Avg Checkout Time"
                      value={`${ia.checkoutTimeSeconds.toFixed(1)}s`}
                      riskValue={Math.max(0, Math.round((1 - ia.checkoutTimeSeconds / 120) * 100))}
                      color={ia.checkoutTimeSeconds < 15 ? "#C62828" : "#2E7D32"}
                      description={ia.checkoutTimeSeconds < 15 ? "Pre-filled/automated" : "Human reading speed"}
                    />
                    <SignalRow
                      icon={<Activity className="w-3.5 h-3.5" />}
                      label="Session Variance CV"
                      value={ia.checkoutTimeVariance.toFixed(2)}
                      riskValue={Math.round((1 - ia.checkoutTimeVariance) * 100)}
                      color={ia.checkoutTimeVariance < 0.1 ? "#C62828" : "#2E7D32"}
                      description={ia.checkoutTimeVariance < 0.1 ? "Scripted constant time" : "Natural variation"}
                    />
                  </div>
                  <CheckoutTimeViz seconds={ia.checkoutTimeSeconds} variance={ia.checkoutTimeVariance} isBot={isBot} />
                </CardContent>
              </Card>

              {/* Transaction burst + refund */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#003366]">
                    <Zap className="w-4 h-4" /> Booking Velocity &amp; Refund Routing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BurstTimeline bookings={ia.burstBookingsLast24h} windowMinutes={ia.burstWindowMinutes} isBot={isBot} />
                  <div className="border-t pt-3">
                    <RefundRoutingPanel match={ia.refundDestinationMatch} velocity={ia.refundVelocityScore} />
                  </div>
                  {ia.burstBookingsLast24h > 15 && (
                    <div className="text-xs p-2 bg-red-50 border border-red-100 rounded text-red-700">
                      🚨 {ia.burstBookingsLast24h} bookings in a {ia.burstWindowMinutes}-minute window — transaction burst exceeds 3σ of cohort. Classic bust-out acceleration signal.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── ENTROPY & HHI TAB ── */}
        {activeTab === "entropy" && (
          <motion.div key="entropy" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div className="grid grid-cols-3 gap-5">
              {/* Radar */}
              <div className="col-span-1 bg-white border rounded-xl p-4">
                <h2 className="font-semibold mb-1 text-sm">8-Dimension Entropy Radar</h2>
                <p className="text-xs text-gray-500 mb-3">Higher = more natural/human-like behavior</p>
                {loading ? (
                  <div className="h-64 flex items-center justify-center text-gray-300 text-sm">Analyzing…</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#6B7280" }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [`${v}%`]} />
                      <Radar name="Score" dataKey="value"
                        stroke={entropy?.mimicryDetected ? "#C62828" : "#2E7D32"}
                        fill={entropy?.mimicryDetected ? "#C62828" : "#2E7D32"}
                        fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Entropy components */}
              <div className="col-span-2 space-y-4">
                <div className="bg-white border rounded-xl p-4">
                  <h2 className="font-semibold mb-4">Transaction Entropy Components</h2>
                  <div className="space-y-4">
                    {[
                      { icon: <Clock className="w-4 h-4" />, label: "Booking Time Variance", desc: "Scripted bots book at uniform times.", value: entropy?.components.bookingTimeVariance ?? 0 },
                      { icon: <DollarSign className="w-4 h-4" />, label: "Ticket Value Diversity", desc: "Automated fraud uses near-identical values.", value: entropy?.components.ticketValueDiversity ?? 0 },
                      { icon: <XCircle className="w-4 h-4" />, label: "Cancellation Naturalness", desc: "Scripted behavior shows regular cancellations.", value: entropy?.components.cancellationNaturalness ?? 0 },
                    ].map(c => {
                      const color = c.value >= 60 ? "#2E7D32" : c.value >= 30 ? "#FF6600" : "#C62828";
                      return (
                        <div key={c.label} className="flex gap-3">
                          <div className="p-2 rounded-lg bg-gray-50 flex-shrink-0" style={{ color }}>{c.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{c.label}</span>
                              <span className="text-sm font-mono font-bold" style={{ color }}>{loading ? "…" : `${c.value}%`}</span>
                            </div>
                            <Progress value={loading ? 0 : c.value} className="h-2 mb-1" />
                            <p className="text-xs text-gray-500">{c.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {gaps && (
                  <div className="bg-white border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold">Booking-to-Travel Gap Analysis</h2>
                      {gaps.manipulationDetected && <Badge className="bg-[#C62828] text-white text-xs">Settlement Delay</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Avg Gap", value: `${gaps.avgGap}d`, color: gaps.avgGap > 90 ? "#C62828" : "#003366" },
                        { label: "Far-Future >90d", value: `${gaps.longGapRatio}%`, color: gaps.longGapRatio > 60 ? "#C62828" : "#FF6600" },
                        { label: "Late Cancellations", value: `${gaps.lastMinuteCancellationRate}%`, color: gaps.lastMinuteCancellationRate > 30 ? "#C62828" : "#2E7D32" },
                      ].map(m => (
                        <div key={m.label} className="p-3 rounded-lg border bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                          <div className="text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* HHI - full width */}
              <div className="col-span-3">
                <div className="bg-white border rounded-xl overflow-hidden">
                  <button className="flex items-center justify-between w-full p-4 hover:bg-gray-50" onClick={() => setShowHHI(!showHHI)}>
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#003366]" />
                      <span className="font-semibold text-sm">HHI Booking Concentration Analysis</span>
                      <span className="text-sm font-black ml-2" style={{ color: hhiLabel(compositeHHI).color }}>
                        {compositeHHI.toLocaleString()}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full border font-semibold" style={{ color: hhiLabel(compositeHHI).color, borderColor: hhiLabel(compositeHHI).color + "55", background: hhiLabel(compositeHHI).color + "11" }}>
                        {hhiLabel(compositeHHI).label}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showHHI ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showHHI && hhi && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4">
                          {/* Gauge strip */}
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>0</span><span>1,500</span><span>2,500</span><span>5,000</span><span>10,000</span>
                            </div>
                            <div className="relative h-3 rounded-full" style={{ background: "linear-gradient(to right, #a7f3d0, #fef08a, #fed7aa, #fecaca, #ef4444)" }}>
                              <motion.div
                                initial={{ left: "0%" }}
                                animate={{ left: `${Math.min(97, (compositeHHI / 10000) * 100)}%` }}
                                transition={{ type: "spring", stiffness: 80, damping: 18 }}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg"
                                style={{ background: hhiLabel(compositeHHI).color }}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            {[
                              { title: "Route Concentration", hhi: calcHHI(hhi.routes), data: hhi.routes },
                              { title: "Airline Concentration", hhi: calcHHI(hhi.airlines), data: hhi.airlines },
                              { title: "Ticket Value Bands", hhi: calcHHI(hhi.ticketBands), data: hhi.ticketBands },
                            ].map(dim => {
                              const { color: dc } = hhiLabel(dim.hhi);
                              return (
                                <div key={dim.title}>
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs font-semibold text-gray-600">{dim.title}</p>
                                    <span className="text-xs font-black" style={{ color: dc }}>{dim.hhi.toLocaleString()}</span>
                                  </div>
                                  <ResponsiveContainer width="100%" height={110}>
                                    <BarChart data={dim.data} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                                      <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 1]} />
                                      <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(0)}%`, "Share"]} contentStyle={{ fontSize: 11 }} />
                                      <Bar dataKey="share" radius={[3, 3, 0, 0]}>
                                        {dim.data.map((_, i) => (
                                          <Cell key={i} fill={[dc, dc + "bb", dc + "77", "#e2e8f0"][Math.min(i, 3)]} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
      <div className="bg-white border rounded-xl">
        <button className="flex items-center justify-between w-full p-4" onClick={() => setShowHow(!showHow)}>
          <h2 className="font-semibold">How the 17-Signal System Works</h2>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showHow ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {showHow && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 grid grid-cols-4 gap-3 text-xs text-gray-600">
                <div className="p-3 bg-blue-50 rounded"><div className="font-semibold text-[#003366] mb-1">🔍 Device Fingerprinting</div>Canvas, WebGL, font, audio, and hardware fingerprinting detect device rotation/spoofing used by bot operators.</div>
                <div className="p-3 bg-orange-50 rounded"><div className="font-semibold text-[#FF6600] mb-1">🌐 Network Masking</div>VPN, proxy, and datacenter IP detection identifies infrastructure concealment layers — a hallmark of coordinated fraud rings.</div>
                <div className="p-3 bg-purple-50 rounded"><div className="font-semibold text-[#6D28D9] mb-1">⌨️ Biometric Typing</div>Inter-key timing statistics (mean, CV, percentile) expose automated input. Humans have CV &gt; 0.3 from cognitive processing pauses.</div>
                <div className="p-3 bg-green-50 rounded"><div className="font-semibold text-[#2E7D32] mb-1">🖱️ Mouse Physics</div>Bots move in geometric straight lines. Natural mouse paths follow Fitts' Law with curvature, micro-corrections, and acceleration variance.</div>
                <div className="p-3 bg-yellow-50 rounded"><div className="font-semibold text-[#F57C00] mb-1">🛒 Checkout Timing</div>Completing a multi-field checkout in &lt;10s is statistically impossible for humans reading and verifying data. Bots pre-fill fields.</div>
                <div className="p-3 bg-red-50 rounded"><div className="font-semibold text-[#C62828] mb-1">⚡ Burst Detection</div>Transaction velocity burst (many bookings in a short window) is a primary bust-out signal — fraudsters maximize ticket volume before absconding.</div>
                <div className="p-3 bg-teal-50 rounded"><div className="font-semibold text-[#0F766E] mb-1">💳 Refund Routing</div>Fraudsters redirect refunds to different accounts/destinations — refund destination mismatch rate &gt;50% triggers investigation.</div>
                <div className="p-3 bg-gray-50 rounded"><div className="font-semibold text-gray-700 mb-1">📊 HHI Concentration</div>Legitimate agencies show diverse bookings. Fraudsters optimize for cheapest routes to maximize ticket count. HHI &gt;5,000 is a structural red flag.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
