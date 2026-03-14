import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Biohazard, Activity, ArrowRight, Lock } from "lucide-react";
import { mockContagionData } from "../data/mockData";
import { Button } from "./ui/button";

export function ChargebackContagionGraph() {
  const [quarantined, setQuarantined] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);

  const CENTER = { x: 380, y: 300 };
  const RADIUS_1 = 140;
  const RADIUS_2 = 280;

  // Calculate positions
  const groundZero = { ...mockContagionData.groundZero, x: CENTER.x, y: CENTER.y, hop: 0 };
  
  const hop1Nodes = mockContagionData.hop1.map((node, i) => {
    const angle = (i / mockContagionData.hop1.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...node,
      x: CENTER.x + Math.cos(angle) * RADIUS_1,
      y: CENTER.y + Math.sin(angle) * RADIUS_1,
      hop: 1,
    };
  });

  const hop2Nodes = mockContagionData.hop2.map((node, i) => {
    const angle = (i / mockContagionData.hop2.length) * Math.PI * 2 - Math.PI / 2 + 0.5;
    return {
      ...node,
      x: CENTER.x + Math.cos(angle) * RADIUS_2,
      y: CENTER.y + Math.sin(angle) * RADIUS_2,
      hop: 2,
    };
  });

  const allNodes = [groundZero, ...hop1Nodes, ...hop2Nodes];
  const allLinks = [...hop1Nodes, ...hop2Nodes].map(node => ({
    source: allNodes.find(n => n.id === node.source)!,
    target: node
  }));

  const totalExposureAtRisk = allNodes.reduce((acc, node) => acc + node.exposure, 0);

  return (
    <div className="flex gap-5">
      {/* LEFT: The Animated Graph */}
      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 relative overflow-hidden h-[600px]">
        {/* Background Grid & Rings */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C62828" stopOpacity={quarantined ? "0" : "0.15"} />
              <stop offset="100%" stopColor="#C62828" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Contagion Radius Rings */}
          <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS_1} fill="none" stroke="rgba(255,100,100,0.1)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS_2} fill="none" stroke="rgba(255,100,100,0.05)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx={CENTER.x} cy={CENTER.y} r={RADIUS_2 + 50} fill="url(#glow)" />

          {/* Links / Edges */}
          {allLinks.map((link, i) => (
            <g key={`link-${i}`}>
              <line 
                x1={link.source.x} y1={link.source.y} 
                x2={link.target.x} y2={link.target.y} 
                stroke={quarantined ? "#374151" : "rgba(220, 38, 38, 0.4)"} 
                strokeWidth={quarantined ? 2 : 3} 
              />
              {/* Animated Contagion Particles */}
              {!quarantined && (
                <circle r="4" fill="#EF4444">
                  <animateMotion dur={`${1.5 + (link.target.hop * 0.5)}s`} repeatCount="indefinite">
                    <mpath href={`#path-${i}`} />
                  </animateMotion>
                </circle>
              )}
              <path id={`path-${i}`} d={`M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`} fill="none" />
            </g>
          ))}

          {/* Nodes */}
          {allNodes.map((node) => {
            const isGroundZero = node.hop === 0;
            const nodeColor = quarantined ? "#4B5563" : isGroundZero ? "#DC2626" : node.hop === 1 ? "#EA580C" : "#D97706";
            const nodeRadius = isGroundZero ? 24 : node.hop === 1 ? 18 : 14;

            return (
              <g 
                key={node.id} 
                onMouseEnter={() => setHoveredNode(node)} 
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer transition-transform hover:scale-110"
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              >
                {/* Pulse effect for ground zero */}
                {isGroundZero && !quarantined && (
                  <motion.circle 
                    cx={node.x} cy={node.y} r={nodeRadius}
                    fill="none" stroke="#DC2626" strokeWidth="2"
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
                
                <circle cx={node.x} cy={node.y} r={nodeRadius} fill={nodeColor} stroke="#1F2937" strokeWidth="3" />
                
                {quarantined && (
                  <foreignObject x={node.x - 8} y={node.y - 8} width={16} height={16}>
                    <Lock className="w-4 h-4 text-gray-300" />
                  </foreignObject>
                )}
                
                {/* Label Background & Text */}
                <rect x={node.x - 45} y={node.y + nodeRadius + 5} width="90" height="20" rx="4" fill="rgba(17,24,39,0.8)" border="1px solid #374151" />
                <text x={node.x} y={node.y + nodeRadius + 18} fontSize="10" fill="#E5E7EB" textAnchor="middle" fontFamily="system-ui" fontWeight="500">
                  {node.name.length > 15 ? node.name.slice(0, 12) + "..." : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        <AnimatePresence>
          {hoveredNode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-lg text-white pointer-events-none z-10"
              style={{ left: hoveredNode.x + 30, top: hoveredNode.y - 40 }}
            >
              <div className="font-bold text-sm mb-1">{hoveredNode.name}</div>
              <div className="text-xs text-gray-300">Ring Distance: {hoveredNode.hop === 0 ? "Ground Zero" : `${hoveredNode.hop} Hop(s)`}</div>
              <div className="text-xs text-gray-300">Risk Score: <span className="text-red-400 font-bold">{hoveredNode.risk}%</span></div>
              <div className="text-xs text-gray-300 mt-1 pt-1 border-t border-white/10">Exposure: ₹{(hoveredNode.exposure / 100000).toFixed(1)}L</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT: Contagion Math & Action Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-[#003366] text-white p-5 rounded-xl shadow-md relative overflow-hidden">
          <Biohazard className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5" />
          <h3 className="font-bold mb-1">Contagion Propagation</h3>
          <p className="text-xs text-blue-200 mb-4">Chargeback risk spreading through network infrastructure.</p>
          
          <div className="bg-black/30 p-3 rounded-lg mb-4 font-mono text-xs border border-blue-500/30">
            <div className="text-blue-300 mb-1">Mathematical Propagation:</div>
            <div className="text-white">Risk<sub>j</sub> = Σ w<sub>ij</sub> · Risk<sub>i</sub></div>
            <div className="text-gray-400 mt-2 text-[10px] leading-tight">
              Calculates downstream vulnerability based on shared devices, IP proximity, and connection weight (w).
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs text-blue-200">Ground Zero Exposure</span>
              <span className="font-bold text-red-400">₹{(mockContagionData.groundZero.exposure / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs text-blue-200">1-Hop Contagion Risk</span>
              <span className="font-bold text-orange-400">₹{((totalExposureAtRisk - mockContagionData.groundZero.exposure) / 100000).toFixed(1)}L</span>
            </div>
          </div>
        </div>

        <div className="bg-white border p-5 rounded-xl shadow-sm flex-1 flex flex-col">
          <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-[#C62828]" /> System Action
          </h4>
          <p className="text-xs text-gray-600 mb-6">
            Left unchecked, chargeback contagion from {mockContagionData.groundZero.name} will trigger defaults in 1-hop agencies within 72 hours due to linked liquidity loops.
          </p>

          <div className="mt-auto">
            {quarantined ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
                <Shield className="w-6 h-6 text-[#2E7D32] mx-auto mb-2" />
                <div className="font-bold text-[#2E7D32] text-sm">Contagion Contained</div>
                <div className="text-xs text-green-700 mt-1">Prevented Systemic Loss: ₹{(totalExposureAtRisk / 100000).toFixed(1)}L</div>
              </motion.div>
            ) : (
              <Button 
                onClick={() => setQuarantined(true)}
                className="w-full bg-[#C62828] hover:bg-[#C62828]/90 text-white shadow-lg shadow-red-500/30 group"
              >
                <Biohazard className="w-4 h-4 mr-2 animate-pulse" />
                Freeze 2-Hop Radius
                <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}