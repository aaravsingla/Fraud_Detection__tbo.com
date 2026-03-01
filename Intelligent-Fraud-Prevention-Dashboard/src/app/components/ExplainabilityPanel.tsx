import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { RiskFactor } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";
import { Progress } from "./ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ExplainabilityPanelProps {
  factors: RiskFactor[];
  totalRiskScore: number;
  confidence?: number; // 0..1
  subscores?: {
    fraud: number;
    chargeback: number;
    credit: number;
    network: number;
  };
  notes?: string[];
  signalCoverage?: { present: number; total: number };
}

export function ExplainabilityPanel({
  factors,
  totalRiskScore,
  confidence,
  subscores,
  notes,
  signalCoverage,
}: Readonly<ExplainabilityPanelProps>) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border rounded-lg">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-label="Toggle explainability panel"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Risk Factor Breakdown</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Contribution analysis (synthetic)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {factors.length} factor{factors.length === 1 ? "" : "s"} identified
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3">
              {/* Optional: Uncertainty / coverage */}
              <ExplainabilityMeta
                confidence={confidence}
                subscores={subscores}
                notes={notes}
                signalCoverage={signalCoverage}
              />

              {factors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No significant risk factors identified</p>
                  <p className="text-xs mt-1">This booking shows normal patterns</p>
                </div>
              ) : (
                factors.map((factor, index) => (
                  <motion.div
                    key={factor.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{factor.name}</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{factor.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{factor.value}</span>
                        <span
                          className={cn(
                            "text-sm font-mono font-bold min-w-[3rem] text-right",
                            factor.contribution > 0 ? "text-[#C62828]" : "text-[#2E7D32]"
                          )}
                        >
                          {factor.contribution > 0 ? "+" : ""}
                          {factor.contribution}%
                        </span>
                      </div>
                    </div>

                    {/* Contribution Bar */}
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.abs(factor.contribution)}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className={cn(
                          "h-full rounded-full",
                          factor.contribution > 0 ? "bg-[#C62828]" : "bg-[#2E7D32]"
                        )}
                      />
                    </div>
                  </motion.div>
                ))
              )}

              {/* Summary */}
              {factors.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-semibold">Total Risk Contribution</span>
                    <span className="text-lg font-mono font-bold text-[#003366]">
                      {totalRiskScore}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExplainabilityMeta(
  props: Readonly<{
    confidence?: number;
    subscores?: {
      fraud: number;
      chargeback: number;
      credit: number;
      network: number;
    };
    notes?: string[];
    signalCoverage?: { present: number; total: number };
  }>
) {
  const { confidence, subscores, notes, signalCoverage } = props;
  if (confidence === undefined && !subscores && (!notes || notes.length === 0) && !signalCoverage) {
    return null;
  }

  return (
    <div className="space-y-3">
      {confidence !== undefined && (
        <div className="p-3 bg-gray-50 rounded border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Decision Confidence</span>
            <span className={cn("text-sm font-mono font-bold", confidence < 0.55 ? "text-[#C62828]" : "text-[#2E7D32]")}>{Math.round(confidence * 100)}%</span>
          </div>
          <Progress value={Math.round(confidence * 100)} className="h-1.5 [&>div]:bg-[#003366]" />
          {signalCoverage && (
            <div className="mt-2 text-xs text-gray-600">
              Signal coverage: {signalCoverage.present}/{signalCoverage.total}
            </div>
          )}
        </div>
      )}

      {subscores && (
        <div className="p-3 bg-white rounded border">
          <div className="text-sm font-semibold mb-2">Sub-scores</div>
          <div className="space-y-2 text-xs">
            <SubscoreRow label="Fraud" value={subscores.fraud} />
            <SubscoreRow label="Chargeback" value={subscores.chargeback} />
            <SubscoreRow label="Credit" value={subscores.credit} />
            <SubscoreRow label="Network" value={subscores.network} />
          </div>
        </div>
      )}

      {notes && notes.length > 0 && (
        <div className="p-3 bg-blue-50 rounded border">
          <div className="text-sm font-semibold mb-1">Notes</div>
          <ul className="text-xs text-gray-700 list-disc pl-4 space-y-1">
            {notes.slice(0, 4).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SubscoreRow({ label, value }: Readonly<{ label: string; value: number }>) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-mono font-semibold">{percent}%</span>
      </div>
      <Progress value={percent} className="h-1.5 [&>div]:bg-[#FF6600]" />
    </div>
  );
}
