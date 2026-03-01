import { Outlet } from "react-router";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { mockKPIs, mockAlerts } from "../data/mockData";
import { Toaster } from "../components/ui/sonner";

export function RootLayout() {
  const activeAlerts = mockAlerts.filter((a) => a.severity === "critical" || a.severity === "warning");
  const reviewQueueCount = 2; // From learning loop

  return (
    <div className="min-h-screen bg-gray-50">
      <Header kpis={mockKPIs} alertCount={activeAlerts.length} />
      <div className="flex">
        <Sidebar
          reviewQueueCount={reviewQueueCount}
          activeAlertsCount={activeAlerts.length}
        />
        <main className="flex-1 min-h-[calc(100vh-5rem)]">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
