import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Network,
  TrendingUp,
  Users,
  AlertCircle,
  Settings,
  GraduationCap,
  Activity,
  Brain,
} from "lucide-react";
import { cn } from "./ui/utils";
import { Badge } from "./ui/badge";

interface SidebarProps {
  reviewQueueCount?: number;
  activeAlertsCount?: number;
}

export function Sidebar({ reviewQueueCount = 0, activeAlertsCount = 0 }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", badge: null, group: "main" },
    { to: "/network", icon: Network, label: "Network Graph", badge: null, group: "main" },
    { to: "/trust-evolution", icon: TrendingUp, label: "Trust Evolution", badge: null, group: "main" },
    { to: "/credit-simulator", icon: Users, label: "Credit & Exit Risk", badge: null, group: "main" },
    {
      to: "/learning-loop",
      icon: GraduationCap,
      label: "Learning Loop",
      badge: reviewQueueCount > 0 ? reviewQueueCount : null,
      group: "main",
    },
    {
      to: "/alerts",
      icon: AlertCircle,
      label: "Alerts & Actions",
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
      group: "main",
    },
    // ── NEW PAGES ──────────────────────────────────────────────
    { to: "/velocity-cliff", icon: Activity, label: "Velocity Cliff", badge: null, group: "advanced" },
    { to: "/behavioral-entropy", icon: Brain, label: "Behavioral Entropy", badge: null, group: "advanced" },
  ];

  const mainItems = navItems.filter((n) => n.group === "main");
  const advancedItems = navItems.filter((n) => n.group === "advanced");

  const renderItem = (item: (typeof navItems)[0]) => {
    const isActive = location.pathname === item.to;
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors",
          isActive ? "bg-[#003366] text-white" : "text-gray-700 hover:bg-gray-100"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
        {item.badge !== null && (
          <Badge
            variant={isActive ? "secondary" : "default"}
            className={cn(
              "h-5 min-w-5 flex items-center justify-center px-1.5",
              isActive ? "bg-white/20 text-white" : "bg-[#C62828] text-white"
            )}
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-60 border-r bg-white h-[calc(100vh-5rem)] sticky top-20 flex flex-col">
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainItems.map(renderItem)}

        {/* Advanced section */}
        <div className="pt-3">
          <div className="px-3 pb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Advanced Signals</span>
          </div>
          {advancedItems.map(renderItem)}
        </div>
      </nav>

      <div className="p-4 border-t">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
