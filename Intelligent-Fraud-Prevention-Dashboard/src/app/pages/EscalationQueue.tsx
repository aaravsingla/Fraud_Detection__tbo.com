import { useState } from "react";
import {
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion } from "motion/react";
import { cn } from "../components/ui/utils";
import { mockEscalations } from "../data/mockData";
import { Escalation, EscalationStatus } from "../types";
import { useNavigate } from "react-router";

export function EscalationQueue() {
  const [escalations, setEscalations] = useState<Escalation[]>(mockEscalations);
  const [filter, setFilter] = useState<"all" | EscalationStatus>("all");
  const navigate = useNavigate();

  const filtered = escalations.filter((e) => {
    if (filter === "all") return true;
    return e.status === filter;
  });

  const counts = {
    all: escalations.length,
    pending: escalations.filter((e) => e.status === "pending").length,
    assigned: escalations.filter((e) => e.status === "assigned").length,
    resolved: escalations.filter((e) => e.status === "resolved").length,
  };

  const handleAssign = (id: string) => {
    setEscalations((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: "assigned" as const, assignedTo: "Current User" } : e
      )
    );
  };

  const handleResolve = (id: string) => {
    setEscalations((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, status: "resolved" as const, resolvedAt: new Date() }
          : e
      )
    );
  };

  const statusBadge = (status: EscalationStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "assigned":
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
            <UserCheck className="w-3 h-3 mr-1" />
            Assigned
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
    }
  };

  const reasonLabel = (reason: string) => {
    switch (reason) {
      case "agent_disagreement":
        return "Agent Disagreement";
      case "confidence_conflict":
        return "Confidence Conflict";
      case "manual":
        return "Manual Escalation";
      default:
        return reason;
    }
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#003366]">
          Escalation Queue
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review agent disagreements and escalated bookings requiring senior
          analyst approval.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{counts.assigned}</p>
          <p className="text-xs text-blue-600">Assigned</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{counts.resolved}</p>
          <p className="text-xs text-green-600">Resolved</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as typeof filter)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({counts.assigned})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Escalation List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No escalations in this category.
          </div>
        )}
        {filtered.map((esc, i) => (
          <motion.div
            key={esc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm">{esc.id}</span>
                    {statusBadge(esc.status)}
                    <Badge variant="secondary" className="text-[10px]">
                      {reasonLabel(esc.reason)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Booking <strong>{esc.bookingId}</strong> · Max spread{" "}
                    <strong className="text-red-600">Δ{esc.maxSpread} pts</strong>
                    {esc.assignedTo && (
                      <> · Assigned to <strong>{esc.assignedTo}</strong></>
                    )}
                  </p>

                  {/* Agent score pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {esc.agentScores.map((a) => (
                      <span
                        key={a.agentId}
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full font-mono",
                          a.score >= 80
                            ? "bg-red-100 text-red-700"
                            : a.score >= 60
                            ? "bg-orange-100 text-orange-700"
                            : a.score >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        )}
                      >
                        {a.agentName.split(" ")[0]}: {a.score}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {esc.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleAssign(esc.id)}
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                    Assign to Me
                  </Button>
                )}
                {(esc.status === "pending" || esc.status === "assigned") && (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleResolve(esc.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Resolve
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => navigate("/")}
                >
                  View Booking
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
