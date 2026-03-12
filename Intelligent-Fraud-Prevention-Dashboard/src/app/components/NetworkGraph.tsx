import { useEffect, useRef, useState } from "react";
import { NetworkNode } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Wifi, Globe, Building2, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface NetworkGraphProps {
  nodes: NetworkNode[];
}

interface GraphNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ── Visual config by node type ───────────────────────────────────────────────
const TYPE_CONFIG = {
  agency: {
    radius: 28,
    color: "#1E40AF",        // blue
    fraudColor: "#C62828",
    labelOffset: 38,
    shape: "circle",
  },
  device: {
    radius: 18,
    color: "#6D28D9",        // purple
    fraudColor: "#C62828",
    labelOffset: 28,
    shape: "hexagon",
  },
  ip: {
    radius: 14,
    color: "#0F766E",        // teal
    fraudColor: "#C62828",
    labelOffset: 24,
    shape: "diamond",
  },
} as const;

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.75, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.75, y);
  ctx.closePath();
}

function drawNodeShape(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  isSelected: boolean,
  isHovered: boolean,
  pulse: number
) {
  const cfg = TYPE_CONFIG[node.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.agency;
  const r = cfg.radius;
  const baseColor = node.isFraudulent ? cfg.fraudColor : cfg.color;

  // Pulse glow for fraudulent nodes
  if (node.isFraudulent) {
    const glowRadius = r + 6 + Math.sin(pulse) * 4;
    ctx.save();
    ctx.shadowColor = "#C62828";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(198,40,40,0.12)";
    ctx.fill();
    ctx.restore();
  }

  // Selection/hover ring
  if (isSelected || isHovered) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 7, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? "#003366" : "#64748B";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Trust arc (background ring)
  if (!node.isFraudulent) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 4, -Math.PI / 2, -Math.PI / 2 + (node.trustLevel / 100) * Math.PI * 2);
    ctx.strokeStyle = cfg.color + "55";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Draw shape
  ctx.save();
  if (node.type === "device") {
    drawHexagon(ctx, node.x, node.y, r);
  } else if (node.type === "ip") {
    drawDiamond(ctx, node.x, node.y, r);
  } else {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
  }

  // Gradient fill
  const grad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, r * 0.1, node.x, node.y, r);
  grad.addColorStop(0, lighten(baseColor, 0.3));
  grad.addColorStop(1, baseColor);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Trust level indicator (small arc at bottom)
  if (!node.isFraudulent) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + 5, -Math.PI / 2, -Math.PI / 2 + (node.trustLevel / 100) * Math.PI * 2);
    ctx.strokeStyle = node.trustLevel > 70 ? "#2E7D32" : node.trustLevel > 40 ? "#FF6600" : "#C62828";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  // Label
  const label = truncateLabel(node.name, node.type);
  ctx.font = `${node.type === "agency" ? "600 11px" : "500 10px"} system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Label background
  const labelY = node.y + cfg.labelOffset;
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.roundRect(node.x - textWidth / 2 - 5, labelY - 2, textWidth + 10, 16, 3);
  ctx.fill();

  ctx.fillStyle = node.isFraudulent ? "#C62828" : "#1E293B";
  ctx.fillText(label, node.x, labelY);

  // Trust badge for agencies
  if (node.type === "agency") {
    ctx.font = "bold 9px system-ui";
    ctx.textBaseline = "middle";
    const badge = `${node.trustLevel}`;
    const bw = ctx.measureText(badge).width + 10;
    const bx = node.x + r - 4;
    const by = node.y - r + 4;
    ctx.fillStyle = node.isFraudulent ? "#C62828" : (node.trustLevel > 70 ? "#2E7D32" : node.trustLevel > 40 ? "#FF6600" : "#C62828");
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - 7, bw, 14, 7);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(badge, bx, by);
  }
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  from: GraphNode,
  to: GraphNode,
  isFraudRing: boolean
) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);

  if (isFraudRing) {
    ctx.strokeStyle = "rgba(198,40,40,0.6)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    // Add arrow-like gradient
    const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    grad.addColorStop(0, "rgba(198,40,40,0.3)");
    grad.addColorStop(0.5, "rgba(198,40,40,0.8)");
    grad.addColorStop(1, "rgba(198,40,40,0.3)");
    ctx.strokeStyle = grad;
  } else {
    ctx.strokeStyle = "rgba(148,163,184,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function truncateLabel(name: string, type: string): string {
  if (type === "agency") return name.length > 16 ? name.slice(0, 14) + "…" : name;
  if (type === "device") return name.replace("Shared Device #", "DEV-").replace("Device #", "DEV-");
  if (type === "ip") return name.replace("IP ", "");
  return name;
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

export function NetworkGraph({ nodes }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const pulseRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Fraud ring detection: nodes connected to fraudulent nodes
  const fraudRingIds = new Set<string>();
  nodes.forEach((n) => {
    if (n.isFraudulent) {
      fraudRingIds.add(n.id);
      n.connections.forEach((c) => fraudRingIds.add(c));
    }
  });

  // Initialize positions
  useEffect(() => {
    const W = 760, H = 540;
    const initialized = nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = node.type === "agency" ? 190 : node.type === "device" ? 100 : 130;
      return {
        ...node,
        x: W / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: H / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });
    setGraphNodes(initialized);
  }, [nodes]);

  // Force simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setGraphNodes((prev) => {
        const updated = prev.map((n) => ({ ...n }));
        for (let i = 0; i < updated.length; i++) {
          const node = updated[i];
          let fx = 0, fy = 0;
          for (let j = 0; j < updated.length; j++) {
            if (i === j) continue;
            const o = updated[j];
            const dx = node.x - o.x, dy = node.y - o.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const repulse = 1200 / (dist * dist);
            fx += (dx / dist) * repulse;
            fy += (dy / dist) * repulse;
          }
          node.connections.forEach((cid) => {
            const connected = updated.find((n) => n.id === cid);
            if (connected) {
              const dx = connected.x - node.x, dy = connected.y - node.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              fx += (dx / dist) * dist * 0.008;
              fy += (dy / dist) * dist * 0.008;
            }
          });
          fx += (380 - node.x) * 0.0015;
          fy += (270 - node.y) * 0.0015;
          node.vx = (node.vx + fx) * 0.82;
          node.vy = (node.vy + fy) * 0.82;
          node.x = Math.max(55, Math.min(705, node.x + node.vx));
          node.y = Math.max(55, Math.min(485, node.y + node.vy));
        }
        return updated;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Render loop with pulse animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      pulseRef.current += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.save();
      ctx.strokeStyle = "rgba(148,163,184,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 760; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 540); ctx.stroke();
      }
      for (let y = 0; y < 540; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(760, y); ctx.stroke();
      }
      ctx.restore();

      // Fraud ring highlight area
      const fraudAgencies = graphNodes.filter((n) => n.isFraudulent && n.type === "agency");
      if (fraudAgencies.length > 0) {
        const sharedDevice = graphNodes.find((n) => n.isFraudulent && n.type === "device");
        if (sharedDevice) {
          fraudAgencies.forEach((fa) => {
            const dist = Math.sqrt((fa.x - sharedDevice.x) ** 2 + (fa.y - sharedDevice.y) ** 2);
            ctx.beginPath();
            ctx.arc(sharedDevice.x, sharedDevice.y, dist + 18, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(198,40,40,${0.03 + Math.sin(pulseRef.current) * 0.015})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(198,40,40,${0.2 + Math.sin(pulseRef.current) * 0.1})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        }
      }

      // Edges
      graphNodes.forEach((node) => {
        node.connections.forEach((cid) => {
          const connected = graphNodes.find((n) => n.id === cid);
          if (connected && node.id < cid) {
            const isFraudRing = node.isFraudulent && connected.isFraudulent;
            drawEdge(ctx, node, connected, isFraudRing);
          }
        });
      });

      // Nodes (non-fraud first, fraud on top)
      const sorted = [...graphNodes].sort((a, b) => (a.isFraudulent ? 1 : -1) - (b.isFraudulent ? 1 : -1));
      sorted.forEach((node) => {
        drawNodeShape(
          ctx,
          node,
          selectedNode?.id === node.id,
          hoveredNode?.id === node.id,
          pulseRef.current
        );
      });

      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [graphNodes, selectedNode, hoveredNode]);

  const getNodeAt = (x: number, y: number) =>
    graphNodes.find((node) => {
      const r = TYPE_CONFIG[node.type as keyof typeof TYPE_CONFIG]?.radius ?? 20;
      return Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2) <= r + 6;
    });

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = 760 / rect.width;
    const scaleY = 540 / rect.height;
    const clicked = getNodeAt((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    setSelectedNode(clicked === selectedNode ? null : clicked ?? null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = 760 / rect.width;
    const scaleY = 540 / rect.height;
    const hovered = getNodeAt((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    setHoveredNode(hovered ?? null);
    canvasRef.current!.style.cursor = hovered ? "pointer" : "default";
  };

  const getNodeIcon = (type: string) => {
    if (type === "device") return <Wifi className="w-4 h-4" />;
    if (type === "ip") return <Globe className="w-4 h-4" />;
    return <Building2 className="w-4 h-4" />;
  };

  const fraudRingCount = graphNodes.filter((n) => n.isFraudulent).length;
  const connectedFraudCount = [...fraudRingIds].length - fraudRingCount;

  return (
    <div className="bg-white border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Connection Network Graph</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Fraud ring detection · {nodes.length} entities · {fraudRingCount} flagged
          </p>
        </div>

        {/* Fraud ring alert banner */}
        {fraudRingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-[#C62828]" />
            <span className="text-xs font-semibold text-[#C62828]">
              {fraudRingCount} fraudulent · {connectedFraudCount} connected
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {/* Canvas */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            width={760}
            height={540}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            className="w-full rounded-lg bg-gray-50 border"
            style={{ maxHeight: 420 }}
          />

          {/* Node detail panel */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, x: 16, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16, scale: 0.96 }}
                className="absolute top-3 right-3 bg-white border rounded-xl shadow-lg p-4 w-60"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1.5 rounded-lg text-white"
                      style={{
                        background: selectedNode.isFraudulent
                          ? "#C62828"
                          : TYPE_CONFIG[selectedNode.type as keyof typeof TYPE_CONFIG]?.color ?? "#003366",
                      }}
                    >
                      {getNodeIcon(selectedNode.type)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm leading-tight">{selectedNode.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{selectedNode.type}</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-gray-300 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedNode.isFraudulent && (
                  <div className="mb-3 flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C62828]" />
                    <span className="text-xs font-semibold text-[#C62828]">Fraud Ring Member</span>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trust Score</span>
                    <span
                      className="font-bold"
                      style={{
                        color:
                          selectedNode.trustLevel > 70 ? "#2E7D32"
                          : selectedNode.trustLevel > 40 ? "#FF6600"
                          : "#C62828",
                      }}
                    >
                      {selectedNode.trustLevel}%
                    </span>
                  </div>
                  {selectedNode.transactionVolume > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tx Volume</span>
                      <span className="font-semibold">
                        ₹{(selectedNode.transactionVolume / 100000).toFixed(1)}L
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Connections</span>
                    <span className="font-semibold">{selectedNode.connections.length}</span>
                  </div>

                  {selectedNode.connections.length > 0 && (
                    <div className="pt-1 border-t">
                      <div className="text-gray-400 mb-1.5">Connected to:</div>
                      <div className="space-y-1">
                        {selectedNode.connections.slice(0, 5).map((cid) => {
                          const conn = graphNodes.find((n) => n.id === cid);
                          return conn ? (
                            <div
                              key={cid}
                              className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded"
                            >
                              <span className="truncate max-w-[130px]">{conn.name}</span>
                              {conn.isFraudulent && (
                                <AlertTriangle className="w-3 h-3 text-[#C62828] flex-shrink-0" />
                              )}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend sidebar */}
        <div className="w-40 flex-shrink-0 space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Node Types</div>
            <div className="space-y-2">
              <LegendItem color="#1E40AF" shape="circle" label="Agency" />
              <LegendItem color="#6D28D9" shape="hexagon" label="Device" />
              <LegendItem color="#0F766E" shape="diamond" label="IP Address" />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</div>
            <div className="space-y-2">
              <LegendItem color="#2E7D32" shape="circle" label="Trusted" />
              <LegendItem color="#FF6600" shape="circle" label="Medium Risk" />
              <LegendItem color="#C62828" shape="circle" label="Fraud Flagged" glow />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Connections</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 border-t-2 border-[#C62828]" />
                <span className="text-xs text-gray-600">Fraud link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 border-t border-dashed border-gray-400" />
                <span className="text-xs text-gray-600">Normal link</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Trust Arc</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-[#2E7D32]" />
                <span className="text-xs text-gray-600">&gt; 70%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-[#FF6600]" />
                <span className="text-xs text-gray-600">40–70%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-[#C62828]" />
                <span className="text-xs text-gray-600">&lt; 40%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t text-xs text-gray-400 leading-relaxed">
            Click any node for details. Dashed ring = selection.
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  shape,
  label,
  glow,
}: {
  color: string;
  shape: "circle" | "hexagon" | "diamond";
  label: string;
  glow?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
        {shape === "circle" && (
          <div
            className="w-4 h-4 rounded-full"
            style={{
              background: color,
              boxShadow: glow ? `0 0 8px ${color}88` : undefined,
            }}
          />
        )}
        {shape === "hexagon" && (
          <svg width="18" height="18" viewBox="0 0 18 18">
            <polygon
              points="9,1 16,5 16,13 9,17 2,13 2,5"
              fill={color}
            />
          </svg>
        )}
        {shape === "diamond" && (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <polygon points="8,1 14,8 8,15 2,8" fill={color} />
          </svg>
        )}
      </div>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}
