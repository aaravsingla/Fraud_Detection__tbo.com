import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, 
  RefreshCw, 
  CreditCard, 
  Wallet, 
  Clock, 
  ArrowRightLeft,
  ShieldAlert,
  Building2,
  Ban,
  CheckCircle,
  Smartphone,
  Eye,
  ShieldX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

// Mock data for the interactive queue
const INITIAL_CASES = [
  { id: "REF-001", agency: "Wanderlust Travels", card: "Chase Visa *4421", time: "12 mins", dest: "Wallet *4452", amount: "₹4.5L", status: "pending", risk: 94 },
  { id: "REF-002", agency: "QuickBook Express", card: "Amex Corp *9982", time: "18 mins", dest: "Wallet *4452", amount: "₹3.2L", status: "pending", risk: 88 },
  { id: "REF-003", agency: "TravelSmart Co", card: "Citi Master *1120", time: "09 mins", dest: "Wallet *4452", amount: "₹2.8L", status: "pending", risk: 91 },
  { id: "REF-004", agency: "Global Ventures", card: "Chase Visa *4421", time: "14 mins", dest: "Wallet *4452", amount: "₹1.5L", status: "pending", risk: 85 },
];

export default function RefundIntelligencePage() {
  const [cases, setCases] = useState(INITIAL_CASES);

  const handleAction = (id: string, action: string) => {
    setCases((prev) => 
      prev.map((c) => c.id === id ? { ...c, status: action } : c)
    );
  };

  const pendingCount = cases.filter(c => c.status === "pending").length;

  return (
    <div className="p-6 max-w-[1440px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#003366] flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-[#C62828]" /> 
            Refund Routing Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Detecting card-testing cashouts, booking-to-cancel anomalies, and unauthorized refund destinations.
          </p>
        </div>
        {pendingCount > 0 ? (
          <Badge className="bg-red-100 text-[#C62828] border-red-200 px-3 py-1 animate-pulse">
            <ShieldAlert className="w-4 h-4 mr-2" />
            {pendingCount} Critical Interventions Required
          </Badge>
        ) : (
          <Badge className="bg-green-100 text-[#2E7D32] border-green-200 px-3 py-1">
            <CheckCircle className="w-4 h-4 mr-2" />
            All Threats Contained
          </Badge>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard 
          title="Avg Time-to-Cancel" 
          value="14 mins" 
          sub="Highly suspicious (Market avg: 14 days)"
          icon={<Clock className="w-4 h-4 text-[#FF6600]" />}
          alert
        />
        <MetricCard 
          title="Routing Mismatch" 
          value="94%" 
          sub="Refunds sent to non-originating accounts"
          icon={<ArrowRightLeft className="w-4 h-4 text-[#C62828]" />}
          alert
        />
        <MetricCard 
          title="Canceled Volume" 
          value="₹12.0L" 
          sub="Currently active in escalation queue"
          icon={<Wallet className="w-4 h-4 text-gray-500" />}
        />
        <MetricCard 
          title="Card Testing Bins" 
          value="12 BINs" 
          sub="Predominantly US & UK issued cards"
          icon={<CreditCard className="w-4 h-4 text-gray-500" />}
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Animated Network Graph (Left) */}
        <Card className="h-full border-[#003366]/20 shadow-sm flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#C62828]" />
                Live Hub-and-Spoke Refund Network
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50">Auto-Updating</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative bg-slate-900 rounded-b-lg overflow-hidden min-h-[450px]">
            <LiveRefundNetwork cases={cases} />
          </CardContent>
        </Card>

        {/* Interactive Escalation Queue (Right) */}
        <Card className="h-full border-[#C62828]/20 shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="bg-red-50/50 border-b border-red-100 pb-3">
            <CardTitle className="text-base text-[#C62828] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> 
                Escalation Queue
              </span>
              <span className="text-xs font-normal text-gray-600">Pending Review</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto space-y-3 bg-gray-50/50">
            <AnimatePresence>
              {cases.map((c) => (
                <EscalationCard key={c.id} data={c} onAction={handleAction} />
              ))}
            </AnimatePresence>
            {pendingCount === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                className="h-full flex flex-col items-center justify-center text-gray-400 py-12"
              >
                <CheckCircle className="w-12 h-12 mb-3 text-green-500/50" />
                <p>Queue cleared. All actions taken.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Metric Card Component ───────────────────────────────────────────────────
function MetricCard({ title, value, sub, icon, alert }: any) {
  return (
    <Card className={alert ? "border-red-200 bg-red-50/30" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</div>
          <div className="p-1.5 bg-white rounded shadow-sm border">{icon}</div>
        </div>
        <div className={`text-2xl font-bold ${alert ? "text-[#C62828]" : "text-[#003366]"}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}

// ── Interactive Escalation Card ─────────────────────────────────────────────
function EscalationCard({ data, onAction }: { data: any, onAction: (id: string, action: string) => void }) {
  const isPending = data.status === "pending";

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border rounded-xl shadow-sm bg-white transition-all ${
        isPending ? "border-red-200" : "border-gray-200 opacity-70"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-[#003366]">{data.agency}</h4>
            <Badge className={isPending ? "bg-red-100 text-red-700 hover:bg-red-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
              Risk: {data.risk}%
            </Badge>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <CreditCard className="w-3 h-3"/> {data.card} 
            <span className="mx-1">•</span> 
            <Clock className="w-3 h-3"/> {data.time}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-[#C62828] text-lg">{data.amount}</div>
        </div>
      </div>

      <div className="bg-gray-50 p-2.5 rounded-lg border text-xs mb-4">
        <span className="font-semibold text-gray-700">Anomaly:</span> Original payment source does not match refund destination (<span className="font-mono text-[#C62828] font-bold">{data.dest}</span>). High probability of cash-out abuse.
      </div>

      {isPending ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onAction(data.id, "frozen")} className="flex-1 bg-[#C62828] hover:bg-red-800 text-white">
            <ShieldX className="w-4 h-4 mr-2" /> Freeze Limit
          </Button>
          <Button size="sm" onClick={() => onAction(data.id, "verified")} variant="outline" className="flex-1 border-[#FF6600] text-[#FF6600] hover:bg-orange-50">
            <Smartphone className="w-4 h-4 mr-2" /> Verify OTP
          </Button>
          <Button size="sm" onClick={() => onAction(data.id, "monitored")} variant="ghost" className="text-gray-500">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-lg text-sm font-medium justify-center border bg-gray-50">
          {data.status === "frozen" && <><ShieldX className="w-4 h-4 text-[#C62828]"/> <span className="text-[#C62828]">Credit Line Frozen</span></>}
          {data.status === "verified" && <><Smartphone className="w-4 h-4 text-[#FF6600]"/> <span className="text-[#FF6600]">Step-Up OTP Triggered</span></>}
          {data.status === "monitored" && <><Eye className="w-4 h-4 text-gray-500"/> <span className="text-gray-500">Added to Watchlist</span></>}
        </div>
      )}
    </motion.div>
  );
}

// ── Live Hub-and-Spoke Refund Network Graph ─────────────────────────────────
function LiveRefundNetwork({ cases }: { cases: any[] }) {
  const CENTER = { x: 300, y: 225 };
  const RADIUS = 150;
  
  // ADDED THIS CALCULATION HERE
  const pendingCount = cases.filter(c => c.status === "pending").length;

  // Generate nodes based on cases
  const nodes = cases.map((c, i) => {
    const angle = (i / cases.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...c,
      x: CENTER.x + Math.cos(angle) * RADIUS,
      y: CENTER.y + Math.sin(angle) * RADIUS,
    };
  });

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center">
      <svg width="100%" height="100%" viewBox="0 0 600 450" className="absolute">
        {/* Background Grid */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C62828" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C62828" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Central Fraudulent Wallet Glow */}
        <circle cx={CENTER.x} cy={CENTER.y} r={80} fill="url(#glow)" />
        <circle cx={CENTER.x} cy={CENTER.y} r={120} fill="none" stroke="rgba(220, 38, 38, 0.1)" strokeWidth="1" strokeDasharray="4 4">
          <animateTransform attributeName="transform" type="rotate" from="0 300 225" to="360 300 225" dur="20s" repeatCount="indefinite" />
        </circle>

        {/* Edges & Data Flow */}
        {nodes.map((node, i) => {
          const isPending = node.status === "pending";
          const isFrozen = node.status === "frozen";
          
          return (
            <g key={`edge-${i}`}>
              <line 
                x1={node.x} y1={node.y} 
                x2={CENTER.x} y2={CENTER.y} 
                stroke={isFrozen ? "rgba(107, 114, 128, 0.5)" : isPending ? "rgba(220, 38, 38, 0.5)" : "rgba(249, 115, 22, 0.5)"} 
                strokeWidth={isFrozen ? 2 : 3} 
                strokeDasharray={isFrozen ? "4 4" : "none"}
              />
              
              {/* Flowing money animation (only if pending) */}
              {isPending && (
                <circle r="4" fill="#EF4444" style={{ filter: "drop-shadow(0 0 4px #EF4444)" }}>
                  <animateMotion dur={`${1.5 + (i * 0.2)}s`} repeatCount="indefinite">
                    <mpath href={`#path-${i}`} />
                  </animateMotion>
                </circle>
              )}
              <path id={`path-${i}`} d={`M ${node.x} ${node.y} L ${CENTER.x} ${CENTER.y}`} fill="none" />
              
              {/* Blocked icon overlay on line if frozen */}
              {isFrozen && (
                <g transform={`translate(${(node.x + CENTER.x)/2 - 10}, ${(node.y + CENTER.y)/2 - 10})`}>
                  <circle cx="10" cy="10" r="10" fill="#1F2937" />
                  <path d="M5 10 A5 5 0 1 0 15 10 A5 5 0 1 0 5 10 M5 5 L15 15" stroke="#9CA3AF" strokeWidth="2" fill="none" />
                </g>
              )}
            </g>
          );
        })}

        {/* Agency Nodes */}
        {nodes.map((node, i) => {
          const isFrozen = node.status === "frozen";
          return (
            <g key={`node-${i}`} className="transition-transform hover:scale-110" style={{ transformOrigin: `${node.x}px ${node.y}px` }}>
              <circle cx={node.x} cy={node.y} r="20" fill={isFrozen ? "#374151" : "#1E40AF"} stroke="#1E293B" strokeWidth="3" />
              
              {/* Icon inside node */}
              <foreignObject x={node.x - 10} y={node.y - 10} width={20} height={20}>
                {isFrozen ? <Ban className="w-5 h-5 text-gray-400" /> : <Building2 className="w-5 h-5 text-blue-200" />}
              </foreignObject>

              {/* Node Label */}
              <rect x={node.x - 55} y={node.y + 26} width="110" height="22" rx="4" fill="rgba(15,23,42,0.9)" stroke="#334155" />
              <text x={node.x} y={node.y + 41} fontSize="11" fill="#E2E8F0" textAnchor="middle" fontFamily="system-ui" fontWeight="600">
                {node.agency.length > 15 ? node.agency.slice(0, 13) + "..." : node.agency}
              </text>
            </g>
          );
        })}

        {/* Central Wallet Node */}
        <g className="transition-transform hover:scale-110" style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
          {pendingCount > 0 && (
            <motion.circle 
              cx={CENTER.x} cy={CENTER.y} r="30"
              fill="none" stroke="#DC2626" strokeWidth="2"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          )}
          
          <circle cx={CENTER.x} cy={CENTER.y} r="32" fill="#7F1D1D" stroke="#EF4444" strokeWidth="3" />
          <foreignObject x={CENTER.x - 14} y={CENTER.y - 14} width={28} height={28}>
            <Wallet className="w-7 h-7 text-red-200" />
          </foreignObject>

          <rect x={CENTER.x - 50} y={CENTER.y + 40} width="100" height="24" rx="4" fill="#450a0a" stroke="#b91c1c" />
          <text x={CENTER.x} y={CENTER.y + 56} fontSize="12" fill="#fecaca" textAnchor="middle" fontFamily="system-ui" fontWeight="bold">
            Wallet *4452
          </text>
        </g>
      </svg>
    </div>
  );
}