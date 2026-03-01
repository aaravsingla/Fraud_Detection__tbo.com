import { useState } from "react";
import { mockAlerts } from "../data/mockData";
import { AlertCircle, CheckCircle, Info, Clock, ExternalLink } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion } from "motion/react";
import { Alert } from "../types";

export function AlertsView() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    return alert.severity === filter;
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-[#C62828]" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-[#FF6600]" />;
      case "info":
        return <Info className="w-5 h-5 text-[#003366]" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-[#C62828] bg-red-50";
      case "warning":
        return "border-l-[#FF6600] bg-orange-50";
      case "info":
        return "border-l-[#003366] bg-blue-50";
      default:
        return "border-l-gray-400 bg-gray-50";
    }
  };

  const handleDismiss = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const severityCounts = {
    all: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning: alerts.filter((a) => a.severity === "warning").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#003366]">Alerts & Actions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time alerts with immediate response actions
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-sm text-gray-600">Total Alerts</span>
          </div>
          <div className="text-3xl font-bold">{severityCounts.all}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#C62828] rounded-full" />
            <span className="text-sm text-gray-600">Critical</span>
          </div>
          <div className="text-3xl font-bold text-[#C62828]">{severityCounts.critical}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#FF6600] rounded-full" />
            <span className="text-sm text-gray-600">Warning</span>
          </div>
          <div className="text-3xl font-bold text-[#FF6600]">{severityCounts.warning}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#003366] rounded-full" />
            <span className="text-sm text-gray-600">Info</span>
          </div>
          <div className="text-3xl font-bold text-[#003366]">{severityCounts.info}</div>
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">
              {severityCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="critical">
            Critical
            <Badge variant="secondary" className="ml-2">
              {severityCounts.critical}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="warning">
            Warning
            <Badge variant="secondary" className="ml-2">
              {severityCounts.warning}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="info">
            Info
            <Badge variant="secondary" className="ml-2">
              {severityCounts.info}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-gray-50 border border-dashed rounded-lg p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-[#2E7D32] mb-3" />
            <p className="font-medium">No alerts in this category</p>
            <p className="text-xs text-gray-500 mt-1">All systems operating normally</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white border-l-4 rounded-lg p-4 shadow-sm ${getSeverityColor(
                alert.severity
              )}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getSeverityIcon(alert.severity)}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{alert.title}</h3>
                        <Badge
                          variant={alert.actionRequired ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {alert.actionRequired ? "Action Required" : "Informational"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp.toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    {alert.relatedBookingId && (
                      <div className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Booking: {alert.relatedBookingId}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {alert.actionRequired && (
                      <>
                        <Button size="sm" variant="outline">
                          Investigate
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#C62828] hover:bg-[#C62828]/90"
                          variant="destructive"
                        >
                          Take Action
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
