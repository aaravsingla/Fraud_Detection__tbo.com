import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Shield,
  Wifi,
  Globe,
  Clock,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Zap,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

export type FraudRingEvidence = {
  ringId: string;
  name: string;
  detectedAt: string;
  agencies: Array<{
    id: string;
    name: string;
    trustScore: number;
    exposure: number;
    bookingsLast30d: number;
  }>;
  sharedSignals: Array<{
    type: "device" | "ip" | "payment" | "route";
    value: string;
    connectedAgencies: string[];
    riskWeight: number;
  }>;
  bookingOverlap: {
    sameRoutes: string[];
    sameTimeWindows: string[];
    priceDeviation: number;
  };
  financials: {
    totalExposure: number;
    potentialLoss: number;
    creditUtilized: number;
    settlementsPending: number;
  };
  confidenceScore: number;
  severity: "medium" | "high" | "critical";
  recommendedAction: string;
  status: "active" | "investigating" | "contained";
};

const MOCK_RING: FraudRingEvidence = {
  ringId: "RING-001",
  name: "DEV-789 Cluster",
  detectedAt: "Dec 18, 2025 · 14:23 IST",
  agencies: [
    { id: "AG-001", name: "Wanderlust Travels", trustScore: 35, exposure: 4500000, bookingsLast30d: 47 },
    { id: "AG-005", name: "QuickBook Express", trustScore: 28, exposure: 3200000, bookingsLast30d: 38 },
    { id: "AG-006", name: "TravelSmart Co", trustScore: 31, exposure: 2800000, bookingsLast30d: 29 },
  ],
  sharedSignals: [
    { type: "device", value: "DEV-789", connectedAgencies: ["Wanderlust", "QuickBook", "TravelSmart"], riskWeight: 92 },
    { type: "ip", value: "192.168.1.15", connectedAgencies: ["Wanderlust", "QuickBook"], riskWeight: 78 },
    { type: "route", value: "DEL → DXB (daily)", connectedAgencies: ["Wanderlust", "QuickBook", "TravelSmart"], riskWeight: 65 },
    { type: "payment", value: "Similar ticket price bands ₹8–9k", connectedAgencies: ["Wanderlust", "TravelSmart"], riskWeight: 55 },
  ],
  bookingOverlap: {
    sameRoutes: ["DEL→DXB", "BOM→DXB", "DEL→AUH"],
    sameTimeWindows: ["02:00–04:00 IST", "Fridays"],
    priceDeviation: 3.2,
  },
  financials: {
    totalExposure: 10500000,
    potentialLoss: 8400000,
    creditUtilized: 89,
    settlementsPending: 2,
  },
  confidenceScore: 94,
  severity: "critical",
  recommendedAction: "Freeze credit for all 3 agencies immediately. Escalate to fraud investigation team.",
  status: "active",
};

const SIGNAL_ICONS = {
  device: Wifi,
  ip: Globe,
  route: TrendingUp,
  payment: FileText,
};

const SIGNAL_COLORS = {
  device: "#C62828",
  ip: "#FF6600",
  route: "#F57C00",
  payment: "#6D28D9",
};

const SEVERITY_CONFIG = {
  critical: { bg: "bg-red-50", border: "border-red-300", text: "text-[#C62828]", badge: "bg-red-100 text-red-800" },
  high: { bg: "bg-orange-50", border: "border-orange-300", text: "text-[#FF6600]", badge: "bg-orange-100 text-orange-800" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-[#F57C00]", badge: "bg-yellow-100 text-yellow-800" },
};

interface RingEvidencePanelProps {
  ring?: FraudRingEvidence;
}

export function RingEvidencePanel({ ring = MOCK_RING }: RingEvidencePanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("signals");
  const [actionTaken, setActionTaken] = useState(false);
  const cfg = SEVERITY_CONFIG[ring.severity];

  const toggle = (section: string) =>
    setExpandedSection((prev) => (prev === section ? null : section));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border rounded-xl overflow-hidden shadow-sm"
    >
      {/* Case file header */}
      <div className={`px-5 py-4 border-b ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/70 border ${cfg.border}`}>
              <AlertTriangle className={`w-5 h-5 ${cfg.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-sm text-gray-900">Case #{ring.ringId}</h3>
                <Badge className={`text-xs px-2 py-0 ${cfg.badge} border-0`}>
                  {ring.severity.toUpperCase()}
                </Badge>
                <Badge
                  className={`text-xs px-2 py-0 border-0 ${
                    ring.status === "active"
                      ? "bg-red-100 text-red-700"
                      : ring.status === "investigating"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {ring.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">{ring.name} · Detected {ring.detectedAt}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Ring Confidence</div>
            <div className={`text-2xl font-black font-mono ${cfg.text}`}>
              {ring.confidenceScore}%
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-3">
          <Progress
            value={ring.confidenceScore}
            className={`h-1.5 [&>div]:${ring.severity === "critical" ? "bg-[#C62828]" : "bg-[#FF6600]"}`}
          />
        </div>
      </div>

      {/* Financial exposure strip */}
      <div className="grid grid-cols-4 divide-x border-b bg-gray-50">
        <FinancialCell
          label="Total Exposure"
          value={`₹${(ring.financials.totalExposure / 100000).toFixed(1)}L`}
          color="#C62828"
          sub="across 3 agencies"
        />
        <FinancialCell
          label="Potential Loss"
          value={`₹${(ring.financials.potentialLoss / 100000).toFixed(1)}L`}
          color="#FF6600"
          sub="if bust-out confirmed"
        />
        <FinancialCell
          label="Credit Utilized"
          value={`${ring.financials.creditUtilized}%`}
          color={ring.financials.creditUtilized > 80 ? "#C62828" : "#FF6600"}
          sub="of combined limit"
        />
        <FinancialCell
          label="Settlements Pending"
          value={`${ring.financials.settlementsPending}`}
          color="#F57C00"
          sub="overdue payments"
        />
      </div>

      {/* Agencies involved */}
      <div className="px-5 py-3 border-b">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
          Member Agencies ({ring.agencies.length})
        </div>
        <div className="space-y-2">
          {ring.agencies.map((agency) => (
            <div key={agency.id} className="flex items-center gap-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-[#C62828] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800 truncate">{agency.name}</span>
                  <span className="text-xs font-mono text-[#C62828] font-bold ml-2">
                    ₹{(agency.exposure / 100000).toFixed(1)}L
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">Trust: {agency.trustScore}%</span>
                  <span className="text-xs text-gray-500">{agency.bookingsLast30d} bookings/30d</span>
                  <div className="flex-1 h-1 bg-gray-200 rounded">
                    <div
                      className="h-1 rounded bg-[#C62828]"
                      style={{ width: `${agency.trustScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Signals — collapsible */}
      <CollapsibleSection
        id="signals"
        title="Shared Signals"
        subtitle={`${ring.sharedSignals.length} cross-agency signals detected`}
        icon={<Zap className="w-4 h-4 text-[#FF6600]" />}
        expanded={expandedSection === "signals"}
        onToggle={() => toggle("signals")}
      >
        <div className="space-y-2.5">
          {ring.sharedSignals.map((signal, i) => {
            const Icon = SIGNAL_ICONS[signal.type];
            const color = SIGNAL_COLORS[signal.type];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border"
              >
                <div className="p-1.5 rounded-lg flex-shrink-0" style={{ background: color + "18" }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800">{signal.value}</span>
                    <span className="text-xs font-mono font-bold" style={{ color }}>
                      {signal.riskWeight}% risk
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {signal.connectedAgencies.map((a) => (
                      <span key={a} className="text-xs px-1.5 py-0.5 bg-white border rounded text-gray-600">
                        {a}
                      </span>
                    ))}
                  </div>
                  <div className="h-1 bg-gray-200 rounded">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${signal.riskWeight}%` }}
                      transition={{ duration: 0.5, delay: i * 0.06 }}
                      className="h-1 rounded"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Booking Pattern Overlap — collapsible */}
      <CollapsibleSection
        id="patterns"
        title="Booking Pattern Overlap"
        subtitle="Behavioral fingerprinting across agencies"
        icon={<Clock className="w-4 h-4 text-[#6D28D9]" />}
        expanded={expandedSection === "patterns"}
        onToggle={() => toggle("patterns")}
      >
        <div className="space-y-3 text-xs">
          <PatternRow
            label="Common Routes"
            items={ring.bookingOverlap.sameRoutes}
            color="#C62828"
          />
          <PatternRow
            label="Same Time Windows"
            items={ring.bookingOverlap.sameTimeWindows}
            color="#FF6600"
          />
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border">
            <span className="text-gray-600">Ticket Price Variance</span>
            <span className="font-mono font-bold text-[#2E7D32]">
              ±{ring.bookingOverlap.priceDeviation}% <span className="text-gray-400 font-normal">(suspiciously low)</span>
            </span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Recommended action */}
      <div className="px-5 py-4 border-t bg-gray-50">
        <div className="flex items-start gap-3 mb-3">
          <Shield className="w-4 h-4 text-[#003366] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Recommended Action
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{ring.recommendedAction}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!actionTaken ? (
            <>
              <Button
                size="sm"
                className="flex-1 bg-[#C62828] hover:bg-[#C62828]/90 text-white text-xs h-8"
                onClick={() => setActionTaken(true)}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Freeze All 3 Agencies
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Investigate
              </Button>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
            >
              <CheckCircle className="w-4 h-4 text-[#2E7D32]" />
              <span className="text-xs font-semibold text-[#2E7D32]">
                Credit frozen for all 3 agencies · Case escalated
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FinancialCell({ label, value, color, sub }: {
  label: string; value: string; color: string; sub: string;
}) {
  return (
    <div className="px-4 py-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-black font-mono" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function CollapsibleSection({
  id, title, subtitle, icon, expanded, onToggle, children,
}: {
  id: string; title: string; subtitle: string; icon: React.ReactNode;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-b">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-800">{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PatternRow({ label, items, color }: {
  label: string; items: string[]; color: string;
}) {
  return (
    <div className="p-2.5 bg-gray-50 rounded-lg border">
      <div className="text-gray-500 mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="px-2 py-0.5 rounded text-white text-xs font-medium"
            style={{ background: color }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
