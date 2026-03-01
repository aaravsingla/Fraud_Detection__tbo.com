import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import { Dashboard } from "./pages/Dashboard";
import { NetworkView } from "./pages/NetworkView";
import { TrustEvolution } from "./pages/TrustEvolution";
import { CreditSimulator } from "./pages/CreditSimulator";
import { LearningLoop } from "./pages/LearningLoop";
import { AlertsView } from "./pages/AlertsView";
import { VelocityCliffPage } from "./pages/VelocityCliffPage";
import { BehavioralEntropyPage } from "./pages/BehavioralEntropyPage";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "network", Component: NetworkView },
      { path: "trust-evolution", Component: TrustEvolution },
      { path: "credit-simulator", Component: CreditSimulator },
      { path: "learning-loop", Component: LearningLoop },
      { path: "alerts", Component: AlertsView },
      // ── NEW ROUTES ─────────────────────────────────────────────
      { path: "velocity-cliff", Component: VelocityCliffPage },
      { path: "behavioral-entropy", Component: BehavioralEntropyPage },
      {
        path: "settings",
        element: (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-[#003366] mb-4">Settings</h1>
            <p className="text-gray-500">Settings panel coming soon...</p>
          </div>
        ),
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
