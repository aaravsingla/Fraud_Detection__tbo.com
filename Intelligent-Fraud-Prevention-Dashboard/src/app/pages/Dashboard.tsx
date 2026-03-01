import { useEffect, useMemo, useState } from "react";
import { BookingCard } from "../components/BookingCard";
import { AgentCard } from "../components/AgentCard";
import { ExplainabilityPanel } from "../components/ExplainabilityPanel";
import { DualStateMatrix } from "../components/DualStateMatrix";
import { mockBookings } from "../data/mockData";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Filter, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { motion } from "motion/react";
import type { RiskFactor } from "../types";
import { scoreBookingRisk, type RiskDecision } from "../services/riskApi";
import { signalsFromBooking } from "../services/signalAdapters";

// Derive dual-state values from a booking's mock data
function getDualStateFromBooking(bookingId: string) {
  const profiles: Record<string, { creditHealth: number; identityIntegrity: number; additionalSignals?: Record<string, number> }> = {
    "BK-2026-001": { creditHealth: 38, identityIntegrity: 22, additionalSignals: { settlementRate: 55, utilizationDeviation: 75, exposureGrowthRate: 180, loginConsistency: 25, deviceContinuity: 15, behaviorEntropy: 20 } },
    "BK-2026-002": { creditHealth: 88, identityIntegrity: 92, additionalSignals: { settlementRate: 97, utilizationDeviation: 8, exposureGrowthRate: 5, loginConsistency: 95, deviceContinuity: 98, behaviorEntropy: 85 } },
    "BK-2026-003": { creditHealth: 62, identityIntegrity: 54, additionalSignals: { settlementRate: 78, utilizationDeviation: 35, exposureGrowthRate: 65, loginConsistency: 58, deviceContinuity: 72, behaviorEntropy: 45 } },
    "BK-2026-004": { creditHealth: 94, identityIntegrity: 96, additionalSignals: { settlementRate: 99, utilizationDeviation: 4, exposureGrowthRate: 2, loginConsistency: 98, deviceContinuity: 99, behaviorEntropy: 91 } },
  };
  return profiles[bookingId] ?? { creditHealth: 70, identityIntegrity: 70 };
}

export function Dashboard() {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [apiDecision, setApiDecision] = useState<RiskDecision | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const selectedBooking = selectedBookingId
    ? mockBookings.find((b) => b.id === selectedBookingId)
    : null;

  const consensusConfidence = useMemo(() => {
    if (!selectedBooking) return 0;
    const confidences = selectedBooking.agentAssessments.map((a) => a.confidence);
    const avg = confidences.reduce((a, b) => a + b, 0) / Math.max(1, confidences.length);
    return avg / 100;
  }, [selectedBooking]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!selectedBooking) { setApiDecision(null); return; }
      setApiLoading(true);
      try {
        const res = await scoreBookingRisk({ bookingId: selectedBooking.id, signals: signalsFromBooking(selectedBooking) });
        if (!cancelled) setApiDecision(res);
      } catch {
        if (!cancelled) setApiDecision(null);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [selectedBooking]);

  const explainabilityFactors: RiskFactor[] = useMemo(() => {
    if (apiDecision) {
      return apiDecision.explainability.topFactors.map((f) => ({
        name: humanizeKey(f.key),
        contribution: Math.round(f.contribution),
        value: "signal",
        description: "Backend contribution (synthetic).",
      }));
    }
    return selectedBooking?.riskFactors ?? [];
  }, [apiDecision, selectedBooking]);

  const displayedRiskScore = apiDecision?.riskScore ?? selectedBooking?.riskScore ?? 0;
  const displayedDecision = apiDecision?.decision ?? null;
  const displayedConfidence = apiDecision?.confidence ?? consensusConfidence;

  const dualStateProfile = selectedBookingId ? getDualStateFromBooking(selectedBookingId) : null;

  const filteredBookings = mockBookings.filter((booking) => {
    if (filterStatus === "all") return true;
    return booking.status === filterStatus;
  });

  const statusCounts = {
    all: mockBookings.length,
    reviewing: mockBookings.filter((b) => b.status === "reviewing").length,
    approved: mockBookings.filter((b) => b.status === "approved").length,
    rejected: mockBookings.filter((b) => b.status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366]">Live Booking Feed</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time fraud detection with multi-agent analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filters</Button>
          <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        </div>
      </div>

      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All Bookings <Badge variant="secondary" className="ml-2">{statusCounts.all}</Badge></TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing <Badge variant="secondary" className="ml-2">{statusCounts.reviewing}</Badge></TabsTrigger>
          <TabsTrigger value="approved">Approved <Badge variant="secondary" className="ml-2">{statusCounts.approved}</Badge></TabsTrigger>
          <TabsTrigger value="rejected">Rejected <Badge variant="secondary" className="ml-2">{statusCounts.rejected}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-12 gap-6">
        {/* Booking feed */}
        <div className="col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Transactions</h2>
            <span className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onViewDetails={setSelectedBookingId} />
            ))}
          </div>
        </div>

        {/* Details panel */}
        <div className="col-span-8 space-y-5">
          {selectedBooking ? (
            <>
              {/* ── Dual-State Matrix (NEW) ── */}
              {dualStateProfile && (
                <DualStateMatrix
                  creditHealth={dualStateProfile.creditHealth}
                  identityIntegrity={dualStateProfile.identityIntegrity}
                  agencyName={selectedBooking.agencyName}
                  additionalSignals={dualStateProfile.additionalSignals}
                />
              )}

              {/* Multi-Agent */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold">Multi-Agent Analysis</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Independent assessments from specialized AI agents</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Consensus Risk Score</div>
                    <div className="text-2xl font-mono font-bold text-[#003366]">{selectedBooking.riskScore}%</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedBooking.agentAssessments.map((agent, index) => (
                    <AgentCard key={agent.agentId} agent={agent} index={index} />
                  ))}
                </div>
              </div>

              {/* Explainability */}
              <ExplainabilityPanel
                factors={explainabilityFactors}
                totalRiskScore={displayedRiskScore}
                confidence={displayedConfidence}
                subscores={apiDecision?.subscores}
                notes={apiDecision?.explainability.notes}
                signalCoverage={apiDecision?.explainability.signalCoverage}
              />

              {/* Recommended Action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border rounded-lg p-4"
              >
                <h3 className="font-semibold mb-3">Recommended Action</h3>
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-[#003366]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-medium">{getRecommendedActionTitle({ decision: displayedDecision, riskScore: displayedRiskScore })}</span>
                      <p className="text-xs text-gray-600 mt-1">{getRecommendedActionDescription({ apiLoading, notes: apiDecision?.explainability?.notes, riskScore: displayedRiskScore })}</p>
                    </div>
                    <div className="text-sm font-semibold">{Math.round(displayedConfidence * 100)}% confidence</div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button className="flex-1 bg-[#2E7D32] hover:bg-[#2E7D32]/90">Approve</Button>
                    <Button className="flex-1" variant="outline">Request More Info</Button>
                    <Button className="flex-1 bg-[#C62828] hover:bg-[#C62828]/90" variant="destructive">Reject</Button>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed min-h-[400px]">
              <div className="text-center">
                <p className="text-gray-500">Select a booking to view detailed analysis</p>
                <p className="text-xs text-gray-400 mt-1">Click "View Details" on any booking card</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function humanizeKey(key: string) {
  let out = "";
  for (let i = 0; i < key.length; i++) {
    const ch = key[i];
    const prev = i > 0 ? key[i - 1] : "";
    if (ch === "_") { out += " "; continue; }
    const isUpper = ch >= "A" && ch <= "Z";
    const prevIsLower = prev >= "a" && prev <= "z";
    if (isUpper && prevIsLower) out += " ";
    out += ch;
  }
  out = out.split(" ").filter(Boolean).join(" ");
  return out.length ? out[0].toUpperCase() + out.slice(1) : out;
}

function getRecommendedActionTitle({ decision, riskScore }: { decision: string | null; riskScore: number }) {
  if (decision === "REJECT") return "Reject Transaction";
  if (decision === "REVIEW") return "Manual Review Required";
  if (decision === "APPROVE") return "Auto-Approve";
  if (riskScore >= 80) return "Reject Transaction";
  if (riskScore >= 60) return "Manual Review Required";
  if (riskScore >= 40) return "Enhanced Monitoring";
  return "Auto-Approve";
}

function getRecommendedActionDescription({ apiLoading, notes, riskScore }: { apiLoading: boolean; notes: string[] | undefined; riskScore: number }) {
  if (apiLoading) return "Scoring signals...";
  if (notes?.length) return notes[0];
  if (riskScore >= 80) return "High fraud probability detected. Multiple risk factors present.";
  if (riskScore >= 60) return "Suspicious patterns require human judgment.";
  if (riskScore >= 40) return "Monitor for pattern changes. Consider additional verification.";
  return "All checks passed. Transaction appears legitimate.";
}
