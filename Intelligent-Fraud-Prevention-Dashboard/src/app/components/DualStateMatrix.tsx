import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, CreditCard, UserX, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { cn } from "./ui/utils";
import { computeDualState, type DualStateResult } from "../services/riskApi";

interface DualStateMatrixProps {
  creditHealth: number;
  identityIntegrity: number;
  agencyName?: string;
  additionalSignals?: Record<string, number>;
  compact?: boolean;
}

const QUADRANT_CONFIG = {
  TRUSTED: {
    label: "Trusted",
    sublabel: "Full credit available",
    icon: CheckCircle,
    color: "#2E7D32",
    bg: "bg-green-50",
    border: "border-green-200",
    badgeBg: "bg-green-100",
    badgeText: "text-green-800",
    position: { col: 2, row: 1 },
  },
  IDENTITY_RISK: {
    label: "Identity Risk",
    sublabel: "Step-up verification",
    icon: UserX,
    color: "#FF6600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
    position: { col: 1, row: 1 },
  },
  FINANCIAL_RISK: {
    label: "Financial Risk",
    sublabel: "Reduce credit limit",
    icon: CreditCard,
    color: "#F57C00",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-800",
    position: { col: 2, row: 2 },
  },
  DUAL_RISK: {
    label: "Dual Risk",
    sublabel: "Pause all exposure",
    icon: AlertTriangle,
    color: "#C62828",
    bg: "bg-red-50",
    border: "border-red-200",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    position: { col: 1, row: 2 },
  },
} as const;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  APPROVE: { label: "✓ Approve", color: "#2E7D32" },
  VERIFY_IDENTITY: { label: "⚠ Verify Identity", color: "#FF6600" },
  REDUCE_CREDIT: { label: "↓ Reduce Credit", color: "#F57C00" },
  PAUSE_EXPOSURE: { label: "✗ Pause Exposure", color: "#C62828" },
};

export function DualStateMatrix({ creditHealth, identityIntegrity, agencyName, additionalSignals, compact = false }: DualStateMatrixProps) {
  const [result, setResult] = useState<DualStateResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    computeDualState({
      creditHealth,
      identityIntegrity,
      ...additionalSignals,
    }).then((r) => {
      if (!cancelled) { setResult(r); setLoading(false); }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [creditHealth, identityIntegrity]);

  const quadrant = result?.quadrant ?? "TRUSTED";
  const config = QUADRANT_CONFIG[quadrant];
  const actionInfo = ACTION_LABELS[result?.action ?? "APPROVE"];

  // Dot position on the matrix (0–100 → percentage)
  const dotX = identityIntegrity; // x-axis = identity
  const dotY = 100 - creditHealth; // y-axis = credit (inverted, top = high)

  if (compact) {
    return (
      <div className={cn("rounded-lg border p-3", config.border, config.bg)}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded" style={{ background: `${config.color}20` }}>
            <config.icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</div>
            <div className="text-xs text-gray-500 truncate">{config.sublabel}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">C: {creditHealth}%</div>
            <div className="text-xs text-gray-500">I: {identityIntegrity}%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#003366]" />
            Dual-State Risk Matrix
          </h3>
          {agencyName && <p className="text-xs text-gray-500 mt-0.5">{agencyName}</p>}
        </div>
        {result && (
          <div className={cn("px-3 py-1.5 rounded-full text-xs font-semibold", config.badgeBg, config.badgeText)}>
            {config.label}
          </div>
        )}
      </div>

      {/* 2×2 Grid */}
      <div className="relative mb-4">
        {/* Axis labels */}
        <div className="absolute -top-5 left-0 right-0 flex justify-between text-xs text-gray-400 px-8">
          <span>Low Identity Integrity</span>
          <span>High Identity Integrity</span>
        </div>
        <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 py-4">
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>High Credit</span>
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Low Credit</span>
        </div>

        <div className="ml-6 mt-2 grid grid-cols-2 gap-1 relative">
          {/* Q2: High Credit, Low Identity → Identity Risk */}
          <MatrixCell
            config={QUADRANT_CONFIG.IDENTITY_RISK}
            isActive={quadrant === "IDENTITY_RISK"}
            label="Identity Risk"
            sublabel="Verify Identity"
          />
          {/* Q1: High Credit, High Identity → Trusted */}
          <MatrixCell
            config={QUADRANT_CONFIG.TRUSTED}
            isActive={quadrant === "TRUSTED"}
            label="Trusted"
            sublabel="Full Credit"
          />
          {/* Q3: Low Credit, Low Identity → Dual Risk */}
          <MatrixCell
            config={QUADRANT_CONFIG.DUAL_RISK}
            isActive={quadrant === "DUAL_RISK"}
            label="Dual Risk"
            sublabel="Pause Exposure"
          />
          {/* Q4: Low Credit, High Identity → Financial Risk */}
          <MatrixCell
            config={QUADRANT_CONFIG.FINANCIAL_RISK}
            isActive={quadrant === "FINANCIAL_RISK"}
            label="Financial Risk"
            sublabel="Reduce Credit"
          />

          {/* Agency position dot */}
          <motion.div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg z-10"
            style={{
              left: `calc(${dotX}% - 8px)`,
              top: `calc(${dotY}% - 8px)`,
              background: loading ? "#999" : config.color,
            }}
            animate={{ scale: loading ? 0.8 : 1 }}
            transition={{ duration: 0.3 }}
          />

          {/* 60% threshold lines */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute border-t-2 border-dashed border-gray-300" style={{ top: "40%", left: 0, right: 0 }} />
            <div className="absolute border-l-2 border-dashed border-gray-300" style={{ left: "50%", top: 0, bottom: 0 }} />
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <ScoreBar label="Credit Health" value={creditHealth} color="#003366" />
        <ScoreBar label="Identity Integrity" value={identityIntegrity} color="#FF6600" />
      </div>

      {/* Action + reasoning */}
      {result && (
        <AnimatePresence mode="wait">
          <motion.div
            key={quadrant}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("p-3 rounded-lg border", config.border, config.bg)}
          >
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="w-3 h-3" style={{ color: actionInfo.color }} />
              <span className="text-xs font-semibold" style={{ color: actionInfo.color }}>
                {actionInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{result.reasoning}</p>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Sub-signal breakdown */}
      {result && !loading && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">Credit Signals</div>
            {Object.entries(result.creditSignals).map(([key, val]) => (
              <MiniBar key={key} label={humanize(key)} value={Math.round((val as number) * 100)} color="#003366" />
            ))}
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">Identity Signals</div>
            {Object.entries(result.identitySignals).map(([key, val]) => (
              <MiniBar key={key} label={humanize(key)} value={Math.round((val as number) * 100)} color="#FF6600" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatrixCell({ config, isActive, label, sublabel }: {
  config: typeof QUADRANT_CONFIG[keyof typeof QUADRANT_CONFIG];
  isActive: boolean;
  label: string;
  sublabel: string;
}) {
  return (
    <motion.div
      animate={{ opacity: isActive ? 1 : 0.45, scale: isActive ? 1 : 0.97 }}
      className={cn(
        "h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all",
        config.bg,
        isActive ? config.border : "border-gray-200"
      )}
    >
      <config.icon className="w-5 h-5 mb-1" style={{ color: isActive ? config.color : "#9CA3AF" }} />
      <div className="text-xs font-semibold" style={{ color: isActive ? config.color : "#6B7280" }}>{label}</div>
      <div className="text-xs text-gray-400">{sublabel}</div>
    </motion.div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="text-xs text-gray-500 w-28 truncate">{label}</div>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, opacity: 0.7 }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="text-xs font-mono text-gray-500 w-6">{value}</div>
    </div>
  );
}

function humanize(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
