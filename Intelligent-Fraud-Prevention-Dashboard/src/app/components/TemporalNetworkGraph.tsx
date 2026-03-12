import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play, Pause, SkipBack, SkipForward, AlertTriangle,
  Wifi, Globe, Building2, X, ChevronRight,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { FRAUD_TIMELINE, ALL_TIMELINE_NODES, type TimelineWeek } from "../data/fraudTimeline";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GraphNode {
  id: string;
  name: string;
  trustLevel: number;
  transactionVolume: number;
  type: "agency" | "device" | "ip";
  connections: string[];
  isFraudulent: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  appearedAt: number;   // week number when this node was revealed
  opacity: number;      // animated in
}

interface GraphEdge {
  from: string;
  to: string;
  isFraud: boolean;
  appearedAt: number;
  opacity: number;
}

// ── Visual config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  agency: { radius: 26, color: "#1E40AF", fraudColor: "#C62828" },
  device: { radius: 17, color: "#6D28D9", fraudColor: "#C62828" },
  ip:     { radius: 13, color: "#0F766E", fraudColor: "#C62828" },
};

const RISK_COLORS = {
  low:      "#2E7D32",
  medium:   "#F57C00",
  high:     "#FF6600",
  critical: "#C62828",
};

function lighten(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (n >> 16) + Math.round(255 * amt));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
            : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.75, y);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.75, y);
  ctx.closePath();
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TemporalNetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [currentWeek, setCurrentWeek] = useState(0);   // 0 = pre-start
  const [playing, setPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const pulseRef = useRef(0);
  const rafRef = useRef<number>(0);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Build visible state for given week ───────────────────────────────────────
  const buildState = useCallback((week: number) => {
    // Collect all node IDs and edges visible up to this week
    const visibleNodeIds = new Set<string>();
    const visibleEdges: Array<{ from: string; to: string; isFraud: boolean; week: number }> = [];

    FRAUD_TIMELINE.slice(0, week).forEach((wk) => {
      wk.newNodes.forEach((id) => visibleNodeIds.add(id));
      wk.newEdges.forEach((e) => visibleEdges.push({ ...e, week: wk.week }));
    });

    setGraphNodes((prev) => {
      // Preserve existing positions for already-placed nodes
      const posMap = new Map(prev.map((n) => [n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }]));
      const W = 760, H = 500;

      return ALL_TIMELINE_NODES
        .filter((n) => visibleNodeIds.has(n.id))
        .map((n, i, arr) => {
          const existing = posMap.get(n.id);
          if (existing) {
            return {
              ...n,
              x: existing.x, y: existing.y,
              vx: existing.vx, vy: existing.vy,
              appearedAt: FRAUD_TIMELINE.findIndex((wk) => wk.newNodes.includes(n.id)) + 1,
              opacity: 1,
            };
          }
          // New node — place on circle
          const angle = (i / arr.length) * 2 * Math.PI;
          const radius = n.type === "agency" ? 185 : n.type === "device" ? 95 : 125;
          return {
            ...n,
            x: W / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
            y: H / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
            vx: 0, vy: 0,
            appearedAt: FRAUD_TIMELINE.findIndex((wk) => wk.newNodes.includes(n.id)) + 1,
            opacity: 0,  // animate in
          };
        });
    });

    setEdges(
      visibleEdges.map((e) => ({
        from: e.from, to: e.to, isFraud: e.isFraud,
        appearedAt: e.week,
        opacity: 0,
      }))
    );
  }, []);

  // Initialise
  useEffect(() => { buildState(0); }, []);

  // Animate opacity in when week changes
  useEffect(() => {
    if (currentWeek === 0) return;
    // Fade in new nodes/edges
    setTimeout(() => {
      setGraphNodes((prev) => prev.map((n) => ({ ...n, opacity: 1 })));
      setEdges((prev) => prev.map((e) => ({ ...e, opacity: 1 })));
    }, 60);
  }, [currentWeek]);

  // ── Force simulation ─────────────────────────────────────────────────────────
  useEffect(() => {
    simRef.current = setInterval(() => {
      setGraphNodes((prev) => {
        if (prev.length === 0) return prev;
        const updated = prev.map((n) => ({ ...n }));
        for (let i = 0; i < updated.length; i++) {
          const node = updated[i];
          let fx = 0, fy = 0;
          for (let j = 0; j < updated.length; j++) {
            if (i === j) continue;
            const o = updated[j];
            const dx = node.x - o.x, dy = node.y - o.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            fx += (dx / dist) * (1100 / (dist * dist));
            fy += (dy / dist) * (1100 / (dist * dist));
          }
          node.connections.forEach((cid) => {
            const c = updated.find((n) => n.id === cid);
            if (c) {
              const dx = c.x - node.x, dy = c.y - node.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              fx += (dx / dist) * dist * 0.007;
              fy += (dy / dist) * dist * 0.007;
            }
          });
          fx += (380 - node.x) * 0.0015;
          fy += (250 - node.y) * 0.0015;
          node.vx = (node.vx + fx) * 0.82;
          node.vy = (node.vy + fy) * 0.82;
          node.x = Math.max(50, Math.min(710, node.x + node.vx));
          node.y = Math.max(50, Math.min(450, node.y + node.vy));
        }
        return updated;
      });
    }, 50);
    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, []);

  // ── Auto-play ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (playing) {
      playTimerRef.current = setInterval(() => {
        setCurrentWeek((prev) => {
          const next = prev + 1;
          buildState(next);
          if (next >= FRAUD_TIMELINE.length) {
            setPlaying(false);
            return FRAUD_TIMELINE.length;
          }
          return next;
        });
      }, 1800);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [playing, buildState]);

  // ── Canvas render ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      pulseRef.current += 0.055;
      ctx.clearRect(0, 0, 760, 500);

      // Subtle grid
      ctx.save();
      ctx.strokeStyle = "rgba(148,163,184,0.07)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 760; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 500); ctx.stroke(); }
      for (let y = 0; y < 500; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(760, y); ctx.stroke(); }
      ctx.restore();

      // Fraud ring halo
      const fraudDevices = graphNodes.filter((n) => n.isFraudulent && n.type === "device");
      fraudDevices.forEach((dev) => {
        const fraudAgencies = graphNodes.filter(
          (n) => n.isFraudulent && n.type === "agency" && n.connections.includes(dev.id)
        );
        if (fraudAgencies.length >= 2) {
          const maxDist = Math.max(...fraudAgencies.map((fa) =>
            Math.sqrt((fa.x - dev.x) ** 2 + (fa.y - dev.y) ** 2)
          ));
          ctx.beginPath();
          ctx.arc(dev.x, dev.y, maxDist + 22, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(198,40,40,${0.04 + Math.sin(pulseRef.current) * 0.02})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(198,40,40,${0.25 + Math.sin(pulseRef.current) * 0.12})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Edges
      edges.forEach((edge) => {
        const fromNode = graphNodes.find((n) => n.id === edge.from);
        const toNode = graphNodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) return;

        ctx.save();
        ctx.globalAlpha = edge.opacity * Math.min(fromNode.opacity, toNode.opacity);
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        if (edge.isFraud) {
          const grad = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
          grad.addColorStop(0, "rgba(198,40,40,0.3)");
          grad.addColorStop(0.5, "rgba(198,40,40,0.85)");
          grad.addColorStop(1, "rgba(198,40,40,0.3)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = "rgba(148,163,184,0.45)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // Nodes
      const sorted = [...graphNodes].sort((a, b) => +a.isFraudulent - +b.isFraudulent);
      sorted.forEach((node) => {
        if (node.opacity === 0) return;
        ctx.save();
        ctx.globalAlpha = node.opacity;

        const cfg = TYPE_CONFIG[node.type];
        const r = cfg.radius;
        const baseColor = node.isFraudulent ? cfg.fraudColor : cfg.color;
        const isSelected = selectedNode?.id === node.id;

        // Fraud pulse
        if (node.isFraudulent) {
          const glowR = r + 5 + Math.sin(pulseRef.current) * 4;
          ctx.save();
          ctx.shadowColor = "#C62828";
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(198,40,40,0.1)";
          ctx.fill();
          ctx.restore();
        }

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 7, 0, Math.PI * 2);
          ctx.strokeStyle = "#003366";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Trust arc
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 5, -Math.PI / 2, -Math.PI / 2 + (node.trustLevel / 100) * Math.PI * 2);
        ctx.strokeStyle = node.isFraudulent ? "#C62828aa"
          : node.trustLevel > 70 ? "#2E7D32" : node.trustLevel > 40 ? "#FF6600" : "#C62828";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.stroke();

        // Node shape
        if (node.type === "device") drawHexagon(ctx, node.x, node.y, r);
        else if (node.type === "ip") drawDiamond(ctx, node.x, node.y, r);
        else { ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2); }

        const grad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, r * 0.1, node.x, node.y, r);
        grad.addColorStop(0, lighten(baseColor, 0.3));
        grad.addColorStop(1, baseColor);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        const label = node.name.length > 15 ? node.name.slice(0, 13) + "…" : node.name;
        ctx.font = `${node.type === "agency" ? "600 10px" : "500 9px"} system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelY = node.y + r + 8;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(255,255,255,0.93)";
        ctx.beginPath();
        (ctx as any).roundRect?.(node.x - tw / 2 - 4, labelY - 1, tw + 8, 14, 3);
        ctx.fill();
        ctx.fillStyle = node.isFraudulent ? "#C62828" : "#1E293B";
        ctx.fillText(label, node.x, labelY);

        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [graphNodes, edges, selectedNode]);

  // ── Interaction ───────────────────────────────────────────────────────────────
  const getNodeAt = (x: number, y: number) =>
    graphNodes.find((n) => {
      const r = TYPE_CONFIG[n.type]?.radius ?? 20;
      return Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) <= r + 6;
    });

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = 760 / rect.width, sy = 500 / rect.height;
    const hit = getNodeAt((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    setSelectedNode(hit === selectedNode ? null : hit ?? null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = 760 / rect.width, sy = 500 / rect.height;
    const hit = getNodeAt((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
    canvasRef.current!.style.cursor = hit ? "pointer" : "default";
  };

  const goToWeek = (week: number) => {
    const clamped = Math.max(0, Math.min(FRAUD_TIMELINE.length, week));
    setCurrentWeek(clamped);
    buildState(clamped);
  };

  const activeWeekData: TimelineWeek | null =
    currentWeek > 0 ? FRAUD_TIMELINE[currentWeek - 1] : null;

  const riskColor = activeWeekData ? RISK_COLORS[activeWeekData.riskLevel] : "#94A3B8";

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[#003366]">Temporal Connection Replay</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Watch the fraud ring assemble over time · {FRAUD_TIMELINE.length} weeks of data
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentWeek > 0 && (
            <Badge
              className="text-xs px-2.5 py-1 border-0 font-semibold"
              style={{ background: riskColor + "20", color: riskColor }}
            >
              {activeWeekData?.riskLevel.toUpperCase()} RISK
            </Badge>
          )}
          {currentWeek === FRAUD_TIMELINE.length && (
            <Badge className="bg-red-100 text-[#C62828] border-0 text-xs font-bold animate-pulse">
              🚨 FRAUD RING DETECTED
            </Badge>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={760}
          height={500}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="w-full bg-gray-50"
          style={{ maxHeight: 380 }}
        />

        {/* Empty state */}
        {currentWeek === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#003366]/10 flex items-center justify-center mx-auto mb-3">
                <Play className="w-7 h-7 text-[#003366] ml-1" />
              </div>
              <p className="font-semibold text-[#003366] text-lg">Press Play to Replay</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Watch how the fraud ring assembled week by week over 6 weeks
              </p>
            </div>
          </div>
        )}

        {/* Node detail tooltip */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="absolute top-3 right-3 bg-white border rounded-xl shadow-lg p-3.5 w-52"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="p-1.5 rounded-lg text-white flex-shrink-0"
                    style={{
                      background: selectedNode.isFraudulent ? "#C62828"
                        : TYPE_CONFIG[selectedNode.type]?.color ?? "#003366",
                    }}
                  >
                    {selectedNode.type === "device" ? <Wifi className="w-3.5 h-3.5" />
                      : selectedNode.type === "ip" ? <Globe className="w-3.5 h-3.5" />
                      : <Building2 className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">{selectedNode.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{selectedNode.type}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)}>
                  <X className="w-3.5 h-3.5 text-gray-300 hover:text-gray-600" />
                </button>
              </div>
              {selectedNode.isFraudulent && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-100 rounded mb-2">
                  <AlertTriangle className="w-3 h-3 text-[#C62828]" />
                  <span className="text-xs text-[#C62828] font-semibold">Fraud Ring Member</span>
                </div>
              )}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Trust</span>
                  <span className="font-bold" style={{ color: selectedNode.trustLevel > 70 ? "#2E7D32" : selectedNode.trustLevel > 40 ? "#FF6600" : "#C62828" }}>
                    {selectedNode.trustLevel}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Appeared</span>
                  <span className="font-medium">Week {selectedNode.appearedAt}</span>
                </div>
                {selectedNode.transactionVolume > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Volume</span>
                    <span className="font-medium">₹{(selectedNode.transactionVolume / 100000).toFixed(1)}L</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event banner */}
      <AnimatePresence mode="wait">
        {activeWeekData?.event && (
          <motion.div
            key={currentWeek}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-5 py-2.5 border-t flex items-center gap-2"
            style={{ background: riskColor + "12", borderColor: riskColor + "33" }}
          >
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: riskColor }} />
            <span className="text-xs font-medium" style={{ color: riskColor }}>
              {activeWeekData.event}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline scrubber */}
      <div className="px-5 py-4 border-t bg-gray-50">
        {/* Week track */}
        <div className="flex gap-1.5 mb-4">
          {FRAUD_TIMELINE.map((wk, i) => {
            const weekNum = i + 1;
            const isActive = currentWeek >= weekNum;
            const isCurrent = currentWeek === weekNum;
            const color = RISK_COLORS[wk.riskLevel];
            return (
              <button
                key={wk.week}
                onClick={() => goToWeek(weekNum)}
                className="flex-1 relative group"
              >
                {/* Bar */}
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    background: isActive ? color : "#E2E8F0",
                    transform: isCurrent ? "scaleY(1.5)" : "scaleY(1)",
                    transformOrigin: "bottom",
                  }}
                />
                {/* Week label */}
                <div className="text-center mt-1.5">
                  <span className={`text-xs ${isCurrent ? "font-bold" : "font-normal"} ${isActive ? "" : "text-gray-400"}`}
                    style={{ color: isActive ? color : undefined }}>
                    {wk.label}
                  </span>
                  <div className="text-xs text-gray-400 leading-tight" style={{ fontSize: "9px" }}>{wk.date}</div>
                </div>
                {/* New node dots */}
                {wk.newNodes.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {wk.newNodes.slice(0, 4).map((nid) => {
                      const node = ALL_TIMELINE_NODES.find((n) => n.id === nid);
                      const dotColor = node?.isFraudulent ? "#C62828"
                        : node?.type === "device" ? "#6D28D9"
                        : node?.type === "ip" ? "#0F766E" : "#1E40AF";
                      return (
                        <div
                          key={nid}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: isActive ? dotColor : "#CBD5E1" }}
                        />
                      );
                    })}
                  </div>
                )}
                {/* Exposure */}
                <div className="text-center mt-0.5">
                  <span className="text-gray-400" style={{ fontSize: "9px" }}>
                    ₹{(wk.totalExposure / 100000).toFixed(0)}L
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => goToWeek(0)}
              disabled={currentWeek === 0}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              className="w-9 h-8 p-0 bg-[#003366] hover:bg-[#004080] text-white"
              onClick={() => {
                if (currentWeek >= FRAUD_TIMELINE.length) { goToWeek(0); setPlaying(true); }
                else setPlaying((p) => !p);
              }}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-8 h-8 p-0"
              onClick={() => goToWeek(FRAUD_TIMELINE.length)}
              disabled={currentWeek === FRAUD_TIMELINE.length}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1 text-xs text-gray-500">
            {currentWeek === 0
              ? "Press play or click a week to start"
              : currentWeek === FRAUD_TIMELINE.length
              ? "All 6 weeks replayed — fraud ring fully assembled"
              : `Week ${currentWeek} of ${FRAUD_TIMELINE.length} · ${graphNodes.length} entities · ${edges.length} connections`}
          </div>

          {/* Exposure meter */}
          {activeWeekData && (
            <div className="text-right">
              <div className="text-xs text-gray-400">Cumulative Exposure</div>
              <div className="text-sm font-black font-mono" style={{ color: riskColor }}>
                ₹{(activeWeekData.totalExposure / 100000).toFixed(1)}L
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
