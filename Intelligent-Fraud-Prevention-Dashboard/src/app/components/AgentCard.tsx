import { Brain, DollarSign, Users, BarChart3, Loader2, CheckCircle } from "lucide-react";
import { AgentAssessment } from "../types";
import { Progress } from "./ui/progress";
import { motion } from "motion/react";
import { cn } from "./ui/utils";

interface AgentCardProps {
  agent: AgentAssessment;
  index: number;
}

export function AgentCard({ agent, index }: AgentCardProps) {
  const getAgentIcon = (type: string) => {
    switch (type) {
      case "financial":
        return <DollarSign className="w-5 h-5" />;
      case "behavioral":
        return <Users className="w-5 h-5" />;
      case "network":
        return <Brain className="w-5 h-5" />;
      case "benchmark":
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Brain className="w-5 h-5" />;
    }
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case "financial":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "behavioral":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "network":
        return "bg-pink-100 text-pink-700 border-pink-200";
      case "benchmark":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "analyzing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "complete":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border rounded-lg p-4"
    >
      {/* Agent Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("p-2.5 rounded-lg border", getAgentColor(agent.agentType))}>
          {getAgentIcon(agent.agentType)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm">{agent.agentName}</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {getStatusIcon(agent.status)}
              <span className="capitalize">{agent.status}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 capitalize">{agent.agentType} Analysis</p>
        </div>
      </div>

      {/* Risk Score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Risk Assessment</span>
          <span
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
          </span>
        </div>
        <Progress
          value={agent.riskScore}
          className={cn(
            "h-2",
            agent.riskScore >= 80
              ? "[&>div]:bg-[#C62828]"
              : agent.riskScore >= 60
              ? "[&>div]:bg-[#FF6600]"
              : agent.riskScore >= 40
              ? "[&>div]:bg-[#F57C00]"
              : "[&>div]:bg-[#2E7D32]"
          )}
        />
      </div>

      {/* Confidence Level */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Confidence</span>
          <span className="text-sm font-semibold">{agent.confidence}%</span>
        </div>
        <Progress value={agent.confidence} className="h-1.5 [&>div]:bg-[#003366]" />
      </div>

      {/* Reasoning */}
      <div className="mb-3 p-3 bg-gray-50 rounded border-l-2 border-[#003366]">
        <p className="text-xs text-gray-700 leading-relaxed">{agent.reasoning}</p>
      </div>

      {/* Key Factors */}
      <div>
        <span className="text-xs text-gray-500 mb-2 block">Key Factors:</span>
        <div className="flex flex-wrap gap-1.5">
          {agent.factors.map((factor, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded border"
            >
              {factor}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
