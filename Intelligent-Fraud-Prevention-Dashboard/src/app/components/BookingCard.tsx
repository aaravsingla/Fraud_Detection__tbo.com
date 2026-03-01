import { Clock, TrendingUp, CheckCircle, XCircle, Eye } from "lucide-react";
import { Booking } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { motion } from "motion/react";
import { cn } from "./ui/utils";

interface BookingCardProps {
  booking: Booking;
  onViewDetails: (bookingId: string) => void;
}

export function BookingCard({ booking, onViewDetails }: BookingCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-[#C62828] text-white";
      case "high":
        return "bg-[#FF6600] text-white";
      case "medium":
        return "bg-[#F57C00] text-white";
      case "low":
        return "bg-[#2E7D32] text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-[#2E7D32] text-white";
      case "rejected":
        return "bg-[#C62828] text-white";
      case "reviewing":
        return "bg-[#F57C00] text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      case "reviewing":
        return <Eye className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">{booking.agencyName}</h3>
            <Badge className={cn("text-xs px-2 py-0", getStatusColor(booking.status))}>
              <span className="flex items-center gap-1">
                {getStatusIcon(booking.status)}
                {booking.status}
              </span>
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(booking.timestamp)}
            </span>
            <span>ID: {booking.id}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div
            className={cn(
              "text-lg font-mono font-bold px-2.5 py-1 rounded",
              getRiskColor(booking.riskLevel)
            )}
          >
            {booking.riskScore}
          </div>
          <span className="text-xs text-gray-500 mt-1">Risk Score</span>
        </div>
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded">
        <div>
          <div className="text-xs text-gray-500">Amount</div>
          <div className="font-semibold">{formatCurrency(booking.amount)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Destination</div>
          <div className="font-semibold text-sm">{booking.destination}</div>
        </div>
      </div>

      {/* Risk Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Risk Level</span>
          <span className="text-xs font-medium capitalize">{booking.riskLevel}</span>
        </div>
        <Progress
          value={booking.riskScore}
          className={cn(
            "h-2",
            booking.riskScore >= 80
              ? "[&>div]:bg-[#C62828]"
              : booking.riskScore >= 60
              ? "[&>div]:bg-[#FF6600]"
              : booking.riskScore >= 40
              ? "[&>div]:bg-[#F57C00]"
              : "[&>div]:bg-[#2E7D32]"
          )}
        />
      </div>

      {/* Agent Consensus Preview */}
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-600">
          {booking.agentAssessments.length} agents analyzed
        </span>
        <div className="flex gap-1 ml-auto">
          {booking.agentAssessments.slice(0, 4).map((agent, idx) => (
            <div
              key={agent.agentId}
              className={cn(
                "w-2 h-2 rounded-full",
                agent.riskScore >= 80
                  ? "bg-[#C62828]"
                  : agent.riskScore >= 60
                  ? "bg-[#FF6600]"
                  : agent.riskScore >= 40
                  ? "bg-[#F57C00]"
                  : "bg-[#2E7D32]"
              )}
              title={`${agent.agentName}: ${agent.riskScore}%`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onViewDetails(booking.id)}
        >
          View Details
        </Button>
        {booking.status === "reviewing" && (
          <>
            <Button
              size="sm"
              className="bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="bg-[#C62828] hover:bg-[#C62828]/90"
            >
              Reject
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
