// Fraud ring timeline data — each entry represents one week of activity.
// This drives the temporal edge animation scrubber.

export type TimelineWeek = {
  week: number;            // 1-based week index
  label: string;           // "Week 1", "Week 2", etc.
  date: string;            // display date
  newNodes: string[];      // node IDs that appear this week
  newEdges: Array<{ from: string; to: string; isFraud: boolean }>;
  event?: string;          // optional annotation
  totalExposure: number;   // cumulative ₹ exposure at this point
  riskLevel: "low" | "medium" | "high" | "critical";
};

export const FRAUD_TIMELINE: TimelineWeek[] = [
  {
    week: 1,
    label: "Week 1",
    date: "Nov 13, 2025",
    newNodes: ["AG-002", "AG-004", "DEV-234", "DEV-123"],
    newEdges: [
      { from: "AG-002", to: "DEV-234", isFraud: false },
      { from: "AG-004", to: "DEV-123", isFraud: false },
    ],
    event: "Legitimate agencies onboarded",
    totalExposure: 1870000,
    riskLevel: "low",
  },
  {
    week: 2,
    label: "Week 2",
    date: "Nov 20, 2025",
    newNodes: ["AG-003", "DEV-567", "IP-045"],
    newEdges: [
      { from: "AG-003", to: "DEV-567", isFraud: false },
      { from: "AG-003", to: "IP-045", isFraud: false },
    ],
    totalExposure: 3250000,
    riskLevel: "low",
  },
  {
    week: 3,
    label: "Week 3",
    date: "Nov 27, 2025",
    newNodes: ["AG-001", "DEV-789"],
    newEdges: [
      { from: "AG-001", to: "DEV-789", isFraud: false },
    ],
    event: "Wanderlust Travels registers — uses new device DEV-789",
    totalExposure: 5100000,
    riskLevel: "low",
  },
  {
    week: 4,
    label: "Week 4",
    date: "Dec 4, 2025",
    newNodes: ["AG-005"],
    newEdges: [
      { from: "AG-005", to: "DEV-789", isFraud: true },
    ],
    event: "⚠ QuickBook Express connects to same device as Wanderlust",
    totalExposure: 7800000,
    riskLevel: "medium",
  },
  {
    week: 5,
    label: "Week 5",
    date: "Dec 11, 2025",
    newNodes: ["IP-015"],
    newEdges: [
      { from: "AG-001", to: "IP-015", isFraud: true },
      { from: "AG-005", to: "IP-015", isFraud: true },
    ],
    event: "⚠ Shared IP detected — two agencies same network origin",
    totalExposure: 11400000,
    riskLevel: "high",
  },
  {
    week: 6,
    label: "Week 6",
    date: "Dec 18, 2025",
    newNodes: ["AG-006"],
    newEdges: [
      { from: "AG-006", to: "DEV-789", isFraud: true },
    ],
    event: "🚨 Third agency joins DEV-789 — fraud ring confirmed",
    totalExposure: 15600000,
    riskLevel: "critical",
  },
];

// All nodes needed for the full graph
export const ALL_TIMELINE_NODES = [
  { id: "AG-001", name: "Wanderlust Travels", trustLevel: 35, transactionVolume: 4500000, type: "agency" as const, connections: ["DEV-789", "IP-015"], isFraudulent: true },
  { id: "AG-002", name: "Global Ventures", trustLevel: 92, transactionVolume: 12500000, type: "agency" as const, connections: ["DEV-234"], isFraudulent: false },
  { id: "AG-003", name: "SkyHigh Agencies", trustLevel: 68, transactionVolume: 8900000, type: "agency" as const, connections: ["DEV-567", "IP-045"], isFraudulent: false },
  { id: "AG-004", name: "Paradise Tours", trustLevel: 95, transactionVolume: 6700000, type: "agency" as const, connections: ["DEV-123"], isFraudulent: false },
  { id: "AG-005", name: "QuickBook Express", trustLevel: 28, transactionVolume: 3200000, type: "agency" as const, connections: ["DEV-789", "IP-015"], isFraudulent: true },
  { id: "AG-006", name: "TravelSmart Co", trustLevel: 31, transactionVolume: 2800000, type: "agency" as const, connections: ["DEV-789"], isFraudulent: true },
  { id: "DEV-789", name: "Shared Device #789", trustLevel: 15, transactionVolume: 0, type: "device" as const, connections: ["AG-001", "AG-005", "AG-006"], isFraudulent: true },
  { id: "DEV-234", name: "Device #234", trustLevel: 95, transactionVolume: 0, type: "device" as const, connections: ["AG-002"], isFraudulent: false },
  { id: "DEV-567", name: "Device #567", trustLevel: 72, transactionVolume: 0, type: "device" as const, connections: ["AG-003"], isFraudulent: false },
  { id: "DEV-123", name: "Device #123", trustLevel: 96, transactionVolume: 0, type: "device" as const, connections: ["AG-004"], isFraudulent: false },
  { id: "IP-015", name: "IP 192.168.1.15", trustLevel: 20, transactionVolume: 0, type: "ip" as const, connections: ["AG-001", "AG-005"], isFraudulent: true },
  { id: "IP-045", name: "IP 172.16.0.45", trustLevel: 65, transactionVolume: 0, type: "ip" as const, connections: ["AG-003"], isFraudulent: false },
];
