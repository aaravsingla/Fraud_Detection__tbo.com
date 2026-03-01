import { Search, Bell, ShieldCheck, AlertTriangle, ClipboardList, Target } from "lucide-react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { KPI } from "../types";
import { motion } from "motion/react";

interface HeaderProps {
  kpis: KPI[];
  alertCount: number;
}

export function Header({ kpis, alertCount }: HeaderProps) {
  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      "shield-check": <ShieldCheck className="w-4 h-4" />,
      "alert-triangle": <AlertTriangle className="w-4 h-4" />,
      "clipboard-list": <ClipboardList className="w-4 h-4" />,
      "target": <Target className="w-4 h-4" />
    };
    return icons[iconName] || null;
  };

  return (
    <header className="h-20 border-b bg-white px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Logo and Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#003366] rounded-lg flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-[#003366]">Fraud Prevention System</h1>
          <p className="text-xs text-gray-500">Real-Time Intelligence</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex items-center gap-6">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border"
          >
            <div className="text-gray-600">
              {getIcon(kpi.icon)}
            </div>
            <div>
              <div className="text-xs text-gray-500">{kpi.label}</div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{kpi.value}</span>
                {kpi.trend !== undefined && (
                  <span
                    className={`text-xs ${
                      kpi.trend > 0
                        ? "text-[#2E7D32]"
                        : kpi.trend < 0
                        ? "text-[#C62828]"
                        : "text-gray-400"
                    }`}
                  >
                    {kpi.trend > 0 ? "+" : ""}
                    {kpi.trend}%
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Alerts */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search bookings, agencies..."
            className="pl-10 w-64 h-9"
            aria-label="Search"
          />
        </div>
        <button
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={`Notifications - ${alertCount} unread`}
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {alertCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#C62828] text-white text-xs"
              variant="destructive"
            >
              {alertCount}
            </Badge>
          )}
        </button>
      </div>
    </header>
  );
}
