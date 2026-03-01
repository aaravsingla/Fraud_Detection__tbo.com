import { NetworkGraph } from "../components/NetworkGraph";
import { mockNetworkNodes } from "../data/mockData";
import { AlertTriangle, Users, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function NetworkView() {
  const fraudulentNodes = mockNetworkNodes.filter((n) => n.isFraudulent);
  const agencies = mockNetworkNodes.filter((n) => n.type === "agency");
  const devices = mockNetworkNodes.filter((n) => n.type === "device");

  const fraudRings = [
    {
      name: "Device DEV-789 Fraud Ring",
      agencies: ["Wanderlust Travels", "QuickBook Express", "TravelSmart Co"],
      totalVolume: 10500000,
      riskLevel: "Critical",
      preventedLoss: 2450000,
    },
  ];

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#003366]">Network Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fraud ring detection and connection mapping
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Agencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencies.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {fraudulentNodes.filter((n) => n.type === "agency").length} flagged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Shared Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {fraudulentNodes.filter((n) => n.type === "device").length} suspicious
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Detected Rings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#C62828]">{fraudRings.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active fraud patterns</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Graph */}
      <div className="mb-6">
        <NetworkGraph nodes={mockNetworkNodes} />
      </div>

      {/* Detected Fraud Rings */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-4">Detected Fraud Rings</h2>
        <div className="space-y-3">
          {fraudRings.map((ring, index) => (
            <div
              key={index}
              className="p-4 border border-[#C62828] bg-red-50 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#C62828]" />
                  <div>
                    <h3 className="font-semibold">{ring.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {ring.agencies.length} connected agencies
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600">Prevented Loss</div>
                  <div className="font-bold text-[#2E7D32]">
                    ₹{(ring.preventedLoss / 100000).toFixed(1)}L
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-600">Risk Level</div>
                  <div className="font-semibold text-[#C62828]">{ring.riskLevel}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Total Volume</div>
                  <div className="font-semibold">
                    ₹{(ring.totalVolume / 100000).toFixed(1)}L
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Agencies</div>
                  <div className="font-semibold">{ring.agencies.length}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-2">Connected Agencies:</div>
                <div className="flex flex-wrap gap-2">
                  {ring.agencies.map((agency) => (
                    <span
                      key={agency}
                      className="px-2 py-1 bg-white border border-[#C62828] rounded text-xs"
                    >
                      {agency}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
