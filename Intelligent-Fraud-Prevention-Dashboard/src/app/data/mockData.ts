import { Booking, NetworkNode, TrustScoreDataPoint, Alert, KPI } from "../types";

// Mock bookings data demonstrating various scenarios
export const mockBookings: Booking[] = [
  {
    id: "BK-2026-001",
    agencyName: "Wanderlust Travels",
    amount: 450000,
    destination: "Dubai, UAE",
    timestamp: new Date("2026-02-06T14:23:00"),
    riskScore: 89,
    riskLevel: "high",
    status: "reviewing",
    deviceId: "DEV-789",
    ipAddress: "192.168.1.15",
    agentAssessments: [
      {
        agentId: "AG-FIN-01",
        agentName: "Financial Analyzer",
        agentType: "financial",
        riskScore: 92,
        confidence: 88,
        reasoning: "Amount 340% above historical average. Unusual spike in transaction size.",
        status: "complete",
        factors: ["Amount deviation", "Velocity change"]
      },
      {
        agentId: "AG-BEH-01",
        agentName: "Behavioral Monitor",
        agentType: "behavioral",
        riskScore: 78,
        confidence: 82,
        reasoning: "Booking time unusual (2 AM local time). Geographic pattern deviation.",
        status: "complete",
        factors: ["Time anomaly", "Location pattern"]
      },
      {
        agentId: "AG-NET-01",
        agentName: "Network Detector",
        agentType: "network",
        riskScore: 95,
        confidence: 91,
        reasoning: "Shared device detected with 3 flagged agencies. IP linked to fraud ring.",
        status: "complete",
        factors: ["Device sharing", "IP reputation"]
      },
      {
        agentId: "AG-BEN-01",
        agentName: "Benchmark Comparator",
        agentType: "benchmark",
        riskScore: 85,
        confidence: 79,
        reasoning: "Route pricing 45% above market benchmark. Destination risk elevated.",
        status: "complete",
        factors: ["Price deviation", "Destination risk"]
      }
    ],
    riskFactors: [
      {
        name: "Shared Device Detection",
        contribution: 35,
        value: "3 agencies",
        description: "Device used by multiple flagged agencies"
      },
      {
        name: "Transaction Size Anomaly",
        contribution: 28,
        value: "+340%",
        description: "Significantly above historical average"
      },
      {
        name: "IP Reputation",
        contribution: 20,
        value: "High Risk",
        description: "IP address linked to known fraud patterns"
      },
      {
        name: "Unusual Booking Time",
        contribution: 10,
        value: "2:00 AM",
        description: "Outside normal operating hours"
      },
      {
        name: "Price Benchmark Deviation",
        contribution: 7,
        value: "+45%",
        description: "Above market pricing standards"
      }
    ]
  },
  {
    id: "BK-2026-002",
    agencyName: "Global Ventures Ltd",
    amount: 125000,
    destination: "London, UK",
    timestamp: new Date("2026-02-06T14:18:00"),
    riskScore: 23,
    riskLevel: "low",
    status: "approved",
    deviceId: "DEV-234",
    ipAddress: "203.45.67.89",
    agentAssessments: [
      {
        agentId: "AG-FIN-01",
        agentName: "Financial Analyzer",
        agentType: "financial",
        riskScore: 18,
        confidence: 94,
        reasoning: "Amount within normal range. Payment history excellent.",
        status: "complete",
        factors: ["Normal transaction", "Good payment history"]
      },
      {
        agentId: "AG-BEH-01",
        agentName: "Behavioral Monitor",
        agentType: "behavioral",
        riskScore: 15,
        confidence: 92,
        reasoning: "Consistent with historical patterns. Normal operating hours.",
        status: "complete",
        factors: ["Pattern match", "Time appropriate"]
      },
      {
        agentId: "AG-NET-01",
        agentName: "Network Detector",
        agentType: "network",
        riskScore: 12,
        confidence: 96,
        reasoning: "Clean network profile. No suspicious connections detected.",
        status: "complete",
        factors: ["Clean network", "Trusted connections"]
      },
      {
        agentId: "AG-BEN-01",
        agentName: "Benchmark Comparator",
        agentType: "benchmark",
        riskScore: 20,
        confidence: 89,
        reasoning: "Route pricing within 5% of market benchmark.",
        status: "complete",
        factors: ["Market aligned", "Route verified"]
      }
    ],
    riskFactors: [
      {
        name: "Normal Transaction Pattern",
        contribution: -30,
        value: "Typical",
        description: "Consistent with historical behavior"
      },
      {
        name: "Trusted Network",
        contribution: -25,
        value: "Verified",
        description: "No suspicious network connections"
      },
      {
        name: "Payment History",
        contribution: -20,
        value: "Excellent",
        description: "100% on-time payment record"
      }
    ]
  },
  {
    id: "BK-2026-003",
    agencyName: "SkyHigh Agencies",
    amount: 520000,
    destination: "Singapore",
    timestamp: new Date("2026-02-06T14:15:00"),
    riskScore: 67,
    riskLevel: "medium",
    status: "pending",
    deviceId: "DEV-567",
    ipAddress: "172.16.0.45",
    agentAssessments: [
      {
        agentId: "AG-FIN-01",
        agentName: "Financial Analyzer",
        agentType: "financial",
        riskScore: 65,
        confidence: 76,
        reasoning: "High-value transaction but within credit limit. Recent increase in activity.",
        status: "complete",
        factors: ["High value", "Increased velocity"]
      },
      {
        agentId: "AG-BEH-01",
        agentName: "Behavioral Monitor",
        agentType: "behavioral",
        riskScore: 55,
        confidence: 81,
        reasoning: "New destination for agency. Booking pattern change detected.",
        status: "complete",
        factors: ["New route", "Pattern shift"]
      },
      {
        agentId: "AG-NET-01",
        agentName: "Network Detector",
        agentType: "network",
        riskScore: 45,
        confidence: 88,
        reasoning: "One minor connection to flagged entity. Under monitoring.",
        status: "complete",
        factors: ["Indirect connection", "Monitoring active"]
      },
      {
        agentId: "AG-BEN-01",
        agentName: "Benchmark Comparator",
        agentType: "benchmark",
        riskScore: 72,
        confidence: 73,
        reasoning: "Pricing 28% above typical for this route. Seasonal variation possible.",
        status: "complete",
        factors: ["Price variance", "Seasonal check"]
      }
    ],
    riskFactors: [
      {
        name: "New Destination",
        contribution: 25,
        value: "First time",
        description: "Agency has not booked this route before"
      },
      {
        name: "Price Elevation",
        contribution: 22,
        value: "+28%",
        description: "Above typical pricing for route"
      },
      {
        name: "Activity Increase",
        contribution: 20,
        value: "+45%",
        description: "Transaction frequency has increased"
      }
    ]
  },
  {
    id: "BK-2026-004",
    agencyName: "Paradise Tours",
    amount: 89000,
    destination: "Bangkok, Thailand",
    timestamp: new Date("2026-02-06T14:05:00"),
    riskScore: 15,
    riskLevel: "low",
    status: "approved",
    deviceId: "DEV-123",
    ipAddress: "198.51.100.42",
    agentAssessments: [
      {
        agentId: "AG-FIN-01",
        agentName: "Financial Analyzer",
        agentType: "financial",
        riskScore: 12,
        confidence: 97,
        reasoning: "Standard transaction. Excellent financial history.",
        status: "complete",
        factors: ["Standard size", "Good history"]
      },
      {
        agentId: "AG-BEH-01",
        agentName: "Behavioral Monitor",
        agentType: "behavioral",
        riskScore: 10,
        confidence: 95,
        reasoning: "Regular booking pattern. Frequent route.",
        status: "complete",
        factors: ["Regular pattern", "Frequent route"]
      },
      {
        agentId: "AG-NET-01",
        agentName: "Network Detector",
        agentType: "network",
        riskScore: 8,
        confidence: 98,
        reasoning: "Established network profile. Trusted connections only.",
        status: "complete",
        factors: ["Established profile", "Trusted network"]
      },
      {
        agentId: "AG-BEN-01",
        agentName: "Benchmark Comparator",
        agentType: "benchmark",
        riskScore: 14,
        confidence: 91,
        reasoning: "Price matches market benchmark exactly.",
        status: "complete",
        factors: ["Benchmark match", "Route standard"]
      }
    ],
    riskFactors: []
  }
];

// Network graph data
export const mockNetworkNodes: NetworkNode[] = [
  {
    id: "AG-001",
    name: "Wanderlust Travels",
    trustLevel: 35,
    transactionVolume: 4500000,
    type: "agency",
    connections: ["DEV-789", "IP-015"],
    isFraudulent: true
  },
  {
    id: "AG-002",
    name: "Global Ventures",
    trustLevel: 92,
    transactionVolume: 12500000,
    type: "agency",
    connections: ["DEV-234"],
    isFraudulent: false
  },
  {
    id: "AG-003",
    name: "SkyHigh Agencies",
    trustLevel: 68,
    transactionVolume: 8900000,
    type: "agency",
    connections: ["DEV-567", "IP-045"],
    isFraudulent: false
  },
  {
    id: "AG-004",
    name: "Paradise Tours",
    trustLevel: 95,
    transactionVolume: 6700000,
    type: "agency",
    connections: ["DEV-123"],
    isFraudulent: false
  },
  {
    id: "AG-005",
    name: "QuickBook Express",
    trustLevel: 28,
    transactionVolume: 3200000,
    type: "agency",
    connections: ["DEV-789", "IP-015"],
    isFraudulent: true
  },
  {
    id: "AG-006",
    name: "TravelSmart Co",
    trustLevel: 31,
    transactionVolume: 2800000,
    type: "agency",
    connections: ["DEV-789"],
    isFraudulent: true
  },
  {
    id: "DEV-789",
    name: "Shared Device #789",
    trustLevel: 15,
    transactionVolume: 0,
    type: "device",
    connections: ["AG-001", "AG-005", "AG-006"],
    isFraudulent: true
  },
  {
    id: "DEV-234",
    name: "Device #234",
    trustLevel: 95,
    transactionVolume: 0,
    type: "device",
    connections: ["AG-002"],
    isFraudulent: false
  },
  {
    id: "DEV-567",
    name: "Device #567",
    trustLevel: 72,
    transactionVolume: 0,
    type: "device",
    connections: ["AG-003"],
    isFraudulent: false
  },
  {
    id: "DEV-123",
    name: "Device #123",
    trustLevel: 96,
    transactionVolume: 0,
    type: "device",
    connections: ["AG-004"],
    isFraudulent: false
  },
  {
    id: "IP-015",
    name: "IP 192.168.1.15",
    trustLevel: 20,
    transactionVolume: 0,
    type: "ip",
    connections: ["AG-001", "AG-005"],
    isFraudulent: true
  },
  {
    id: "IP-045",
    name: "IP 172.16.0.45",
    trustLevel: 65,
    transactionVolume: 0,
    type: "ip",
    connections: ["AG-003"],
    isFraudulent: false
  }
];

// Trust score evolution data
export const mockTrustScoreData: TrustScoreDataPoint[] = [
  { date: new Date("2025-11-06"), score: 78 },
  { date: new Date("2025-11-13"), score: 80 },
  { date: new Date("2025-11-20"), score: 82 },
  { date: new Date("2025-11-27"), score: 79, event: "Large transaction" },
  { date: new Date("2025-12-04"), score: 75 },
  { date: new Date("2025-12-11"), score: 71, event: "Pattern anomaly detected" },
  { date: new Date("2025-12-18"), score: 68 },
  { date: new Date("2025-12-25"), score: 64 },
  { date: new Date("2026-01-01"), score: 58, event: "Shared device flagged" },
  { date: new Date("2026-01-08"), score: 52 },
  { date: new Date("2026-01-15"), score: 48 },
  { date: new Date("2026-01-22"), score: 43, event: "Network connection alert" },
  { date: new Date("2026-01-29"), score: 38 },
  { date: new Date("2026-02-05"), score: 35 }
];

// Alerts data
export const mockAlerts: Alert[] = [
  {
    id: "ALT-001",
    title: "Fraud Ring Detected",
    description: "3 agencies sharing device DEV-789 with suspicious patterns",
    severity: "critical",
    timestamp: new Date("2026-02-06T14:23:00"),
    relatedBookingId: "BK-2026-001",
    actionRequired: true
  },
  {
    id: "ALT-002",
    title: "Trust Score Declining",
    description: "Wanderlust Travels trust score dropped 43 points in 90 days",
    severity: "warning",
    timestamp: new Date("2026-02-06T14:20:00"),
    actionRequired: true
  },
  {
    id: "ALT-003",
    title: "High-Value Transaction",
    description: "SkyHigh Agencies booking exceeds ₹5L threshold",
    severity: "warning",
    timestamp: new Date("2026-02-06T14:15:00"),
    relatedBookingId: "BK-2026-003",
    actionRequired: false
  },
  {
    id: "ALT-004",
    title: "System Update Complete",
    description: "Behavioral model v2.3 deployed successfully",
    severity: "info",
    timestamp: new Date("2026-02-06T14:00:00"),
    actionRequired: false
  }
];

// Dashboard KPIs
export const mockKPIs: KPI[] = [
  {
    label: "Fraud Prevented",
    value: "₹24.5L",
    trend: 12,
    icon: "shield-check"
  },
  {
    label: "Active Alerts",
    value: 8,
    trend: -3,
    icon: "alert-triangle"
  },
  {
    label: "Review Queue",
    value: 3,
    trend: 0,
    icon: "clipboard-list"
  },
  {
    label: "Detection Rate",
    value: "94.2%",
    trend: 2.1,
    icon: "target"
  }
];
