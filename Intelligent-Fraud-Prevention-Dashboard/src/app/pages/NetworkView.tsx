import { useState } from "react";
import { TemporalNetworkGraph } from "../components/TemporalNetworkGraph";
import { RingEvidencePanel } from "../components/RingEvidencePanel";
import { NetworkGraph } from "../components/NetworkGraph";
import { ChargebackContagionGraph } from "../components/ChargebackContagionGraph"; // <--- NEW IMPORT
import { mockNetworkNodes } from "../data/mockData";
import { AlertTriangle, Users, Wifi, Clock, LayoutGrid, Biohazard } from "lucide-react"; // <--- ADDED Biohazard
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";

export function NetworkView() {
  const fraudulentNodes = mockNetworkNodes.filter((n) => n.isFraudulent);
  const agencies = mockNetworkNodes.filter((n) => n.type === "agency");
  const devices = mockNetworkNodes.filter((n) => n.type === "device");

  return (
    <div className="p-6 max-w-[1440px] mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#003366]">Network Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fraud ring detection, connection mapping, temporal replay & contagion
        </p>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Total Agencies
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4" /> Shared Devices
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Detected Rings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#C62828]">1</div>
            <p className="text-xs text-gray-500 mt-1">Active fraud pattern</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Biohazard className="w-4 h-4 text-[#FF6600]" /> Contagion Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#FF6600]">9 Agencies</div>
            <p className="text-xs text-gray-500 mt-1">Within 2 hops of default</p>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="temporal" className="space-y-5">
        <TabsList className="h-10">
          <TabsTrigger value="temporal" className="gap-2 text-sm">
            <Clock className="w-4 h-4" />
            Temporal Replay
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-2 text-sm">
            <LayoutGrid className="w-4 h-4" />
            Live Network
          </TabsTrigger>
          {/* ── NEW CONTAGION TAB ── */}
          <TabsTrigger value="contagion" className="gap-2 text-sm">
            <Biohazard className="w-4 h-4" />
            Contagion Propagation
            <Badge className="bg-[#C62828] text-white text-xs px-1.5 py-0 ml-1 border-0">CRITICAL</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── TEMPORAL TAB ── */}
        <TabsContent value="temporal">
          <div className="grid grid-cols-12 gap-5">
            {/* Temporal graph — left */}
            <div className="col-span-8">
              <TemporalNetworkGraph />
            </div>

            {/* Ring evidence panel — right */}
            <div className="col-span-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C62828]" />
                <span className="font-semibold text-sm text-[#003366]">Case File</span>
                <Badge className="bg-red-100 text-[#C62828] border-0 text-xs ml-auto">
                  RING-001
                </Badge>
              </div>
              <RingEvidencePanel />
            </div>
          </div>

          {/* How to read this */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <HowToCard
              step="1"
              color="#003366"
              title="Press Play"
              desc="Watch entities appear week by week as TBO's system ingests new data. Legitimate agencies appear first."
            />
            <HowToCard
              step="2"
              color="#FF6600"
              title="Spot the Convergence"
              desc="At Week 4, two agencies connect to the same device. By Week 5, a shared IP confirms coordination."
            />
            <HowToCard
              step="3"
              color="#C62828"
              title="Ring Confirmed"
              desc="Week 6: a third agency joins DEV-789. The pulsing red halo marks the fraud ring. Check the case file for evidence."
            />
          </div>
        </TabsContent>

        {/* ── LIVE NETWORK TAB ── */}
        <TabsContent value="live">
          <NetworkGraph nodes={mockNetworkNodes} />

          {/* Detected Fraud Rings */}
          <div className="mt-5 bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-4">Detected Fraud Rings</h2>
            <div className="p-4 border border-[#C62828] bg-red-50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#C62828]" />
                  <div>
                    <h3 className="font-semibold">Device DEV-789 Fraud Ring</h3>
                    <p className="text-xs text-gray-600 mt-1">3 connected agencies</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600">Prevented Loss</div>
                  <div className="font-bold text-[#2E7D32]">₹24.5L</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-600">Risk Level</div>
                  <div className="font-semibold text-[#C62828]">Critical</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Total Volume</div>
                  <div className="font-semibold">₹105L</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Agencies</div>
                  <div className="font-semibold">3</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Wanderlust Travels", "QuickBook Express", "TravelSmart Co"].map((a) => (
                  <span key={a} className="px-2 py-1 bg-white border border-[#C62828] rounded text-xs">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── NEW CONTAGION TAB ── */}
        <TabsContent value="contagion">
           <ChargebackContagionGraph />
        </TabsContent>

      </Tabs>
    </div>
  );
}

function HowToCard({ step, color, title, desc }: {
  step: string; color: string; title: string; desc: string;
}) {
  return (
    <div className="flex gap-3 p-3.5 bg-white border rounded-lg">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ background: color }}
      >
        {step}
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-800 mb-0.5">{title}</div>
        <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}