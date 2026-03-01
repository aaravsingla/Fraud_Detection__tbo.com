import { useEffect, useState } from "react";
import { Slider } from "../components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Calculator, TrendingUp, Info, AlertTriangle, Shield } from "lucide-react";
import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { recommendCredit, computeExitRisk, type CreditRecommendation, type ExitRiskResult } from "../services/riskApi";
import { Badge } from "../components/ui/badge";

const EXIT_RISK_ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MONITOR: { label: "Monitor", color: "#2E7D32", bg: "bg-green-50" },
  ENHANCED_MONITORING: { label: "Enhanced Monitoring", color: "#F57C00", bg: "bg-yellow-50" },
  CONTRACT_CREDIT: { label: "Contract Credit", color: "#FF6600", bg: "bg-orange-50" },
  FREEZE_CREDIT: { label: "Freeze Credit", color: "#C62828", bg: "bg-red-50" },
};

export function CreditSimulator() {
  // ── Credit parameters
  const [trustScore, setTrustScore] = useState([75]);
  const [transactionVolume, setTransactionVolume] = useState([5000000]);
  const [paymentHistory, setPaymentHistory] = useState([95]);
  const [riskFactors, setRiskFactors] = useState([2]);

  // ── Exit Risk parameters
  const [unsettledExposure, setUnsettledExposure] = useState([2000000]);
  const [avgMonthlySettlement, setAvgMonthlySettlement] = useState([800000]);
  const [exposureTrend, setExposureTrend] = useState([45]);

  // ── API state
  const [creditRec, setCreditRec] = useState<CreditRecommendation | null>(null);
  const [exitRisk, setExitRisk] = useState<ExitRiskResult | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);

  // Credit limit calculation
  const baseLimit = 500000;
  const trustMultiplier = trustScore[0] / 100;
  const volumeMultiplier = Math.log10(transactionVolume[0] / 1000000 + 1);
  const historyMultiplier = paymentHistory[0] / 100;
  const riskPenalty = 1 - (riskFactors[0] * 0.1);
  const calculatedLimit = Math.round(baseLimit * trustMultiplier * volumeMultiplier * historyMultiplier * riskPenalty);
  const policyRiskScore = Math.max(0, Math.min(100, riskFactors[0] * 10));

  // Credit API
  useEffect(() => {
    let cancelled = false;
    setRecLoading(true);
    recommendCredit({ currentCreditLimit: calculatedLimit, trustScore: trustScore[0], riskScore: policyRiskScore })
      .then((rec) => { if (!cancelled) setCreditRec(rec); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setRecLoading(false); });
    return () => { cancelled = true; };
  }, [calculatedLimit, trustScore[0], policyRiskScore]);

  // Exit Risk API
  useEffect(() => {
    let cancelled = false;
    setExitLoading(true);
    computeExitRisk({
      unsettledExposure: unsettledExposure[0],
      avgMonthlySettlement: avgMonthlySettlement[0],
      exposureTrend30d: exposureTrend[0],
    })
      .then((r) => { if (!cancelled) setExitRisk(r); })
      .catch(() => {
        // Synthetic fallback
        const ratio = unsettledExposure[0] / (avgMonthlySettlement[0] || 1);
        const score = Math.round(Math.min(100, (0.55 * Math.min(ratio / 4, 1) + 0.3 * Math.min(exposureTrend[0] / 300, 1)) * 100));
        const action = score >= 75 ? "FREEZE_CREDIT" : score >= 50 ? "CONTRACT_CREDIT" : score >= 30 ? "ENHANCED_MONITORING" : "MONITOR";
        if (!cancelled) setExitRisk({ settlementVelocityRatio: Math.round(ratio * 100) / 100, exitRiskScore: score, recommendedAction: action as any, exposureTrend30d: exposureTrend[0], notes: score >= 50 ? [`Exposure is ${Math.round(ratio * 100) / 100}× monthly settlement — unstable.`] : [] });
      })
      .finally(() => { if (!cancelled) setExitLoading(false); });
    return () => { cancelled = true; };
  }, [unsettledExposure[0], avgMonthlySettlement[0], exposureTrend[0]]);

  const resetToDefaults = () => {
    setTrustScore([75]); setTransactionVolume([5000000]);
    setPaymentHistory([95]); setRiskFactors([2]);
    setUnsettledExposure([2000000]); setAvgMonthlySettlement([800000]);
    setExposureTrend([45]);
  };

  const formatCurrency = (value: number) => `₹${(value / 100000).toFixed(1)}L`;
  const exitAction = exitRisk ? EXIT_RISK_ACTION_CONFIG[exitRisk.recommendedAction] : null;

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#003366]">Adaptive Credit & Exit Risk Simulator</h1>
        <p className="text-sm text-gray-500 mt-1">
          What-if analysis for credit limits + real-time exposure window monitoring
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ── Left: Credit inputs ── */}
        <div className="col-span-4 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Credit Parameters</h2>

          <SliderCard label="Trust Score" tooltip="Current trust level based on behavioral patterns" value={trustScore[0]} suffix=" / 100" onChange={setTrustScore} min={0} max={100} step={1} color="#003366" />
          <SliderCard label="Transaction Volume (12mo)" tooltip="Total 12-month transaction volume" value={formatCurrency(transactionVolume[0])} onChange={setTransactionVolume} min={1000000} max={50000000} step={500000} sliderValue={transactionVolume} color="#003366" />
          <SliderCard label="Payment History" tooltip="On-time payment rate" value={`${paymentHistory[0]}%`} onChange={setPaymentHistory} min={0} max={100} step={1} sliderValue={paymentHistory} color="#2E7D32" />
          <SliderCard label="Active Risk Factors" tooltip="Number of currently flagged alerts" value={riskFactors[0]} onChange={setRiskFactors} min={0} max={10} step={1} sliderValue={riskFactors} color="#C62828" />

          <div className="border-t pt-4">
            <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-4">Exposure Window</h2>
            <SliderCard label="Unsettled Exposure" tooltip="Total currently unsettled booking exposure" value={formatCurrency(unsettledExposure[0])} onChange={setUnsettledExposure} min={0} max={10000000} step={100000} sliderValue={unsettledExposure} color="#C62828" />
            <SliderCard label="Avg Monthly Settlement" tooltip="Average monthly settlement received" value={formatCurrency(avgMonthlySettlement[0])} onChange={setAvgMonthlySettlement} min={100000} max={5000000} step={100000} sliderValue={avgMonthlySettlement} color="#003366" />
            <SliderCard label="Exposure Trend (30d)" tooltip="Percentage change in unsettled exposure over 30 days" value={`+${exposureTrend[0]}%`} onChange={setExposureTrend} min={-50} max={400} step={5} sliderValue={exposureTrend} color="#FF6600" />
          </div>

          <Button onClick={resetToDefaults} variant="outline" className="w-full">Reset to Defaults</Button>
        </div>

        {/* ── Center: Credit results ── */}
        <div className="col-span-4 space-y-4">
          {/* Recommended limit */}
          <motion.div
            key={calculatedLimit}
            initial={{ scale: 0.97 }}
            animate={{ scale: 1 }}
            className="bg-gradient-to-br from-[#003366] to-[#004080] text-white rounded-lg p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5" />
              <h2 className="font-semibold">Recommended Credit Limit</h2>
            </div>
            <div className="text-5xl font-bold mt-3 mb-1 font-mono">{formatCurrency(calculatedLimit)}</div>
            <p className="text-xs opacity-80">Based on current credit parameters</p>
          </motion.div>

          {/* Policy recommendation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Adaptive Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Action" value={recLoading ? "Calculating…" : creditRec?.action ?? "—"} bold />
              <Row label="Recommended Limit" value={creditRec ? formatCurrency(creditRec.recommendedCreditLimit) : "—"} bold />
              <Row label="Policy Risk" value={`${policyRiskScore}%`} />
              {creditRec?.rationale?.length ? (
                <div className="pt-1 border-t text-gray-500">{creditRec.rationale.join(" · ")}</div>
              ) : null}
            </CardContent>
          </Card>

          {/* Formula */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Formula Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Base Limit" value={formatCurrency(baseLimit)} />
              <div className="border-t pt-2 space-y-1.5">
                <FormulaRow label="Trust Score" multiplier={trustMultiplier} />
                <FormulaRow label="Volume Factor" multiplier={volumeMultiplier} />
                <FormulaRow label="Payment History" multiplier={historyMultiplier} />
                <FormulaRow label="Risk Penalty" multiplier={riskPenalty} />
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Final Limit</span>
                <span className="font-mono text-[#003366]">{formatCurrency(calculatedLimit)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Exit Risk results ── */}
        <div className="col-span-4 space-y-4">
          {/* Exit risk score */}
          {exitRisk && (
            <motion.div
              key={exitRisk.exitRiskScore}
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              className={`rounded-lg p-5 border-2 ${exitRisk.exitRiskScore >= 75 ? "border-[#C62828] bg-red-50" : exitRisk.exitRiskScore >= 50 ? "border-[#FF6600] bg-orange-50" : "border-gray-200 bg-gray-50"}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-5 h-5 ${exitRisk.exitRiskScore >= 50 ? "text-[#C62828]" : "text-gray-400"}`} />
                <h2 className="font-semibold">Exit Risk Score</h2>
              </div>
              <div className={`text-5xl font-bold font-mono mb-1 ${exitRisk.exitRiskScore >= 75 ? "text-[#C62828]" : exitRisk.exitRiskScore >= 50 ? "text-[#FF6600]" : "text-[#2E7D32]"}`}>
                {exitLoading ? "…" : exitRisk.exitRiskScore}
                <span className="text-2xl font-normal">%</span>
              </div>
              <p className="text-xs text-gray-600">Probability of fraudulent exit or default event</p>
            </motion.div>
          )}

          {/* Recommended action */}
          {exitRisk && exitAction && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Exposure Action</CardTitle></CardHeader>
              <CardContent>
                <div className={`p-3 rounded-lg ${exitAction.bg} mb-2`}>
                  <div className="font-semibold text-sm" style={{ color: exitAction.color }}>
                    {exitAction.label}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Settlement velocity ratio: {exitRisk.settlementVelocityRatio}× monthly settlement
                  </div>
                </div>
                {exitRisk.notes.map((note, i) => (
                  <div key={i} className="flex gap-2 p-2 bg-red-50 rounded border border-red-100 text-xs text-gray-700">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C62828] mt-0.5 flex-shrink-0" />
                    {note}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Settlement metrics */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" />Exposure Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Unsettled Exposure" value={formatCurrency(unsettledExposure[0])} />
              <Row label="Avg Monthly Settlement" value={formatCurrency(avgMonthlySettlement[0])} />
              <Row label="Settlement Velocity Ratio" value={exitRisk ? `${exitRisk.settlementVelocityRatio}×` : "—"} bold />
              <Row label="30-Day Trend" value={`+${exposureTrend[0]}%`} color={exposureTrend[0] > 100 ? "#C62828" : "#FF6600"} />
              <div className="pt-2 border-t text-gray-400 text-xs italic">
                Ratio &gt; 2× signals unstable exposure. Ratio &gt; 3× triggers automatic credit contraction.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Local helpers ──────────────────────────────────────────────────────────────

function SliderCard({ label, tooltip, value, onChange, min, max, step, sliderValue, color, suffix }: {
  label: string; tooltip: string; value: string | number; onChange: (v: number[]) => void;
  min: number; max: number; step: number; sliderValue?: number[]; color: string; suffix?: string;
}) {
  const sv = sliderValue ?? (typeof value === "number" ? [value] : [0]);
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs font-medium text-gray-600">{label}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild><Info className="w-3 h-3 text-gray-400" /></TooltipTrigger>
              <TooltipContent><p className="text-xs max-w-xs">{tooltip}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xl font-bold" style={{ color }}>{value}{suffix ?? ""}</span>
        </div>
        <Slider value={sv} onValueChange={onChange} min={min} max={max} step={step}
          className={`[&_[role=slider]]:border-2`}
          style={{ "--slider-color": color } as React.CSSProperties}
        />
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? "font-semibold" : ""} style={color ? { color } : {}}>{value}</span>
    </div>
  );
}

function FormulaRow({ label, multiplier }: { label: string; multiplier: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono">×{multiplier.toFixed(2)}</span>
    </div>
  );
}
