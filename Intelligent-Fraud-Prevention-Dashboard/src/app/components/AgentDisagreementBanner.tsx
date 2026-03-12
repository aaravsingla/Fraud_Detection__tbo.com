import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import { AgentAssessment } from "../types";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";
import { useState } from "react";

interface AgentDisagreementBannerProps {
  agents: AgentAssessment[];
  bookingId: string;
  onEscalate: () => void;
  isEscalated?: boolean;
}

function computeDisagreement(agents: AgentAssessment[]) {
  let maxSpread = 0;
  let highAgent = "";
  let lowAgent = "";

  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const spread = Math.abs(agents[i].riskScore - agents[j].riskScore);
      if (spread > maxSpread) {
        maxSpread = spread;
        if (agents[i].riskScore >= agents[j].riskScore) {
          highAgent = agents[i].agentName;
          lowAgent = agents[j].agentName;
        } else {
          highAgent = agents[j].agentName;
          lowAgent = agents[i].agentName;
        }
      }
    }
  }
  return { maxSpread, highAgent, lowAgent };
}

export function AgentDisagreementBanner({
  agents,
  bookingId,
  onEscalate,
  isEscalated = false,
}: AgentDisagreementBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const { maxSpread, highAgent, lowAgent } = computeDisagreement(agents);

  if (maxSpread <= 20) return null;

  const severity = maxSpread > 30 ? "critical" : "warning";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border-2 p-4",
        severity === "critical"
          ? "border-red-400 bg-red-50"
          : "border-amber-400 bg-amber-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            severity === "critical"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
          )}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3
              className={cn(
                "font-semibold text-sm",
                severity === "critical" ? "text-red-800" : "text-amber-800"
              )}
            >
              Agent Disagreement Detected
            </h3>
            <span
              className={cn(
                "text-xs font-mono font-bold px-2 py-0.5 rounded-full",
                severity === "critical"
                  ? "bg-red-200 text-red-800"
                  : "bg-amber-200 text-amber-800"
              )}
            >
              Δ {maxSpread} pts
            </span>
          </div>
          <p
            className={cn(
              "text-xs mb-3",
              severity === "critical" ? "text-red-600" : "text-amber-600"
            )}
          >
            <strong>{highAgent}</strong> and <strong>{lowAgent}</strong> disagree
            by {maxSpread} points on booking {bookingId}. Manual review
            recommended.
          </p>

          <div className="flex items-center gap-2">
            {isEscalated ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5" />
                Escalated
              </span>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={onEscalate}
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Escalate to Manager
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  Hide Details <ChevronUp className="w-3.5 h-3.5 ml-1" />
                </>
              ) : (
                <>
                  Compare Agents <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-3 border-t border-amber-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.agentId}
                  className="bg-white rounded-md border p-2.5 text-center"
                >
                  <p className="text-xs text-gray-500 truncate">
                    {agent.agentName}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-mono font-bold",
                      agent.riskScore >= 80
                        ? "text-[#C62828]"
                        : agent.riskScore >= 60
                        ? "text-[#FF6600]"
                        : agent.riskScore >= 40
                        ? "text-[#F57C00]"
                        : "text-[#2E7D32]"
                    )}
                  >
                    {agent.riskScore}%
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {agent.confidence}% conf.
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
